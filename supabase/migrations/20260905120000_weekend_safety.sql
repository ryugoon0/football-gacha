-- 주말 운영 안전망 — 9/7(월) 정식 시즌 전환을 앞두고 세 가지를 고친다.
--
-- 1. 배치 리그 순위 보상: grant_weekly_card_rewards()가 LEAGUE 타입만 봐서
--    OPENING_PLACEMENT(배치 리그)는 주 종료 히든 카드가 지급되지 않았다.
-- 2. 정식 시즌 생성 함수 두 개가 직전 주 정산을 기다리게 한다(월 08:00까지).
--    실유저 경기는 Edge Function이 정산하므로 00:00 정각에는 마지막 경기가
--    아직 pending일 수 있다.
-- 3. 실유저 경기 안전망 큐를 서버가 스스로 비운다 — 지금은 누군가 앱을 열어
--    Edge Function을 호출해야만 비워졌다. pg_cron + pg_net이 5분마다
--    weekly-fixture-live의 drain_stale 액션을 호출한다. 인증은 전용 공유
--    토큰(x-drain-token — Edge Function 비밀 WEEKLY_DRAIN_TOKEN과 Vault의
--    drain_token이 같은 값)이고, 게이트웨이용 JWT로는 공개 anon 키(Vault의
--    anon_key)를 보낸다. Vault에 값이 없으면 호출하지 않는다.

create or replace function public.grant_weekly_card_rewards()
  returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_cards text[] := array[
    'cardUnderdog', 'cardEvenMatch', 'cardHomeCrowd', 'cardAwayGrit', 'cardBigStage', 'cardHotTime',
    'cardChaser', 'cardLockdown', 'cardFastStart', 'cardSecondHalf', 'cardLateLegs', 'cardGoalmouth'
  ];
  v_n int := 12;
  v_league record;
  v_rank record;
  v_last_fixture bigint;
  v_count int;
  v_card text;
  v_league_grants int := 0;
  v_cup_grants int := 0;
  v_final record;
begin
  for v_league in
    select c.id as competition_id, c.group_id
    from public.weekly_competitions c
    where c.type in ('LEAGUE', 'OPENING_PLACEMENT')
      and exists (select 1 from public.weekly_fixtures f where f.competition_id = c.id)
      and not exists (select 1 from public.weekly_fixtures f where f.competition_id = c.id and f.status <> 'played')
      and not exists (
        select 1 from public.weekly_rewards r
        join public.weekly_fixtures f on f.id = r.fixture_id
        where f.competition_id = c.id and r.kind = 'tactic_card'
      )
  loop
    select id into v_last_fixture from public.weekly_fixtures
      where competition_id = v_league.competition_id order by scheduled_at_utc desc, id desc limit 1;

    for v_rank in
      select m.user_id, row_number() over (order by points desc, m.slot asc) as rank
      from (
        select m.slot, m.user_id,
          coalesce(sum(case
            when f.home_slot = m.slot and f.score_home > f.score_away then 3
            when f.away_slot = m.slot and f.score_away > f.score_home then 3
            when (f.home_slot = m.slot or f.away_slot = m.slot) and f.score_home = f.score_away then 1
            else 0 end), 0) as points
        from public.weekly_league_members m
        left join public.weekly_fixtures f
          on f.competition_id = v_league.competition_id and f.status = 'played'
          and (f.home_slot = m.slot or f.away_slot = m.slot)
        where m.group_id = v_league.group_id
        group by m.slot, m.user_id
      ) m
      where m.user_id is not null
    loop
      v_count := case when v_rank.rank = 1 then 3 when v_rank.rank <= 3 then 2 else 1 end;
      v_card := v_cards[1 + (('x' || left(md5('league:' || v_league.competition_id::text || ':' || v_rank.user_id::text), 8))::bit(32)::int & 2147483647) % v_n];
      insert into public.weekly_rewards (user_id, fixture_id, group_id, kind, amount, card_id)
      values (v_rank.user_id, v_last_fixture, v_league.group_id, 'tactic_card', v_count, v_card)
      on conflict do nothing;
      v_league_grants := v_league_grants + 1;
    end loop;
  end loop;

  for v_final in
    select t.id as tie_id, t.winner_slot, t.home_slot, t.away_slot, t.first_leg_fixture_id as fixture_id,
           c.group_id, c.id as competition_id
    from public.weekly_cup_ties t
    join public.weekly_competitions c on c.id = t.competition_id
    where t.stage = 'FINAL' and t.winner_slot is not null
      and not exists (select 1 from public.weekly_rewards r where r.fixture_id = t.first_leg_fixture_id and r.kind = 'tactic_card')
  loop
    for v_rank in
      select m.user_id, case when m.slot = v_final.winner_slot then 2 else 1 end as cnt
      from public.weekly_league_members m
      where m.group_id = v_final.group_id and m.kind = 'user'
        and m.slot in (v_final.home_slot, v_final.away_slot)
    loop
      v_card := v_cards[1 + (('x' || left(md5('cup:' || v_final.tie_id::text || ':' || v_rank.user_id::text), 8))::bit(32)::int & 2147483647) % v_n];
      insert into public.weekly_rewards (user_id, fixture_id, group_id, kind, amount, card_id)
      values (v_rank.user_id, v_final.fixture_id, v_final.group_id, 'tactic_card', v_rank.cnt, v_card)
      on conflict do nothing;
      v_cup_grants := v_cup_grants + 1;
    end loop;
  end loop;

  return jsonb_build_object('ok', true, 'leagueGrants', v_league_grants, 'cupGrants', v_cup_grants);
end $$;

create or replace function public.auto_bootstrap_regular_season()
  returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_week_id text := 'regular-2026-09-07';
  v_placement_week_id text := 'placement-2026-09-04';
  v_first_match_at timestamptz := '2026-09-07T00:00:00+09:00'::timestamptz;
  v_tier record;
  v_existing_group bigint;
  v_placement_group bigint;
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
  -- 배치 리그(placement-2026-09-04)가 끝나기 전에는 절대 만들지 않는다 —
  -- 그 전에 만들면 순위가 아직 확정되지 않은 채로 Cup A 시드가 정해진다.
  if now() < v_first_match_at then
    return jsonb_build_object('ok', true, 'weekId', v_week_id, 'createdTiers', array[]::int[], 'reason', 'too early');
  end if;

  -- 배치 리그 마지막 경기(9/6 23:00)가 아직 정산 중이면 기다린다 — 실유저
  -- 경기는 Edge Function이 정산하므로 크론 한 바퀴 뒤에야 끝날 수 있다.
  -- 단, 첫 경기(월 09:00) 한 시간 전인 08:00부터는 기다리지 않고 만든다.
  if now() < v_first_match_at + interval '8 hours' and exists (
    select 1 from public.weekly_fixtures f
    join public.weekly_league_groups g on g.id = f.group_id
    where g.week_id = v_placement_week_id and f.status = 'pending'
  ) then
    return jsonb_build_object('ok', true, 'weekId', v_week_id, 'createdTiers', array[]::int[], 'reason', 'placement still settling');
  end if;

  perform pg_advisory_xact_lock(hashtext('auto_bootstrap_regular:' || v_week_id));

  perform public.seed_weekly_schedule_slots(v_week_id, (
    select jsonb_agg(jsonb_build_object(
      'index', t.slot_index,
      'day', t.day_of_week,
      'hour', t.local_hour,
      'type', t.type,
      'cupStage', t.cup_stage,
      'leg', t.leg,
      'scheduledAtUtc',
        v_first_match_at
        + (case t.day_of_week
             when 'MON' then 0 when 'TUE' then 1 when 'WED' then 2 when 'THU' then 3
             when 'FRI' then 4 when 'SAT' then 5 when 'SUN' then 6 end) * 24 * interval '1 hour'
        + t.local_hour * interval '1 hour'
    ))
    from public.weekly_regular_slot_template t
  ));

  for v_tier in select tier, max_real_users, ai_base_rating from public.weekly_tier_rules order by tier
  loop
    select id into v_existing_group from public.weekly_league_groups
      where tier = v_tier.tier and week_id = v_week_id limit 1;
    if v_existing_group is not null then
      continue;
    end if;

    select id into v_placement_group from public.weekly_league_groups
      where tier = v_tier.tier and week_id = v_placement_week_id limit 1;
    if v_placement_group is null then
      -- 배치 리그가 이 등급에서 아직 안 만들어졌으면 정식 시즌도 못 만든다.
      continue;
    end if;

    select jsonb_agg(jsonb_build_object(
      'slot', m.slot, 'kind', m.kind, 'userId', m.user_id,
      'clubName', m.club_name, 'badge', m.badge, 'rating', m.rating
    ) order by m.slot) into v_members
    from public.weekly_league_members m
    where m.group_id = v_placement_group;

    v_group_id := public.create_weekly_league_group(v_tier.tier, v_week_id, v_members);
    v_competitions := public.seed_weekly_competitions(v_group_id);
    v_league_id := (v_competitions->>'LEAGUE')::bigint;
    v_cup_a_id := (v_competitions->>'CUP_A')::bigint;
    v_cup_b_id := (v_competitions->>'CUP_B')::bigint;

    -- 리그 90경기: 라운드 순서대로 105슬롯 중 LEAGUE 타입 슬롯에 1:1 배정.
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

    -- Cup A 시드: 배치 리그 승점 순(단순화 — standings.ts의 완전한 동률
    -- 처리는 대진 시드에는 재현하지 않음).
    select array_agg(slot::text order by points desc, slot asc) into v_seed_a
    from (
      select m.slot,
        coalesce(sum(case
          when f.home_slot = m.slot and f.score_home > f.score_away then 3
          when f.away_slot = m.slot and f.score_away > f.score_home then 3
          when (f.home_slot = m.slot or f.away_slot = m.slot) and f.score_home = f.score_away then 1
          else 0
        end), 0) as points
      from public.weekly_league_members m
      left join public.weekly_fixtures f
        on f.group_id = v_placement_group and f.status = 'played'
        and (f.home_slot = m.slot or f.away_slot = m.slot)
      where m.group_id = v_placement_group
      group by m.slot
    ) ranked;

    -- Cup B 시드: 그룹 id로 결정론적으로 뒤섞은 순서(무작위 추첨 대용).
    select array_agg(slot::text order by md5(v_group_id::text || ':' || slot::text)) into v_seed_b
    from public.weekly_league_members where group_id = v_group_id;

    select jsonb_agg(jsonb_build_object(
      'homeSlot', v_seed_a[i + 1]::int, 'awaySlot', v_seed_a[16 - i]::int,
      'leg1ScheduledAtUtc', (select scheduled_at_utc from public.weekly_schedule_slots
        where week_id = v_week_id and type = 'CUP_A' and cup_stage = 'R16' and leg = 1),
      'leg2ScheduledAtUtc', (select scheduled_at_utc from public.weekly_schedule_slots
        where week_id = v_week_id and type = 'CUP_A' and cup_stage = 'R16' and leg = 2)
    )) into v_a_ties
    from generate_series(0, 7) i;

    select jsonb_agg(jsonb_build_object(
      'homeSlot', v_seed_b[i + 1]::int, 'awaySlot', v_seed_b[16 - i]::int,
      'leg1ScheduledAtUtc', (select scheduled_at_utc from public.weekly_schedule_slots
        where week_id = v_week_id and type = 'CUP_B' and cup_stage = 'R16' and leg = 1),
      'leg2ScheduledAtUtc', (select scheduled_at_utc from public.weekly_schedule_slots
        where week_id = v_week_id and type = 'CUP_B' and cup_stage = 'R16' and leg = 2)
    )) into v_b_ties
    from generate_series(0, 7) i;

    perform public.seed_cup_stage_ties(v_group_id, v_cup_a_id, 'R16', v_a_ties);
    perform public.seed_cup_stage_ties(v_group_id, v_cup_b_id, 'R16', v_b_ties);

    v_created_tiers := v_created_tiers || v_tier.tier;
  end loop;

  return jsonb_build_object('ok', true, 'weekId', v_week_id, 'createdTiers', v_created_tiers);
end $$;

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
  -- 월요일 08:00 KST(첫 경기 한 시간 전)부터는 정산을 기다리지 않는다.
  if p_wait_for_settlement and now() < v_week_start + interval '8 hours' and exists (
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

create extension if not exists pg_net with schema extensions;

create or replace function public.drain_stale_weekly_fixtures()
  returns bigint
  language plpgsql
  security definer
  set search_path = public, extensions
as $$
declare
  v_anon text;
  v_token text;
begin
  select decrypted_secret into v_anon from vault.decrypted_secrets where name = 'anon_key' limit 1;
  select decrypted_secret into v_token from vault.decrypted_secrets where name = 'drain_token' limit 1;
  if v_anon is null or v_token is null then
    return null;
  end if;
  -- 큐가 비어 있으면 호출하지 않는다 — Edge Function 호출 횟수를 아낀다.
  if not exists (select 1 from public.weekly_fixture_stale_queue) then
    return 0;
  end if;
  return net.http_post(
    url := 'https://mpndwtqvwmarkepxzhew.supabase.co/functions/v1/weekly-fixture-live',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_anon,
      'apikey', v_anon,
      'x-drain-token', v_token
    ),
    body := '{"action":"drain_stale"}'::jsonb,
    timeout_milliseconds := 60000
  );
end $$;

revoke all on function public.drain_stale_weekly_fixtures() from public;
revoke all on function public.drain_stale_weekly_fixtures() from authenticated;

select cron.unschedule('drain-stale-weekly-fixtures')
  where exists (select 1 from cron.job where jobname = 'drain-stale-weekly-fixtures');
-- 큐 적재(queue-stale-weekly-fixtures, */5)보다 2분 늦게 돌아 같은 바퀴에 비운다.
select cron.schedule('drain-stale-weekly-fixtures', '2-59/5 * * * *', $$select public.drain_stale_weekly_fixtures()$$);
