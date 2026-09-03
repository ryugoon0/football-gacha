-- 개막 배치 리그 실유저 후보에서 운영자 계정을 빼던 조건을 없앤다.
--
-- 지금 저장된 진행 기록(saves)이 있는 계정이 운영자 본인(테스트 계정)뿐이라,
-- "관리자 제외" 조건 때문에 실유저 후보가 0명이 되어 그룹 자체가 계속
-- 안 만들어지고 있었다(주간리그 탭에 "아직 배정되지 않았습니다"만 뜨는 원인).
-- 운영자도 자기 게임을 플레이하는 실유저이므로 제외할 이유가 없다.
create or replace function public.auto_bootstrap_placement_leagues()
  returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare
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
      where not (s.user_id = any(v_assigned_user_ids))
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

-- 다음 10분 크론을 기다리지 않고 지금 바로 한 번 돌린다.
select public.auto_bootstrap_placement_leagues();
