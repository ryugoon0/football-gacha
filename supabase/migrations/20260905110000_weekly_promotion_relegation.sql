-- 2주차(2026-09-14)부터의 정식 시즌 자동 생성 — 직전 주 순위로 승격·강등.
--
-- auto_bootstrap_regular_season()은 첫 주(9/7)만 배치 리그 구성을 그대로
-- 이어받는다. 그다음 주부터는 이 함수가 매주 월요일 00:00 KST 이후에
-- 직전 주 그룹의 최종 순위를 읽어 등급 간 3팀씩 맞바꾼다
-- (lib/weeklyLeague/config.ts의 PROMOTION_SPOTS·RELEGATION_SPOTS = 3).
--
-- 순위는 승점 → 골득실 → 득점 → 슬롯 순(standings.ts의 완전한 동률 처리는
-- 첫 주 생성 함수와 같은 이유로 근사). 새 슬롯 번호는 승격팀 → 잔류팀 →
-- 강등팀 순으로 직전 순위를 유지해 붙이고, 그 순서를 Cup A 시드로 쓴다.
-- AI 클럽도 사람과 같은 규칙으로 오르내린다 — 유저에게는 "강한 AI가
-- 올라왔다"가 자연스러운 서사다.
create or replace function public.bootstrap_week_from_previous(
  p_week_start timestamptz,
  p_prev_week_id text,
  p_wait_for_settlement boolean default true
) returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_week_start timestamptz := p_week_start;
  v_week_id text;
  v_prev_week_id text := p_prev_week_id;
  v_tier record;
  v_tier_count int;
  v_existing_group bigint;
  v_group_id bigint;
  v_members jsonb;
  v_competitions jsonb;
  v_league_id bigint;
  v_cup_a_id bigint;
  v_cup_b_id bigint;
  v_league_fixtures jsonb;
  v_seed_a text[];
  v_seed_b text[];
  v_a_ties jsonb;
  v_b_ties jsonb;
  v_created_tiers int[] := array[]::int[];
begin
  v_week_id := 'regular-' || to_char(v_week_start at time zone 'Asia/Seoul', 'YYYY-MM-DD');

  perform pg_advisory_xact_lock(hashtext('auto_bootstrap_next_week:' || v_week_id));

  -- 직전 주가 아예 없으면(예: 서비스 중단 뒤 재개) 만들 재료가 없다.
  if not exists (select 1 from public.weekly_league_groups where week_id = v_prev_week_id) then
    return jsonb_build_object('ok', false, 'weekId', v_week_id, 'reason', 'previous week ' || v_prev_week_id || ' not found');
  end if;
  -- 직전 주가 아직 안 끝났으면(정산 중) 기다린다.
  if p_wait_for_settlement and exists (
    select 1 from public.weekly_fixtures f
    join public.weekly_league_groups g on g.id = f.group_id
    where g.week_id = v_prev_week_id and f.status = 'pending'
  ) then
    return jsonb_build_object('ok', true, 'weekId', v_week_id, 'reason', 'previous week still settling');
  end if;
  if exists (select 1 from public.weekly_league_groups where week_id = v_week_id) then
    return jsonb_build_object('ok', true, 'weekId', v_week_id, 'createdTiers', v_created_tiers, 'reason', 'already created');
  end if;

  select count(*) into v_tier_count from public.weekly_tier_rules;

  perform public.seed_weekly_schedule_slots(v_week_id, (
    select jsonb_agg(jsonb_build_object(
      'index', t.slot_index,
      'day', t.day_of_week,
      'hour', t.local_hour,
      'type', t.type,
      'cupStage', t.cup_stage,
      'leg', t.leg,
      'scheduledAtUtc',
        v_week_start
        + (case t.day_of_week
             when 'MON' then 0 when 'TUE' then 1 when 'WED' then 2 when 'THU' then 3
             when 'FRI' then 4 when 'SAT' then 5 when 'SUN' then 6 end) * 24 * interval '1 hour'
        + t.local_hour * interval '1 hour'
    ))
    from public.weekly_regular_slot_template t
  ));

  -- 직전 주 최종 순위(등급별 1..16).
  create temp table prev_ranked on commit drop as
  select g.tier, m.slot, m.kind, m.user_id, m.club_name, m.badge, m.rating,
         row_number() over (
           partition by g.tier
           order by s.points desc, s.gd desc, s.gf desc, m.slot asc
         ) as rank
  from public.weekly_league_groups g
  join public.weekly_league_members m on m.group_id = g.id
  join lateral (
    select
      coalesce(sum(case
        when f.home_slot = m.slot and f.score_home > f.score_away then 3
        when f.away_slot = m.slot and f.score_away > f.score_home then 3
        when f.score_home = f.score_away then 1
        else 0 end), 0) as points,
      coalesce(sum(case when f.home_slot = m.slot then f.score_home - f.score_away else f.score_away - f.score_home end), 0) as gd,
      coalesce(sum(case when f.home_slot = m.slot then f.score_home else f.score_away end), 0) as gf
    from public.weekly_fixtures f
    join public.weekly_competitions c on c.id = f.competition_id and c.type = 'LEAGUE'
    where f.group_id = g.id and f.status = 'played'
      and (f.home_slot = m.slot or f.away_slot = m.slot)
  ) s on true
  where g.week_id = v_prev_week_id;

  for v_tier in select tier from public.weekly_tier_rules order by tier
  loop
    select id into v_existing_group from public.weekly_league_groups
      where tier = v_tier.tier and week_id = v_week_id limit 1;
    if v_existing_group is not null then continue; end if;
    if not exists (select 1 from prev_ranked where tier = v_tier.tier) then continue; end if;

    -- 새 구성: 아래 등급 상위 3(승격) → 이 등급 잔류 → 위 등급 하위 3(강등).
    -- 최상위는 강등 없이 1..13 잔류, 최하위는 승격 없이 4..16 잔류.
    select jsonb_agg(jsonb_build_object(
      'slot', ord - 1, 'kind', kind, 'userId', user_id,
      'clubName', club_name, 'badge', badge, 'rating', rating
    ) order by ord) into v_members
    from (
      select row_number() over (order by grp, rank) as ord, *
      from (
        select 0 as grp, p.* from prev_ranked p
          where p.tier = v_tier.tier + 1 and v_tier.tier + 1 < v_tier_count and p.rank <= 3
        union all
        select 1 as grp, p.* from prev_ranked p
          where p.tier = v_tier.tier
            and p.rank > (case when v_tier.tier = 0 then 0 else 3 end)
            and p.rank <= (case when v_tier.tier + 1 >= v_tier_count then 16 else 13 end)
        union all
        select 2 as grp, p.* from prev_ranked p
          where p.tier = v_tier.tier - 1 and v_tier.tier > 0 and p.rank > 13
      ) picked
    ) ordered;

    if jsonb_array_length(coalesce(v_members, '[]'::jsonb)) <> 16 then
      raise warning 'auto_bootstrap_next_week: tier % has % members, skipping', v_tier.tier, jsonb_array_length(coalesce(v_members, '[]'::jsonb));
      continue;
    end if;

    v_group_id := public.create_weekly_league_group(v_tier.tier, v_week_id, v_members);
    v_competitions := public.seed_weekly_competitions(v_group_id);
    v_league_id := (v_competitions->>'LEAGUE')::bigint;
    v_cup_a_id := (v_competitions->>'CUP_A')::bigint;
    v_cup_b_id := (v_competitions->>'CUP_B')::bigint;

    select jsonb_agg(jsonb_build_object(
      'round', f.round, 'homeSlot', f.home_slot, 'awaySlot', f.away_slot,
      'scheduledAtUtc', s.scheduled_at_utc
    )) into v_league_fixtures
    from public.weekly_league_fixture_template f
    join (
      select row_number() over (order by slot_index) - 1 as league_round, scheduled_at_utc
      from public.weekly_schedule_slots
      where week_id = v_week_id and type = 'LEAGUE'
    ) s on s.league_round = f.round;
    perform public.seed_league_fixtures(v_group_id, v_league_id, v_league_fixtures);

    -- Cup A 시드 = 새 슬롯 순서(승격팀부터 직전 순위 순). Cup B = 결정론적 뒤섞기.
    select array_agg(slot::text order by slot) into v_seed_a
    from public.weekly_league_members where group_id = v_group_id;
    select array_agg(slot::text order by md5(v_group_id::text || ':' || slot::text)) into v_seed_b
    from public.weekly_league_members where group_id = v_group_id;

    select jsonb_agg(jsonb_build_object(
      'homeSlot', v_seed_a[i + 1]::int, 'awaySlot', v_seed_a[16 - i]::int,
      'leg1ScheduledAtUtc', (select scheduled_at_utc from public.weekly_schedule_slots
        where week_id = v_week_id and type = 'CUP_A' and cup_stage = 'R16' and leg = 1),
      'leg2ScheduledAtUtc', (select scheduled_at_utc from public.weekly_schedule_slots
        where week_id = v_week_id and type = 'CUP_A' and cup_stage = 'R16' and leg = 2)
    )) into v_a_ties from generate_series(0, 7) i;
    select jsonb_agg(jsonb_build_object(
      'homeSlot', v_seed_b[i + 1]::int, 'awaySlot', v_seed_b[16 - i]::int,
      'leg1ScheduledAtUtc', (select scheduled_at_utc from public.weekly_schedule_slots
        where week_id = v_week_id and type = 'CUP_B' and cup_stage = 'R16' and leg = 1),
      'leg2ScheduledAtUtc', (select scheduled_at_utc from public.weekly_schedule_slots
        where week_id = v_week_id and type = 'CUP_B' and cup_stage = 'R16' and leg = 2)
    )) into v_b_ties from generate_series(0, 7) i;

    perform public.seed_cup_stage_ties(v_group_id, v_cup_a_id, 'R16', v_a_ties);
    perform public.seed_cup_stage_ties(v_group_id, v_cup_b_id, 'R16', v_b_ties);

    v_created_tiers := v_created_tiers || v_tier.tier;
  end loop;

  return jsonb_build_object('ok', true, 'weekId', v_week_id, 'prevWeekId', v_prev_week_id, 'createdTiers', v_created_tiers);
end $$;

revoke all on function public.bootstrap_week_from_previous(timestamptz, text, boolean) from public;
revoke all on function public.bootstrap_week_from_previous(timestamptz, text, boolean) from authenticated;
grant execute on function public.bootstrap_week_from_previous(timestamptz, text, boolean) to service_role;

-- 크론 진입점: 이번 주 월요일 00:00 KST를 계산해 직전 정규 주에서 이어 만든다.
-- 첫 정규 주(9/7)는 auto_bootstrap_regular_season()의 몫이라 건드리지 않는다.
create or replace function public.auto_bootstrap_next_week()
  returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_week_start timestamptz;
begin
  v_week_start := (date_trunc('week', (now() at time zone 'Asia/Seoul')) at time zone 'Asia/Seoul');
  if v_week_start < '2026-09-14T00:00:00+09:00'::timestamptz then
    return jsonb_build_object('ok', true, 'reason', 'first regular week is handled by auto_bootstrap_regular_season');
  end if;
  return public.bootstrap_week_from_previous(
    v_week_start,
    'regular-' || to_char((v_week_start - interval '7 days') at time zone 'Asia/Seoul', 'YYYY-MM-DD'),
    true
  );
end $$;

revoke all on function public.auto_bootstrap_next_week() from public;
revoke all on function public.auto_bootstrap_next_week() from authenticated;
grant execute on function public.auto_bootstrap_next_week() to service_role;

select cron.unschedule('auto-bootstrap-next-week')
  where exists (select 1 from cron.job where jobname = 'auto-bootstrap-next-week');
-- 일요일 23:00 마지막 경기(마스터스 결승)가 정산된 직후 월요일 00:00 언저리에
-- 만들어지도록 10분마다 확인한다. 이미 만들어졌으면 즉시 반환한다.
select cron.schedule('auto-bootstrap-next-week', '*/10 * * * *', $$select public.auto_bootstrap_next_week()$$);
