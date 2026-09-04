-- 작전카드 (docs/WEEKLY_LIVE_MATCH_DESIGN.md "작전카드", 결정 3번: 새 재화 없음).
--
-- 카드는 아이템(lib/items.ts의 cardAllOutAttack 등)이다. 얻는 길 셋: 상점에서
-- 골드/조각으로, 리그 한 주가 끝났을 때 순위 보상으로, 컵 결승 보상으로.
-- 쓰는 곳은 하나: 경쟁 리그 경기 킥오프 전(입장 창)에서 명령 kind='card'로.
-- 효과는 lib/weeklyLeague/tacticCards.ts가 정하고 재생기가 적용한다.
--
-- 리그·컵 보상 카드는 weekly_rewards에 kind='tactic_card'로 쌓여 골드와 같은
-- "보상 받기"로 수령된다 — amount는 장수, card_id가 어느 카드인지.

alter table public.weekly_fixture_commands drop constraint if exists weekly_fixture_commands_kind_check;
alter table public.weekly_fixture_commands
  add constraint weekly_fixture_commands_kind_check
  check (kind in ('tactic', 'substitution', 'autosub', 'card'));

alter table public.weekly_rewards add column if not exists card_id text;
alter table public.weekly_rewards drop constraint if exists weekly_rewards_kind_check;
alter table public.weekly_rewards
  add constraint weekly_rewards_kind_check
  check (kind in ('match', 'hot_time', 'tactic_card'));
-- 같은 fixture에서 한 유저가 카드 종류별로 한 줄 — 기존 (fixture,user,kind) 유일성은
-- 카드에 맞지 않으므로 card_id를 포함한 유일성으로 바꾼다.
alter table public.weekly_rewards drop constraint if exists weekly_rewards_fixture_id_user_id_kind_key;
create unique index if not exists weekly_rewards_line_idx
  on public.weekly_rewards (fixture_id, user_id, kind, coalesce(card_id, ''));

-- 수령: 골드 합계와 카드 목록을 함께 돌려준다.
create or replace function public.claim_weekly_rewards()
  returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_total bigint;
  v_count int;
  v_cards jsonb;
begin
  if v_user is null then
    return jsonb_build_object('ok', false, 'reason', 'not signed in');
  end if;
  perform pg_advisory_xact_lock(hashtext('weekly_rewards:' || v_user::text));

  with claimed as (
    update public.weekly_rewards
      set claimed_at = now()
      where user_id = v_user and claimed_at is null
      returning kind, amount, card_id
  ),
  gold as (
    select coalesce(sum(amount), 0) as total, count(*) as n from claimed where kind <> 'tactic_card'
  ),
  cards as (
    select coalesce(jsonb_agg(jsonb_build_object('cardId', card_id, 'count', total)), '[]'::jsonb) as list
    from (select card_id, sum(amount) as total from claimed where kind = 'tactic_card' group by card_id) c
  )
  select gold.total, gold.n, cards.list into v_total, v_count, v_cards from gold, cards;

  if v_total > 0 then
    insert into public.gold_ledger (user_id, delta, reason, ref)
    values (v_user, v_total, 'weekly', 'claim:' || now()::text);
  end if;

  return jsonb_build_object('ok', true, 'amount', v_total, 'lines', v_count, 'cards', v_cards);
end $$;

revoke all on function public.claim_weekly_rewards() from public;
grant execute on function public.claim_weekly_rewards() to authenticated;

-- 리그 주 종료·컵 결승 카드 보상. 5분 cron.
-- 카드 종류는 lib/weeklyLeague/tacticCards.ts의 id 셋과 같아야 한다 — 바뀌면 여기도.
create or replace function public.grant_weekly_card_rewards()
  returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_cards text[] := array['cardAllOutAttack', 'cardCalmDefence', 'cardQuickCounter'];
  v_league record;
  v_rank record;
  v_last_fixture bigint;
  v_count int;
  v_card text;
  v_league_grants int := 0;
  v_cup_grants int := 0;
  v_final record;
begin
  -- 1) 리그: 그 그룹의 리그 fixture가 전부 played이고 아직 카드 보상이 없으면.
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

    -- 승점 순(단순화, bootstrap과 같은 방식) — 1위 3장, 2·3위 2장, 나머지 실유저 1장.
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
      v_card := v_cards[1 + (('x' || left(md5('league:' || v_league.competition_id::text || ':' || v_rank.user_id::text), 8))::bit(32)::int & 2147483647) % 3];
      insert into public.weekly_rewards (user_id, fixture_id, group_id, kind, amount, card_id)
      values (v_rank.user_id, v_last_fixture, v_league.group_id, 'tactic_card', v_count, v_card)
      on conflict do nothing;
      v_league_grants := v_league_grants + 1;
    end loop;
  end loop;

  -- 2) 컵 결승: 승자 2장, 준우승 1장 (실유저만).
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
      v_card := v_cards[1 + (('x' || left(md5('cup:' || v_final.tie_id::text || ':' || v_rank.user_id::text), 8))::bit(32)::int & 2147483647) % 3];
      insert into public.weekly_rewards (user_id, fixture_id, group_id, kind, amount, card_id)
      values (v_rank.user_id, v_final.fixture_id, v_final.group_id, 'tactic_card', v_rank.cnt, v_card)
      on conflict do nothing;
      v_cup_grants := v_cup_grants + 1;
    end loop;
  end loop;

  return jsonb_build_object('ok', true, 'leagueGrants', v_league_grants, 'cupGrants', v_cup_grants);
end $$;

revoke all on function public.grant_weekly_card_rewards() from public;
revoke all on function public.grant_weekly_card_rewards() from authenticated;
grant execute on function public.grant_weekly_card_rewards() to service_role;

select cron.unschedule('grant-weekly-card-rewards')
  where exists (select 1 from cron.job where jobname = 'grant-weekly-card-rewards');
select cron.schedule('grant-weekly-card-rewards', '*/5 * * * *', $$select public.grant_weekly_card_rewards()$$);
