-- 컵 진행기 — 16강 이후를 채운다.
--
-- 정규 시즌 생성(auto_bootstrap_regular_season)은 Cup A/B의 16강 타이만
-- 만들고, 그 뒤(2차전 합산 → 승자 → 8강·4강·결승 대진 → Masters Final)는
-- 아무도 하지 않았다. 이대로면 화요일 16강이 끝나도 목요일 8강 fixture가
-- 없다. 규칙은 lib/weeklyLeague/cup.ts · mastersFinal.ts의 순수 함수를 그대로
-- 옮겼다(원정 다득점 없음, 다음 라운드는 승자 i 대 승자 n-1-i, Masters
-- Final은 Cup A 우승 대 Cup B 우승, 같은 구단이면 두 컵 합산 성적 차점자).
--
-- 한 가지 근사치: 합산 동점(결승은 90분 동점)일 때 연장·승부차기를 엔진이
-- 아직 시뮬레이션하지 않으므로, 타이 id로 결정론적 승부차기(md5 홀짝)를
-- 쓰고 decided_by='PENALTIES'로 남긴다. 엔진에 연장전이 생기면 이 자리만
-- 바꾼다.

create or replace function public.advance_weekly_cups()
  returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_tie record;
  v_agg_home int;
  v_agg_away int;
  v_winner smallint;
  v_decided text;
  v_decided_ties int := 0;
  v_stage record;
  v_next text;
  v_winners smallint[];
  v_n int;
  v_ties jsonb;
  v_leg1 timestamptz;
  v_leg2 timestamptz;
  v_seeded_stages int := 0;
  v_group record;
  v_champ_a smallint;
  v_champ_b smallint;
  v_home smallint;
  v_away smallint;
  v_masters_comp bigint;
  v_masters_at timestamptz;
  v_masters int := 0;
begin
  -- 1) 끝난 타이의 승자를 정한다.
  for v_tie in
    select t.id, t.stage, t.home_slot, t.away_slot, t.competition_id,
           f1.score_home as l1_home, f1.score_away as l1_away, f1.status as l1_status,
           f2.score_home as l2_home, f2.score_away as l2_away, f2.status as l2_status
    from public.weekly_cup_ties t
    join public.weekly_fixtures f1 on f1.id = t.first_leg_fixture_id
    left join public.weekly_fixtures f2 on f2.id = t.second_leg_fixture_id
    where t.winner_slot is null
      and f1.status = 'played'
      and (t.stage = 'FINAL' or f2.status = 'played')
  loop
    if v_tie.stage = 'FINAL' then
      v_agg_home := v_tie.l1_home;
      v_agg_away := v_tie.l1_away;
      v_decided := 'REGULATION';
    else
      -- 2차전은 홈/원정이 뒤바뀌어 있다: 명목 홈의 합산 = 1차전 홈 득점 + 2차전 원정 득점.
      v_agg_home := v_tie.l1_home + v_tie.l2_away;
      v_agg_away := v_tie.l1_away + v_tie.l2_home;
      v_decided := 'AGGREGATE';
    end if;

    if v_agg_home > v_agg_away then
      v_winner := v_tie.home_slot;
    elsif v_agg_away > v_agg_home then
      v_winner := v_tie.away_slot;
    else
      -- 연장·승부차기 근사치: 타이 id 기반 결정론적 홀짝.
      v_winner := case when ('x' || left(md5('cup-tie:' || v_tie.id::text), 8))::bit(32)::int % 2 = 0
                       then v_tie.home_slot else v_tie.away_slot end;
      v_decided := 'PENALTIES';
    end if;

    update public.weekly_cup_ties
      set aggregate_home_score = v_agg_home,
          aggregate_away_score = v_agg_away,
          winner_slot = v_winner,
          decided_by = v_decided
      where id = v_tie.id;
    v_decided_ties := v_decided_ties + 1;
  end loop;

  -- 2) 한 스테이지가 다 끝났고 다음 스테이지 타이가 없으면 만든다.
  for v_stage in
    select c.id as competition_id, c.group_id, c.type, g.week_id, t.stage,
           count(*) as ties, count(t.winner_slot) as decided
    from public.weekly_cup_ties t
    join public.weekly_competitions c on c.id = t.competition_id
    join public.weekly_league_groups g on g.id = c.group_id
    where c.type in ('CUP_A', 'CUP_B') and t.stage <> 'FINAL'
    group by c.id, c.group_id, c.type, g.week_id, t.stage
    having count(*) = count(t.winner_slot)
  loop
    v_next := case v_stage.stage when 'R16' then 'QF' when 'QF' then 'SF' when 'SF' then 'FINAL' end;
    if v_next is null then continue; end if;
    if exists (select 1 from public.weekly_cup_ties where competition_id = v_stage.competition_id and stage = v_next) then
      continue;
    end if;

    -- 승자를 타이 순서대로: 다음 라운드는 i 대 n-1-i (cup.ts advanceStageIfDone).
    select array_agg(winner_slot order by id) into v_winners
      from public.weekly_cup_ties
      where competition_id = v_stage.competition_id and stage = v_stage.stage;
    v_n := coalesce(array_length(v_winners, 1), 0);
    if v_n < 2 then continue; end if;

    select scheduled_at_utc into v_leg1 from public.weekly_schedule_slots
      where week_id = v_stage.week_id and type = v_stage.type and cup_stage = v_next
        and (leg = 1 or (v_next = 'FINAL' and leg is null)) limit 1;
    select scheduled_at_utc into v_leg2 from public.weekly_schedule_slots
      where week_id = v_stage.week_id and type = v_stage.type and cup_stage = v_next and leg = 2 limit 1;
    if v_leg1 is null then continue; end if;

    select jsonb_agg(jsonb_build_object(
      'homeSlot', v_winners[i + 1], 'awaySlot', v_winners[v_n - i],
      'leg1ScheduledAtUtc', v_leg1, 'leg2ScheduledAtUtc', v_leg2
    )) into v_ties
    from generate_series(0, v_n / 2 - 1) i;

    perform public.seed_cup_stage_ties(v_stage.group_id, v_stage.competition_id, v_next, v_ties);
    v_seeded_stages := v_seeded_stages + 1;
  end loop;

  -- 3) 두 컵 결승이 끝난 그룹에 Masters Final fixture를 만든다.
  for v_group in
    select g.id as group_id, g.week_id,
           ca.id as cup_a_id, cb.id as cup_b_id, mf.id as masters_id
    from public.weekly_league_groups g
    join public.weekly_competitions ca on ca.group_id = g.id and ca.type = 'CUP_A'
    join public.weekly_competitions cb on cb.group_id = g.id and cb.type = 'CUP_B'
    join public.weekly_competitions mf on mf.group_id = g.id and mf.type = 'MASTERS_FINAL'
    where not exists (select 1 from public.weekly_fixtures f where f.competition_id = mf.id)
  loop
    select winner_slot into v_champ_a from public.weekly_cup_ties
      where competition_id = v_group.cup_a_id and stage = 'FINAL' and winner_slot is not null;
    select winner_slot into v_champ_b from public.weekly_cup_ties
      where competition_id = v_group.cup_b_id and stage = 'FINAL' and winner_slot is not null;
    if v_champ_a is null or v_champ_b is null then continue; end if;

    select scheduled_at_utc into v_masters_at from public.weekly_schedule_slots
      where week_id = v_group.week_id and type = 'MASTERS_FINAL' limit 1;
    if v_masters_at is null then continue; end if;
    v_masters_comp := v_group.masters_id;

    if v_champ_a <> v_champ_b then
      v_home := v_champ_a;
      v_away := v_champ_b;
    else
      -- 같은 구단이 두 컵을 다 이겼다: 나머지 중 두 컵 합산 성적 차점자.
      -- 이긴 라운드 수 → 두 컵 합산 골득실 → 합산 득점 → 슬롯 번호(고정 시드).
      v_home := v_champ_a;
      select slot into v_away from (
        select m.slot,
          (select count(*) from public.weekly_cup_ties t
             where t.competition_id in (v_group.cup_a_id, v_group.cup_b_id) and t.winner_slot = m.slot) as rounds_won,
          coalesce((select sum(case when f.home_slot = m.slot then f.score_home - f.score_away else f.score_away - f.score_home end)
             from public.weekly_fixtures f
             where f.competition_id in (v_group.cup_a_id, v_group.cup_b_id) and f.status = 'played'
               and (f.home_slot = m.slot or f.away_slot = m.slot)), 0) as gd,
          coalesce((select sum(case when f.home_slot = m.slot then f.score_home else f.score_away end)
             from public.weekly_fixtures f
             where f.competition_id in (v_group.cup_a_id, v_group.cup_b_id) and f.status = 'played'
               and (f.home_slot = m.slot or f.away_slot = m.slot)), 0) as gf
        from public.weekly_league_members m
        where m.group_id = v_group.group_id and m.slot <> v_champ_a
        order by rounds_won desc, gd desc, gf desc, m.slot asc
        limit 1
      ) r;
    end if;

    insert into public.weekly_fixtures
      (group_id, competition_id, neutral_venue, home_slot, away_slot, scheduled_at_utc)
    values (v_group.group_id, v_masters_comp, true, v_home, v_away, v_masters_at);
    v_masters := v_masters + 1;
  end loop;

  return jsonb_build_object('ok', true, 'decidedTies', v_decided_ties, 'seededStages', v_seeded_stages, 'mastersFinals', v_masters);
end $$;

revoke all on function public.advance_weekly_cups() from public;
revoke all on function public.advance_weekly_cups() from authenticated;
grant execute on function public.advance_weekly_cups() to service_role;

-- 정산 cron과 같은 주기. 2차전이 정산되고 5분 안에 다음 라운드가 생긴다 —
-- 8강 1차전은 이틀 뒤(목요일)라 여유가 충분하다.
select cron.unschedule('advance-weekly-cups')
  where exists (select 1 from cron.job where jobname = 'advance-weekly-cups');
select cron.schedule('advance-weekly-cups', '*/5 * * * *', $$select public.advance_weekly_cups()$$);
