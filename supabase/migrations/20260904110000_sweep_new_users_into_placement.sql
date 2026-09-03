-- 배치 리그가 이미 만들어진 뒤에 가입한(또는 뒤늦게 처음 저장한) 실유저를
-- 계속 쓸어담는다. 라운드로빈 대진표(weekly_placement_fixture_template)는
-- 16개 "슬롯 번호"를 고정 전제로 이미 짜여 있어서 그룹에 17번째 자리를
-- 새로 만들 수는 없다 — 대신 아직 한 경기도 안 치른 AI 슬롯을 실유저로
-- 바꿔치기한다. fixture는 슬롯 번호로만 연결돼 있어 이 슬롯의 소유자
-- 정보(weekly_league_members)만 바꾸면 대진표는 그대로 유효하다.
--
-- 안전장치:
-- 1. 이미 경기를 한 번이라도 치른 슬롯은 손대지 않는다 — 지나간 결과가
--    갑자기 다른 사람 전적으로 둔갑하면 안 되기 때문이다.
-- 2. 이번 주 이미 어느 그룹에든 실유저로 들어가 있는 사람은 다시 후보에
--    넣지 않는다 — "자동 배치도 중복 선수를 넣지 않게" 요구사항.
-- 3. advisory lock으로 동시 실행 시 같은 슬롯을 두 명이 동시에 차지하는
--    경합을 막는다.
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
  perform pg_advisory_xact_lock(hashtext('sweep_placement:' || v_week_id));

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
      -- Zero-played AI slots in this group, lowest slot number first.
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

      -- No room left in this group — move on to the next tier's group.
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

revoke all on function public.sweep_new_users_into_placement() from public;
revoke all on function public.sweep_new_users_into_placement() from authenticated;
grant execute on function public.sweep_new_users_into_placement() to service_role;

-- 기존 auto-bootstrap-placement 크론(10분마다)에 그대로 얹는다 — 새 크론을
-- 하나 더 만들지 않고, "등급 그룹 만들기" 다음에 "빈 자리 쓸어담기"를
-- 이어서 하게 한다.
select cron.unschedule('auto-bootstrap-placement')
  where exists (select 1 from cron.job where jobname = 'auto-bootstrap-placement');

select cron.schedule(
  'auto-bootstrap-placement',
  '*/10 * * * *',
  $$select public.auto_bootstrap_placement_leagues(); select public.sweep_new_users_into_placement();$$
);

-- 다음 크론을 기다리지 않고 지금 한 번 돌린다.
select public.sweep_new_users_into_placement();
