-- 신규 가입자 편입 — 두 가지 이유로 새 계정이 리그에 들어오지 못하고 있었다.
--
-- 1) sweep_new_users_into_placement() 가 week_id 를 'placement-2026-09-04' 로 박아 두어
--    다음 주(정규 시즌)부터는 아무도 편입하지 못한다.
-- 2) "한 경기도 안 치른 AI 자리"만 넘겨줬는데, 주가 며칠 지나면 그런 자리가 없다.
--    → 가입하고 며칠째 어느 리그에도 없는 계정이 생겼다(2026-09-05 기준 3명).
--
-- 고침: 진행 중인 가장 최근 주를 대상으로, 실유저 상한 안에서 **경기를 가장 적게 치른
-- AI 자리**를 넘겨준다. 그 자리의 이미 치른 경기 결과는 그대로 이어받는다(배치 리그의
-- 성격상 허용 — 가입 시점에 따라 몇 경기는 AI 성적으로 시작한다). 낮은 등급부터 채우지
-- 않고 기존처럼 등급 순(0등급 먼저)으로 상한까지 채운다 — 상한은 weekly_tier_rules.
-- 운영자 화면에서 미배정 계정을 보고 즉시 편입할 수 있는 RPC 도 함께 둔다.

create or replace function public.current_weekly_week_id()
  returns text
  language sql
  stable
  security definer
  set search_path = public
as $$
  select g.week_id
  from public.weekly_league_groups g
  where g.status <> 'finished'
  order by g.id desc
  limit 1;
$$;

revoke all on function public.current_weekly_week_id() from public;
grant execute on function public.current_weekly_week_id() to authenticated;

create or replace function public.sweep_new_users_into_placement()
  returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_week_id text := public.current_weekly_week_id();
  v_group record;
  v_candidate record;
  v_ai_slot smallint;
  v_current_real int;
  v_swapped int := 0;
begin
  if v_week_id is null then
    return jsonb_build_object('ok', false, 'reason', 'no active week');
  end if;
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
      -- Only accounts that can actually field a team: a save with eleven starters.
      select s.user_id, s.data->>'club' as club_name
      from public.saves s
      where (select count(*) from jsonb_each_text(coalesce(s.data->'squad'->'slots', '{}'::jsonb)) e
             where e.value is not null and e.value <> 'null') >= 11
        and not exists (
          select 1 from public.weekly_league_members m
          join public.weekly_league_groups g2 on g2.id = m.group_id
          where g2.week_id = v_week_id and m.kind = 'user' and m.user_id = s.user_id
        )
      order by s.updated_at desc
    loop
      exit when v_current_real >= v_group.max_real_users;

      -- The AI slot with the fewest matches already played — its record carries over.
      select m.slot into v_ai_slot
      from public.weekly_league_members m
      where m.group_id = v_group.group_id and m.kind = 'ai'
      order by (
        select count(*) from public.weekly_fixtures f
        where f.group_id = v_group.group_id and f.status = 'played'
          and (f.home_slot = m.slot or f.away_slot = m.slot)
      ), m.slot
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

  return jsonb_build_object('ok', true, 'week', v_week_id, 'swapped', v_swapped);
end $$;

revoke all on function public.sweep_new_users_into_placement() from public;
revoke all on function public.sweep_new_users_into_placement() from authenticated;
grant execute on function public.sweep_new_users_into_placement() to service_role;

-- 운영자: 지금 편입 + 아직 어느 진행 중인 리그에도 없는 계정 목록.
create or replace function public.admin_sweep_new_users()
  returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  if not public.is_admin() then
    return jsonb_build_object('ok', false, 'reason', 'not admin');
  end if;
  return public.sweep_new_users_into_placement();
end $$;

revoke all on function public.admin_sweep_new_users() from public;
grant execute on function public.admin_sweep_new_users() to authenticated;

create or replace function public.unplaced_users_for_admin()
  returns table (user_id uuid, email text, club text, created_at timestamptz, has_save boolean, starters int, last_seen_at timestamptz)
  language sql
  stable
  security definer
  set search_path = public
as $$
  select u.id, u.email::text,
         coalesce(s.data->>'club', u.raw_user_meta_data->>'club', '') as club,
         u.created_at,
         s.user_id is not null as has_save,
         coalesce((select count(*)::int from jsonb_each_text(coalesce(s.data->'squad'->'slots', '{}'::jsonb)) e
                   where e.value is not null and e.value <> 'null'), 0) as starters,
         s.updated_at
  from auth.users u
  left join public.saves s on s.user_id = u.id
  where public.is_admin()
    and not exists (
      select 1 from public.weekly_league_members m
      join public.weekly_league_groups g on g.id = m.group_id
      where m.user_id = u.id and g.status <> 'finished'
    )
  order by u.created_at desc
  limit 100;
$$;

revoke all on function public.unplaced_users_for_admin() from public;
grant execute on function public.unplaced_users_for_admin() to authenticated;

-- 지금 기다리는 세 계정을 바로 넣는다.
select public.sweep_new_users_into_placement();
