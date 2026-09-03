-- sweep_new_users_into_placement()이 auto_bootstrap_placement_leagues()와
-- 다른 advisory lock 키를 쓰고 있었다 — 서로 다른 키는 서로를 막지 못하므로,
-- 두 함수가 정말로 동시에(수동 호출 등으로) 실행되면 같은 신규 유저가
-- 두 함수에 각각 "아직 미배정"으로 보여서 두 곳에 동시에 배정될 여지가
-- 이론상 있었다. "자동 배치도 중복 선수를 넣지 않게" 요구사항에 맞춰
-- 같은 락 키를 쓰게 해서 항상 서로를 배제하게 한다.
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
  v_swapped int := 0;
begin
  perform pg_advisory_xact_lock(hashtext('auto_bootstrap_placement:' || v_week_id));

  for v_group in
    select g.id as group_id, g.tier, r.ai_base_rating
    from public.weekly_league_groups g
    join public.weekly_tier_rules r on r.tier = g.tier
    where g.week_id = v_week_id
    order by g.tier
  loop
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

      v_swapped := v_swapped + 1;
    end loop;
  end loop;

  return jsonb_build_object('ok', true, 'swapped', v_swapped);
end $$;
