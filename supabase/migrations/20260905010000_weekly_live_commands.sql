-- 주간 리그 라이브 개입 — 2단계 (docs/WEEKLY_LIVE_MATCH_DESIGN.md).
--
-- 실유저가 낀 fixture는 킥오프 시각부터 15분(경기 1분 = 실제 10초) 동안
-- "진행 중"이고, 그동안 양쪽 감독은 전술 변경·교체 명령을 보낼 수 있다.
-- 경기 상태는 서버에 저장하지 않는다 — (킥오프 스냅샷, 시드, 명령 목록,
-- 목표 분)의 순수 함수라서 볼 때마다 킥오프부터 다시 재생한다(90틱에
-- 1ms). 그래서 lease·CAS가 필요 없고, 공유 쓰기는 명령 추가(append-only,
-- 멱등 키)와 최종 확정(commit_weekly_fixture_result의 advisory lock)뿐이다.
--
-- 명령은 서버가 받은 시각의 경기 분으로 도장을 찍고, 그 분 이후 첫
-- 정지(파울·아웃·골·하프타임)에서 적용된다 — 소급 적용 없음. 도장은
-- 클라이언트 시계가 아니라 DB now()로 찍는다.

-- ---------------------------------------------------------------------------
-- 1. 킥오프 스냅샷 — 처음 누가 열었을 때 한 번만 저장. 둘이 동시에 열어도
--    on conflict do nothing으로 한 벌만 남고, 둘 다 저장된 것을 읽는다.
-- ---------------------------------------------------------------------------
create table if not exists public.weekly_fixture_engine_state (
  fixture_id     bigint primary key references public.weekly_fixtures(id) on delete cascade,
  seed           text not null,
  engine_version text not null,
  snapshot       jsonb not null,
  created_at     timestamptz not null default now()
);
alter table public.weekly_fixture_engine_state enable row level security;
-- 시드와 상대 전술이 들어 있으므로 클라이언트는 읽지 못한다. service_role만.

create or replace function public.save_weekly_fixture_engine_state(
  p_fixture_id     bigint,
  p_seed           text,
  p_engine_version text,
  p_snapshot       jsonb
) returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_row public.weekly_fixture_engine_state%rowtype;
begin
  insert into public.weekly_fixture_engine_state (fixture_id, seed, engine_version, snapshot)
  values (p_fixture_id, p_seed, p_engine_version, p_snapshot)
  on conflict (fixture_id) do nothing;

  select * into v_row from public.weekly_fixture_engine_state where fixture_id = p_fixture_id;
  return jsonb_build_object(
    'seed', v_row.seed,
    'engineVersion', v_row.engine_version,
    'snapshot', v_row.snapshot
  );
end $$;

revoke all on function public.save_weekly_fixture_engine_state(bigint, text, text, jsonb) from public;
revoke all on function public.save_weekly_fixture_engine_state(bigint, text, text, jsonb) from authenticated;
grant execute on function public.save_weekly_fixture_engine_state(bigint, text, text, jsonb) to service_role;

-- ---------------------------------------------------------------------------
-- 2. 명령 로그
-- ---------------------------------------------------------------------------
create table if not exists public.weekly_fixture_commands (
  id                    bigserial primary key,
  fixture_id            bigint not null references public.weekly_fixtures(id) on delete cascade,
  side                  text not null check (side in ('home', 'away')),
  user_id               uuid not null references auth.users on delete cascade,
  kind                  text not null check (kind in ('tactic', 'substitution')),
  payload               jsonb not null,
  idempotency_key       text not null check (char_length(idempotency_key) between 1 and 80),
  received_at           timestamptz not null default now(),
  received_match_minute smallint not null check (received_match_minute between 0 and 90),
  unique (fixture_id, user_id, idempotency_key)
);
create index if not exists weekly_fixture_commands_fixture_idx on public.weekly_fixture_commands (fixture_id, id);
alter table public.weekly_fixture_commands enable row level security;

-- 명령 접수. 요청자가 그 fixture의 home/away 실유저인지, 라이브 창 안인지
-- 여기서 확인한다. Edge Function도 확인하지만 마지막 문은 DB가 지킨다.
create or replace function public.submit_weekly_fixture_command(
  p_fixture_id      bigint,
  p_user            uuid,
  p_kind            text,
  p_payload         jsonb,
  p_idempotency_key text
) returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_fixture record;
  v_side text;
  v_minute int;
  v_id bigint;
begin
  select f.id, f.group_id, f.home_slot, f.away_slot, f.status, f.scheduled_at_utc
    into v_fixture
    from public.weekly_fixtures f where f.id = p_fixture_id;
  if v_fixture.id is null then
    return jsonb_build_object('ok', false, 'reason', 'not found');
  end if;
  if v_fixture.status <> 'pending' then
    return jsonb_build_object('ok', false, 'reason', 'already settled');
  end if;
  if now() < v_fixture.scheduled_at_utc then
    return jsonb_build_object('ok', false, 'reason', 'not started');
  end if;
  if now() >= v_fixture.scheduled_at_utc + interval '15 minutes' then
    return jsonb_build_object('ok', false, 'reason', 'live window over');
  end if;

  select case when m.slot = v_fixture.home_slot then 'home' else 'away' end
    into v_side
    from public.weekly_league_members m
    where m.group_id = v_fixture.group_id
      and m.kind = 'user' and m.user_id = p_user
      and m.slot in (v_fixture.home_slot, v_fixture.away_slot);
  if v_side is null then
    return jsonb_build_object('ok', false, 'reason', 'not a participant');
  end if;

  v_minute := least(90, greatest(0, floor(extract(epoch from (now() - v_fixture.scheduled_at_utc)) / 10)::int));

  insert into public.weekly_fixture_commands
    (fixture_id, side, user_id, kind, payload, idempotency_key, received_match_minute)
  values (p_fixture_id, v_side, p_user, p_kind, p_payload, p_idempotency_key, v_minute)
  on conflict (fixture_id, user_id, idempotency_key) do nothing
  returning id into v_id;

  if v_id is null then
    select id, received_match_minute into v_id, v_minute
      from public.weekly_fixture_commands
      where fixture_id = p_fixture_id and user_id = p_user and idempotency_key = p_idempotency_key;
    return jsonb_build_object('ok', true, 'id', v_id, 'side', v_side, 'minute', v_minute, 'duplicate', true);
  end if;
  return jsonb_build_object('ok', true, 'id', v_id, 'side', v_side, 'minute', v_minute, 'duplicate', false);
end $$;

revoke all on function public.submit_weekly_fixture_command(bigint, uuid, text, jsonb, text) from public;
revoke all on function public.submit_weekly_fixture_command(bigint, uuid, text, jsonb, text) from authenticated;
grant execute on function public.submit_weekly_fixture_command(bigint, uuid, text, jsonb, text) to service_role;

-- ---------------------------------------------------------------------------
-- 3. 한 fixture를 재생하는 데 필요한 것 전부를 한 번에 — fixture·양쪽 멤버·
--    저장된 스냅샷(있으면)·명령 목록.
-- ---------------------------------------------------------------------------
create or replace function public.weekly_fixture_context(p_fixture_id bigint)
  returns jsonb
  language sql
  stable
  security definer
  set search_path = public
as $$
  select jsonb_build_object(
    'fixture', (
      select jsonb_build_object(
        'fixtureId', f.id, 'groupId', f.group_id, 'homeSlot', f.home_slot, 'awaySlot', f.away_slot,
        'neutralVenue', f.neutral_venue, 'scheduledAtUtc', f.scheduled_at_utc, 'status', f.status,
        'scoreHome', f.score_home, 'scoreAway', f.score_away, 'events', f.events,
        'home', (select jsonb_build_object('slot', m.slot, 'kind', m.kind, 'userId', m.user_id, 'clubName', m.club_name, 'rating', m.rating)
                 from public.weekly_league_members m where m.group_id = f.group_id and m.slot = f.home_slot),
        'away', (select jsonb_build_object('slot', m.slot, 'kind', m.kind, 'userId', m.user_id, 'clubName', m.club_name, 'rating', m.rating)
                 from public.weekly_league_members m where m.group_id = f.group_id and m.slot = f.away_slot)
      )
      from public.weekly_fixtures f where f.id = p_fixture_id
    ),
    'engine', (
      select jsonb_build_object('seed', e.seed, 'engineVersion', e.engine_version, 'snapshot', e.snapshot)
      from public.weekly_fixture_engine_state e where e.fixture_id = p_fixture_id
    ),
    'commands', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', c.id, 'side', c.side, 'minute', c.received_match_minute,
        'payload', c.payload || jsonb_build_object('kind', c.kind)
      ) order by c.id), '[]'::jsonb)
      from public.weekly_fixture_commands c where c.fixture_id = p_fixture_id
    )
  )
$$;

revoke all on function public.weekly_fixture_context(bigint) from public;
revoke all on function public.weekly_fixture_context(bigint) from authenticated;
grant execute on function public.weekly_fixture_context(bigint) to service_role;

-- ---------------------------------------------------------------------------
-- 4. 일괄 정산 대상은 이제 "라이브 창이 끝난" fixture만 — 창 안에서는
--    get_state가 분 단위로 진행시키고, 끝나야 한 번에 90분까지 재생해 확정한다.
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
      and f.scheduled_at_utc + interval '15 minutes' <= now()
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
      and f.scheduled_at_utc + interval '15 minutes' <= now()
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
