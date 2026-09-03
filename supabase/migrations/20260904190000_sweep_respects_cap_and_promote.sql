-- 0) 0등급은 실유저 상한을 두지 않는다 — 그룹 정원(16)이 자연스러운
--    물리적 한계이므로 그 값을 그대로 상한으로 쓴다.
--    lib/weeklyLeague/config.ts의 TIERS와 반드시 같은 값을 유지해야 한다.
update public.weekly_tier_rules set max_real_users = 16 where tier = 0;

-- 1) sweep_new_users_into_placement()가 등급별 실유저 상한(max_real_users)을
--    확인하지 않고 있었다 — AI 슬롯만 있으면 상한을 넘겨서라도 계속
--    실유저로 바꿔치기했다(0등급이 상한 8명인데 이미 10명까지 들어간
--    원인). 상한을 확인하도록 고친다.
create or replace function public.sweep_new_users_into_placement()
  returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_week_id text := 'placement-2026-09-04';
  v_group record;
  v_candidate record;
  v_ai_slot smallint;
  v_current_real int;
  v_swapped int := 0;
begin
  perform pg_advisory_xact_lock(hashtext('auto_bootstrap_placement:' || v_week_id));

  for v_group in
    select g.id as group_id, g.tier, r.ai_base_rating, r.max_real_users
    from public.weekly_league_groups g
    join public.weekly_tier_rules r on r.tier = g.tier
    where g.week_id = v_week_id
    order by g.tier
  loop
    select count(*) into v_current_real
    from public.weekly_league_members m
    where m.group_id = v_group.group_id and m.kind = 'user';

    for v_candidate in
      select s.user_id, s.data->>'club' as club_name
      from public.saves s
      where not exists (
        select 1 from public.weekly_league_members m
        join public.weekly_league_groups g2 on g2.id = m.group_id
        where g2.week_id = v_week_id and m.kind = 'user' and m.user_id = s.user_id
      )
      order by s.user_id
    loop
      exit when v_current_real >= v_group.max_real_users;

      select m.slot into v_ai_slot
      from public.weekly_league_members m
      where m.group_id = v_group.group_id and m.kind = 'ai'
        and not exists (
          select 1 from public.weekly_fixtures f
          where f.group_id = v_group.group_id
            and f.status = 'played'
            and (f.home_slot = m.slot or f.away_slot = m.slot)
        )
      order by m.slot
      limit 1;

      exit when v_ai_slot is null;

      update public.weekly_league_members
        set kind = 'user',
            user_id = v_candidate.user_id,
            club_name = coalesce(nullif(trim(v_candidate.club_name), ''), '유저클럽'),
            rating = v_group.ai_base_rating + 5
        where group_id = v_group.group_id and slot = v_ai_slot;

      v_current_real := v_current_real + 1;
      v_swapped := v_swapped + 1;
    end loop;
  end loop;

  return jsonb_build_object('ok', true, 'swapped', v_swapped);
end $$;

-- 2) 1등급에 혼자 있던 실유저를 0등급으로 올리고, 0등급 AI 한 팀을
--    1등급으로 내린다 — 사람 수는 그대로 두고 자리만 맞바꾼다. 아직
--    한 경기도 안 치른 슬롯끼리만 교환한다.
do $$
declare
  v_week_id text := 'placement-2026-09-04';
  v_tier0_group bigint;
  v_tier1_group bigint;
  v_tier1_ai_rating smallint;
  v_lone_user record;
  v_ai_slot record;
begin
  select id into v_tier0_group from public.weekly_league_groups where week_id = v_week_id and tier = 0;
  select id into v_tier1_group from public.weekly_league_groups where week_id = v_week_id and tier = 1;
  select ai_base_rating into v_tier1_ai_rating from public.weekly_tier_rules where tier = 1;

  select slot, user_id, club_name into v_lone_user
    from public.weekly_league_members
    where group_id = v_tier1_group and kind = 'user'
    limit 1;

  if v_lone_user.slot is null then
    raise notice 'no real user found in tier 1, nothing to promote';
    return;
  end if;

  select slot, club_name, badge into v_ai_slot
    from public.weekly_league_members m
    where m.group_id = v_tier0_group and m.kind = 'ai'
      and not exists (
        select 1 from public.weekly_fixtures f
        where f.group_id = v_tier0_group and f.status = 'played'
          and (f.home_slot = m.slot or f.away_slot = m.slot)
      )
    order by m.slot
    limit 1;

  if v_ai_slot.slot is null then
    raise notice 'no swappable AI slot in tier 0, promotion skipped';
    return;
  end if;

  -- 0등급의 그 AI 자리에 1등급 유저를 앉힌다.
  update public.weekly_league_members
    set kind = 'user', user_id = v_lone_user.user_id,
        club_name = coalesce(nullif(trim(v_lone_user.club_name), ''), '유저클럽')
    where group_id = v_tier0_group and slot = v_ai_slot.slot;

  -- 1등급의 빈 자리는 그 AI 클럽이 그대로 내려와 채운다(같은 팀이 강등된 것처럼).
  update public.weekly_league_members
    set kind = 'ai', user_id = null,
        club_name = v_ai_slot.club_name, badge = v_ai_slot.badge, rating = v_tier1_ai_rating
    where group_id = v_tier1_group and slot = v_lone_user.slot;
end $$;
