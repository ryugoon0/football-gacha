-- 주간 리그 정산을 실제 카드·전술 엔진으로 — 1단계 (docs/WEEKLY_LIVE_MATCH_DESIGN.md).
--
-- 확정된 결정: 최소 한쪽이 실유저인 fixture는 lib/matchEngine.ts(양방향
-- opponentSquad 확장)로 판정한다. 양쪽 다 AI인 fixture는 지금까지처럼 포아송
-- 정산(settle_due_weekly_fixtures)을 유지해 서버 비용을 억제한다. 개막 배치
-- 리그에도 지금 바로 적용한다 — 이 마이그레이션 이후 정산되는 pending
-- fixture부터 갈린다.
--
-- 엔진은 SQL로 돌릴 수 없으므로 실유저 fixture의 실제 판정은 Edge Function
-- weekly-fixture-live가 한다. 아무도 안 보는 경기도 반드시 끝나야 하므로
-- 대안 B(트래픽 캐치업 + 안전망): 5분 cron이 "시각이 지났는데 아직 pending인
-- 실유저 fixture"를 weekly_fixture_stale_queue에 적어 두고, 다음에 누군가
-- weekly-fixture-live를 부를 때 그 큐를 함께 비운다. pg_net·서비스 키를
-- DB에 두지 않는다.
--
-- 이 단계는 개입 없는 한 번짜리 판정(킥오프→종료)이다. 라이브 명령(전술·
-- 교체·작전카드)과 부분 진행·동시성은 다음 단계다.

-- ---------------------------------------------------------------------------
-- 1. weekly_fixtures — 어떤 엔진이 판정했는지 남긴다
-- ---------------------------------------------------------------------------
alter table public.weekly_fixtures
  add column if not exists settlement_engine text
    check (settlement_engine in ('poisson', 'match'));
alter table public.weekly_fixtures
  add column if not exists engine_version text;

-- ---------------------------------------------------------------------------
-- 2. 안전망 큐
-- ---------------------------------------------------------------------------
create table if not exists public.weekly_fixture_stale_queue (
  fixture_id bigint primary key references public.weekly_fixtures(id) on delete cascade,
  queued_at  timestamptz not null default now()
);

alter table public.weekly_fixture_stale_queue enable row level security;
-- 클라이언트는 이 테이블을 읽거나 쓸 이유가 없다. service_role만.

-- ---------------------------------------------------------------------------
-- 3. 실유저가 낀 fixture인지 — 한 곳에서만 정의
-- ---------------------------------------------------------------------------
create or replace function public._weekly_fixture_has_user(p_fixture_id bigint)
  returns boolean
  language sql
  stable
as $$
  select exists (
    select 1
    from public.weekly_fixtures f
    join public.weekly_league_members m
      on m.group_id = f.group_id and m.slot in (f.home_slot, f.away_slot)
    where f.id = p_fixture_id and m.kind = 'user'
  )
$$;

revoke all on function public._weekly_fixture_has_user(bigint) from public;
revoke all on function public._weekly_fixture_has_user(bigint) from authenticated;

-- ---------------------------------------------------------------------------
-- 4. 포아송 정산은 이제 AI 대 AI만 맡는다
-- ---------------------------------------------------------------------------
create or replace function public.settle_due_weekly_fixtures(p_limit int default 500)
  returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_row record;
  v_count int := 0;
  v_home_rating smallint;
  v_away_rating smallint;
  v_diff numeric;
  v_lambda_home numeric;
  v_lambda_away numeric;
begin
  for v_row in
    select id, group_id, home_slot, away_slot
    from public.weekly_fixtures f
    where status = 'pending'
      and scheduled_at_utc <= now()
      and not public._weekly_fixture_has_user(f.id)
    order by scheduled_at_utc
    limit p_limit
    for update skip locked
  loop
    select rating into v_home_rating from public.weekly_league_members
      where group_id = v_row.group_id and slot = v_row.home_slot;
    select rating into v_away_rating from public.weekly_league_members
      where group_id = v_row.group_id and slot = v_row.away_slot;

    v_diff := coalesce(v_home_rating, 60) + 3 - coalesce(v_away_rating, 60);
    v_lambda_home := greatest(0.25, least(4.5, 1.3 + v_diff / 22));
    v_lambda_away := greatest(0.25, least(4.5, 1.3 - v_diff / 22));

    update public.weekly_fixtures
      set score_home = public._weekly_poisson_goal(v_lambda_home),
          score_away = public._weekly_poisson_goal(v_lambda_away),
          status = 'played',
          settled_at = now(),
          settlement_engine = 'poisson'
      where id = v_row.id;

    v_count := v_count + 1;
  end loop;

  return jsonb_build_object('ok', true, 'settled', v_count);
end $$;

-- ---------------------------------------------------------------------------
-- 5. 안전망 — 시각이 지났는데 pending인 실유저 fixture를 큐에 적는다
-- ---------------------------------------------------------------------------
create or replace function public.queue_stale_weekly_fixtures(p_limit int default 200)
  returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_count int;
begin
  with due as (
    select f.id
    from public.weekly_fixtures f
    where f.status = 'pending'
      and f.scheduled_at_utc <= now()
      and public._weekly_fixture_has_user(f.id)
    order by f.scheduled_at_utc
    limit p_limit
  )
  insert into public.weekly_fixture_stale_queue (fixture_id)
  select id from due
  on conflict (fixture_id) do nothing;
  get diagnostics v_count = row_count;
  return jsonb_build_object('ok', true, 'queued', v_count);
end $$;

revoke all on function public.queue_stale_weekly_fixtures(int) from public;
revoke all on function public.queue_stale_weekly_fixtures(int) from authenticated;
grant execute on function public.queue_stale_weekly_fixtures(int) to service_role;

-- ---------------------------------------------------------------------------
-- 6. Edge Function이 판정할 fixture를 한 번에 읽는다 — 그룹 하나(화면을 연
--    사람의 그룹) 또는 안전망 큐. 양쪽 멤버 정보까지 같이 준다.
-- ---------------------------------------------------------------------------
create or replace function public.due_weekly_fixtures(
  p_group_id bigint default null,
  p_from_queue boolean default false,
  p_limit int default 20
) returns jsonb
  language sql
  stable
  security definer
  set search_path = public
as $$
  with picked as (
    select f.id, f.group_id, f.home_slot, f.away_slot, f.neutral_venue, f.scheduled_at_utc
    from public.weekly_fixtures f
    where f.status = 'pending'
      and f.scheduled_at_utc <= now()
      and public._weekly_fixture_has_user(f.id)
      and (
        (p_from_queue and exists (select 1 from public.weekly_fixture_stale_queue q where q.fixture_id = f.id))
        or (not p_from_queue and p_group_id is not null and f.group_id = p_group_id)
      )
    order by f.scheduled_at_utc
    limit p_limit
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'fixtureId', p.id,
    'groupId', p.group_id,
    'homeSlot', p.home_slot,
    'awaySlot', p.away_slot,
    'neutralVenue', p.neutral_venue,
    'home', (select jsonb_build_object('slot', m.slot, 'kind', m.kind, 'userId', m.user_id, 'clubName', m.club_name, 'rating', m.rating)
             from public.weekly_league_members m where m.group_id = p.group_id and m.slot = p.home_slot),
    'away', (select jsonb_build_object('slot', m.slot, 'kind', m.kind, 'userId', m.user_id, 'clubName', m.club_name, 'rating', m.rating)
             from public.weekly_league_members m where m.group_id = p.group_id and m.slot = p.away_slot)
  ) order by p.scheduled_at_utc), '[]'::jsonb)
  from picked p
$$;

revoke all on function public.due_weekly_fixtures(bigint, boolean, int) from public;
revoke all on function public.due_weekly_fixtures(bigint, boolean, int) from authenticated;
grant execute on function public.due_weekly_fixtures(bigint, boolean, int) to service_role;

-- ---------------------------------------------------------------------------
-- 7. 결과 확정 — commit_match와 같은 원칙. 아직 pending일 때만, fixture
--    단위 advisory lock 아래서 한 번만 쓴다. 화면을 연 사람의 캐치업과
--    안전망 큐 처리가 겹쳐도 두 번 정산되지 않는다.
-- ---------------------------------------------------------------------------
create or replace function public.commit_weekly_fixture_result(
  p_fixture_id     bigint,
  p_score_home     int,
  p_score_away     int,
  p_events         jsonb,
  p_seed           text,
  p_engine_version text
) returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_updated int;
begin
  perform pg_advisory_xact_lock(hashtext('weekly_fixture:' || p_fixture_id::text));

  update public.weekly_fixtures
    set score_home = p_score_home,
        score_away = p_score_away,
        events = p_events,
        simulation_seed = p_seed,
        engine_version = p_engine_version,
        settlement_engine = 'match',
        status = 'played',
        settled_at = now()
    where id = p_fixture_id and status = 'pending';
  get diagnostics v_updated = row_count;

  delete from public.weekly_fixture_stale_queue where fixture_id = p_fixture_id;

  return jsonb_build_object('ok', v_updated = 1, 'alreadySettled', v_updated = 0);
end $$;

revoke all on function public.commit_weekly_fixture_result(bigint, int, int, jsonb, text, text) from public;
revoke all on function public.commit_weekly_fixture_result(bigint, int, int, jsonb, text, text) from authenticated;
grant execute on function public.commit_weekly_fixture_result(bigint, int, int, jsonb, text, text) to service_role;

-- ---------------------------------------------------------------------------
-- 8. cron — 포아송(AI-AI)과 안전망 큐 적재를 5분마다 함께
-- ---------------------------------------------------------------------------
select cron.unschedule('settle-weekly-fixtures')
  where exists (select 1 from cron.job where jobname = 'settle-weekly-fixtures');
select cron.schedule('settle-weekly-fixtures', '*/5 * * * *', $$select public.settle_due_weekly_fixtures()$$);

select cron.unschedule('queue-stale-weekly-fixtures')
  where exists (select 1 from cron.job where jobname = 'queue-stale-weekly-fixtures');
select cron.schedule('queue-stale-weekly-fixtures', '*/5 * * * *', $$select public.queue_stale_weekly_fixtures()$$);
