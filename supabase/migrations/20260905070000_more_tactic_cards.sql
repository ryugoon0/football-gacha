-- 작전카드 8종으로 확대 — 리그·컵 보상 카드 추첨 목록을 lib/weeklyLeague/
-- tacticCards.ts의 id 셋과 다시 맞춘다(그 파일이 바뀌면 여기도).
create or replace function public.grant_weekly_card_rewards()
  returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_cards text[] := array[
    'cardAllOutAttack', 'cardCalmDefence', 'cardQuickCounter', 'cardHighPress',
    'cardWingOverload', 'cardMidfieldControl', 'cardLongBall', 'cardParkTheBus'
  ];
  v_n int := 8;
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
    where c.type = 'LEAGUE'
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
