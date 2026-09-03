-- 개막 배치 리그 자동 생성 — 운영자가 버튼을 누르지 않아도 된다.
--
-- 대진 "패턴"(어느 라운드에 몇 번 슬롯끼리 붙는지)은 클럽이 누구인지와
-- 무관하게 항상 같다(lib/weeklyLeague/placement.ts의 generatePlacementFixtures가
-- 이미 검증·테스트해 둔 결과). 그래서 그 알고리즘을 SQL로 다시 짜는 대신,
-- 그 출력값을 한 번 뽑아 정적 표로 저장해 두고 이 함수는 "누가 몇 번
-- 슬롯인지"만 자동으로 정한 뒤 그 표와 조인한다 — 라운드로빈 로직 자체는
-- 여전히 한 벌(lib/weeklyLeague/placement.ts)이고, 여기 있는 건 그 결과값의
-- 사본일 뿐이다.
--
-- pg_net으로 Edge Function을 부르는 방법도 검토했지만, 그러려면 서비스 키를
-- DB 안(Vault 등)에 심어야 해서 위험과 복잡도가 커진다. 지금 필요한 건
-- "라운드로빈 패턴 재사용"뿐이라 이 쪽이 훨씬 안전하다.

create table if not exists public.weekly_placement_fixture_template (
  round     smallint not null,
  home_slot smallint not null check (home_slot between 0 and 15),
  away_slot smallint not null check (away_slot between 0 and 15),
  primary key (round, home_slot, away_slot)
);

-- generatePlacementFixtures(['0'..'15'])의 실제 출력을 그대로 옮긴 것.
-- lib/weeklyLeague/placement.ts를 바꾸면 이 표도 다시 뽑아 갱신해야 한다.
insert into public.weekly_placement_fixture_template (round, home_slot, away_slot)
values
(0,0,15),(0,1,14),(0,2,13),(0,3,12),(0,4,11),(0,5,10),(0,6,9),(0,7,8),(1,0,14),(1,15,13),(1,1,12),(1,2,11),(1,3,10),(1,4,9),(1,5,8),(1,6,7),(2,0,13),(2,14,12),(2,15,11),(2,1,10),(2,2,9),(2,3,8),(2,4,7),(2,5,6),(3,0,12),(3,13,11),(3,14,10),(3,15,9),(3,1,8),(3,2,7),(3,3,6),(3,4,5),(4,0,11),(4,12,10),(4,13,9),(4,14,8),(4,15,7),(4,1,6),(4,2,5),(4,3,4),(5,0,10),(5,11,9),(5,12,8),(5,13,7),(5,14,6),(5,15,5),(5,1,4),(5,2,3),(6,0,9),(6,10,8),(6,11,7),(6,12,6),(6,13,5),(6,14,4),(6,15,3),(6,1,2),(7,0,8),(7,9,7),(7,10,6),(7,11,5),(7,12,4),(7,13,3),(7,14,2),(7,15,1),(8,0,7),(8,8,6),(8,9,5),(8,10,4),(8,11,3),(8,12,2),(8,13,1),(8,14,15),(9,0,6),(9,7,5),(9,8,4),(9,9,3),(9,10,2),(9,11,1),(9,12,15),(9,13,14),(10,0,5),(10,6,4),(10,7,3),(10,8,2),(10,9,1),(10,10,15),(10,11,14),(10,12,13),(11,0,4),(11,5,3),(11,6,2),(11,7,1),(11,8,15),(11,9,14),(11,10,13),(11,11,12),(12,0,3),(12,4,2),(12,5,1),(12,6,15),(12,7,14),(12,8,13),(12,9,12),(12,10,11),(13,0,2),(13,3,1),(13,4,15),(13,5,14),(13,6,13),(13,7,12),(13,8,11),(13,9,10),(14,0,1),(14,2,15),(14,3,14),(14,4,13),(14,5,12),(14,6,11),(14,7,10),(14,8,9),(15,15,0),(15,14,1),(15,13,2),(15,12,3),(15,11,4),(15,10,5),(15,9,6),(15,8,7),(16,14,0),(16,13,15),(16,12,1),(16,11,2),(16,10,3),(16,9,4),(16,8,5),(16,7,6),(17,13,0),(17,12,14),(17,11,15),(17,10,1),(17,9,2),(17,8,3),(17,7,4),(17,6,5),(18,12,0),(18,11,13),(18,10,14),(18,9,15),(18,8,1),(18,7,2),(18,6,3),(18,5,4),(19,11,0),(19,10,12),(19,9,13),(19,8,14),(19,7,15),(19,6,1),(19,5,2),(19,4,3),(20,10,0),(20,9,11),(20,8,12),(20,7,13),(20,6,14),(20,5,15),(20,4,1),(20,3,2),(21,9,0),(21,8,10),(21,7,11),(21,6,12),(21,5,13),(21,4,14),(21,3,15),(21,2,1),(22,8,0),(22,7,9),(22,6,10),(22,5,11),(22,4,12),(22,3,13),(22,2,14),(22,1,15),(23,7,0),(23,6,8),(23,5,9),(23,4,10),(23,3,11),(23,2,12),(23,1,13),(23,15,14),(24,6,0),(24,5,7),(24,4,8),(24,3,9),(24,2,10),(24,1,11),(24,15,12),(24,14,13),(25,5,0),(25,4,6),(25,3,7),(25,2,8),(25,1,9),(25,15,10),(25,14,11),(25,13,12),(26,4,0),(26,3,5),(26,2,6),(26,1,7),(26,15,8),(26,14,9),(26,13,10),(26,12,11),(27,3,0),(27,2,4),(27,1,5),(27,15,6),(27,14,7),(27,13,8),(27,12,9),(27,11,10),(28,2,0),(28,1,3),(28,15,4),(28,14,5),(28,13,6),(28,12,7),(28,11,8),(28,10,9),(29,1,0),(29,15,2),(29,14,3),(29,13,4),(29,12,5),(29,11,6),(29,10,7),(29,9,8),(30,0,15),(30,1,14),(30,2,13),(30,3,12),(30,4,11),(30,5,10),(30,6,9),(30,7,8),(31,14,0),(31,15,13),(31,12,1),(31,11,2),(31,10,3),(31,9,4),(31,8,5),(31,6,7),(32,13,0),(32,14,12),(32,15,11),(32,1,10),(32,2,9),(32,3,8),(32,4,7),(32,5,6),(33,0,12),(33,13,11),(33,14,10),(33,15,9),(33,1,8),(33,2,7),(33,3,6),(33,4,5),(34,0,11),(34,12,10),(34,13,9),(34,14,8),(34,15,7),(34,1,6),(34,2,5),(34,3,4),(35,0,10),(35,11,9),(35,12,8),(35,7,13),(35,14,6),(35,5,15),(35,1,4),(35,2,3),(36,9,0),(36,10,8),(36,11,7),(36,12,6),(36,13,5),(36,14,4),(36,15,3),(36,1,2),(37,8,0),(37,9,7),(37,10,6),(37,5,11),(37,4,12),(37,13,3),(37,14,2),(37,15,1),(38,0,7),(38,8,6),(38,9,5),(38,10,4),(38,11,3),(38,12,2),(38,13,1),(38,14,15),(39,6,0),(39,7,5),(39,8,4),(39,3,9),(39,2,10),(39,11,1),(39,12,15),(39,13,14),(40,0,5),(40,6,4),(40,7,3),(40,8,2),(40,9,1),(40,10,15),(40,11,14),(40,12,13),(41,4,0),(41,5,3),(41,6,2),(41,7,1),(41,15,8),(41,9,14),(41,10,13),(41,11,12),(42,0,3),(42,4,2),(42,5,1),(42,6,15),(42,7,14),(42,8,13),(42,9,12),(42,10,11),(43,2,0),(43,3,1),(43,4,15),(43,5,14),(43,6,13),(43,7,12),(43,8,11),(43,9,10),(44,1,0),(44,2,15),(44,3,14),(44,4,13),(44,5,12),(44,6,11),(44,7,10),(44,8,9)
on conflict do nothing;

-- 등급별 실유저 상한·AI 기준 평점 — lib/weeklyLeague/config.ts의 TIERS와
-- 반드시 같은 값을 유지해야 한다. 하나를 바꾸면 다른 쪽도 같이 바꿀 것.
create table if not exists public.weekly_tier_rules (
  tier            smallint primary key,
  max_real_users  smallint not null,
  ai_base_rating  smallint not null
);

insert into public.weekly_tier_rules (tier, max_real_users, ai_base_rating) values
  (0, 8, 75),
  (1, 4, 68),
  (2, 2, 61),
  (3, 1, 54)
on conflict (tier) do update
  set max_real_users = excluded.max_real_users,
      ai_base_rating = excluded.ai_base_rating;

-- 실유저를 자동으로 골라 등급별 개막 배치 리그를 만든다. 이미 만들어진
-- 등급은 건드리지 않는다(멱등) — pg_cron이 여러 번 불러도 안전하다.
-- 실유저 선정: 관리자가 아니고, 실제 진행 기록(saves)이 있고, 이번 주
-- 다른 등급에 이미 배정되지 않은 사람 중에서 상한만큼. 최상위 등급부터
-- 먼저 채워서 "최상위일수록 실유저가 많다"는 규칙을 만족시킨다.
create or replace function public.auto_bootstrap_placement_leagues()
  returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  -- config.ts의 TRANSITION_SCHEDULE과 반드시 같은 값이어야 한다.
  v_week_id text := 'placement-2026-09-04';
  v_first_match_at timestamptz := '2026-09-04T09:00:00+09:00'::timestamptz;
  v_tier record;
  v_existing_group bigint;
  v_group_id bigint;
  v_assigned_user_ids uuid[];
  v_candidate record;
  v_members jsonb;
  v_slot int;
  v_competitions jsonb;
  v_placement_id bigint;
  v_fixtures jsonb;
  v_created_tiers int[] := array[]::int[];
begin
  perform pg_advisory_xact_lock(hashtext('auto_bootstrap_placement:' || v_week_id));

  perform public.seed_weekly_schedule_slots(v_week_id, (
    select jsonb_agg(jsonb_build_object(
      'index', i,
      'day', (array['FRI', 'SAT', 'SUN'])[i / 15 + 1],
      'hour', 9 + (i % 15),
      'type', 'OPENING_PLACEMENT',
      'scheduledAtUtc', v_first_match_at + ((i / 15) * 24 + (i % 15)) * interval '1 hour'
    ))
    from generate_series(0, 44) i
  ));

  select coalesce(array_agg(m.user_id), array[]::uuid[]) into v_assigned_user_ids
  from public.weekly_league_members m
  join public.weekly_league_groups g on g.id = m.group_id
  where g.week_id = v_week_id and m.kind = 'user';

  for v_tier in select tier, max_real_users, ai_base_rating from public.weekly_tier_rules order by tier
  loop
    select id into v_existing_group from public.weekly_league_groups
      where tier = v_tier.tier and week_id = v_week_id limit 1;
    if v_existing_group is not null then
      continue;
    end if;

    v_members := '[]'::jsonb;
    v_slot := 0;

    for v_candidate in
      select s.user_id, s.data->>'club' as club_name
      from public.saves s
      where not exists (select 1 from public.admins a where a.user_id = s.user_id)
        and not (s.user_id = any(v_assigned_user_ids))
      order by s.user_id
    loop
      exit when v_slot >= v_tier.max_real_users;
      v_members := v_members || jsonb_build_object(
        'slot', v_slot,
        'kind', 'user',
        'userId', v_candidate.user_id,
        'clubName', coalesce(nullif(trim(v_candidate.club_name), ''), '유저클럽' || (v_slot + 1)),
        'badge', '',
        'rating', v_tier.ai_base_rating + 5
      );
      v_assigned_user_ids := v_assigned_user_ids || v_candidate.user_id;
      v_slot := v_slot + 1;
    end loop;

    while jsonb_array_length(v_members) < 16 loop
      v_members := v_members || jsonb_build_object(
        'slot', jsonb_array_length(v_members),
        'kind', 'ai',
        'userId', null,
        'clubName', 'AI 클럽 ' || (jsonb_array_length(v_members) + 1),
        'badge', '',
        'rating', v_tier.ai_base_rating
      );
    end loop;

    v_group_id := public.create_weekly_league_group(v_tier.tier, v_week_id, v_members);
    v_competitions := public.seed_weekly_competitions(v_group_id);
    v_placement_id := (v_competitions->>'OPENING_PLACEMENT')::bigint;

    select jsonb_agg(jsonb_build_object(
      'round', t.round,
      'homeSlot', t.home_slot,
      'awaySlot', t.away_slot,
      'scheduledAtUtc', v_first_match_at + ((t.round / 15) * 24 + (t.round % 15)) * interval '1 hour'
    )) into v_fixtures
    from public.weekly_placement_fixture_template t;

    perform public.seed_league_fixtures(v_group_id, v_placement_id, v_fixtures);

    v_created_tiers := v_created_tiers || v_tier.tier;
  end loop;

  return jsonb_build_object('ok', true, 'weekId', v_week_id, 'createdTiers', v_created_tiers);
end $$;

revoke all on function public.auto_bootstrap_placement_leagues() from public;
revoke all on function public.auto_bootstrap_placement_leagues() from authenticated;
grant execute on function public.auto_bootstrap_placement_leagues() to service_role;

select cron.unschedule('auto-bootstrap-placement')
  where exists (select 1 from cron.job where jobname = 'auto-bootstrap-placement');

-- 10분마다 — 새로 가입한 실유저가 있으면 아직 안 만들어진 등급에 반영되고,
-- 이미 만들어진 등급은 그대로 둔다(멱등). 배포 직후에도 실행돼 실유저가
-- 있으면 오늘 밤 안에 바로 만들어진다.
select cron.schedule('auto-bootstrap-placement', '*/10 * * * *', $$select public.auto_bootstrap_placement_leagues()$$);
