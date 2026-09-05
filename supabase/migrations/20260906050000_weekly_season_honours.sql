-- 주간 시즌 마감 — 순위·컵·마스터스 보상, 베스트 일레븐, 개인상, 명예 기록.
--
-- 경쟁 리그의 한 주가 한 시즌이다. 지금까지는 경기마다 골드가 쌓이고 카드 보상만
-- 주 종료에 나갔다(grant_weekly_card_rewards). 이 마이그레이션은 그 위에
-- "시즌 보상"을 얹는다:
--
--   1) weekly_player_ratings — 엔진으로 정산된 경기마다 선발 전원의 평점을 적는다
--      (commit_weekly_fixture_result의 새 인자 p_ratings, lib/weeklyLeague/
--      liveReplay.ts ratingsOf). 베스트 일레븐과 MVP왕의 원천.
--   2) weekly_best_eleven(group) — 그 그룹의 이번 주 베스트 일레븐(4-3-3).
--      lib/weeklyLeague/rewards.ts의 규칙을 그대로 옮겼다: 3경기 이상 출전,
--      평점을 6.0 쪽으로 가상 6경기만큼 당겨(shrinkage) 정렬, GK1·DF4·MF3·FW3,
--      모자라는 줄은 나머지 최고점으로 채운다. 클라이언트도 이 함수로 "현재
--      기준 베스트 일레븐"을 본다.
--   3) close_weekly_groups() — 10분 cron. 마지막 슬롯(일요일 23시 마스터스)이
--      지나고 pending이 없는 정규 주 그룹을 마감한다: 순위 1~16 보상, Cup A/B
--      우승·준우승, 마스터스 우승, 베스트 일레븐(보유 감독에게 선수당), 득점왕·
--      도움왕·MVP왕 보유 감독 보상을 weekly_rewards에 넣고(기존 "보상 받기"로
--      수령), 같은 사실을 weekly_honours에 남긴다. 그룹 status='finished'.
--
-- 금액 공식은 lib/weeklyLeague/rewards.ts(seasonAmount)와 같다:
--   knob(0등급 기준) × weeklyTierMultiplier<tier> × competitiveGoldMultiplier.
-- knob 값은 game_config에서 읽고 없으면 lib/tuning.ts의 기본값을 쓴다 — 두 곳의
-- 기본값이 어긋나면 운영자 화면의 미리보기와 실제 지급이 달라지니 같이 고친다.

-- ---------------------------------------------------------------------------
-- 1) 선발 평점 기록
-- ---------------------------------------------------------------------------
create table if not exists public.weekly_player_ratings (
  id          bigserial primary key,
  fixture_id  bigint not null references public.weekly_fixtures(id) on delete cascade,
  group_id    bigint not null references public.weekly_league_groups(id) on delete cascade,
  slot        smallint not null check (slot between 0 and 15),
  player_id   text not null,
  player_name text not null,
  position    text not null default '',
  rating      numeric(3,1) not null check (rating between 0 and 10),
  goals       smallint not null default 0 check (goals between 0 and 30),
  assists     smallint not null default 0 check (assists between 0 and 30),
  unique (fixture_id, slot, player_id)
);
create index if not exists weekly_player_ratings_group_idx on public.weekly_player_ratings (group_id, slot, player_id);

alter table public.weekly_player_ratings enable row level security;
drop policy if exists "ratings are readable" on public.weekly_player_ratings;
create policy "ratings are readable" on public.weekly_player_ratings
  for select to authenticated using (true);

drop function if exists public.commit_weekly_fixture_result(bigint, int, int, jsonb, text, text, jsonb, jsonb, jsonb, jsonb);

create or replace function public.commit_weekly_fixture_result(
  p_fixture_id     bigint,
  p_score_home     int,
  p_score_away     int,
  p_events         jsonb,
  p_seed           text,
  p_engine_version text,
  p_rewards        jsonb default '[]'::jsonb,
  p_scorers        jsonb default '[]'::jsonb,
  p_discipline     jsonb default '[]'::jsonb,
  p_mvp            jsonb default null,
  p_ratings        jsonb default '[]'::jsonb
) returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_updated int;
  v_group bigint;
  v_line jsonb;
  v_home_slot smallint;
  v_away_slot smallint;
  v_yellows int;
  v_ban int;
begin
  perform pg_advisory_xact_lock(hashtext('weekly_fixture:' || p_fixture_id::text));

  update public.weekly_fixtures
    set score_home = p_score_home,
        score_away = p_score_away,
        events = p_events,
        simulation_seed = p_seed,
        engine_version = p_engine_version,
        settlement_engine = 'match',
        status = 'played',
        settled_at = now(),
        mvp_slot = nullif(p_mvp->>'slot', '')::smallint,
        mvp_player_id = p_mvp->>'playerId',
        mvp_player_name = left(p_mvp->>'name', 40),
        mvp_rating = nullif(p_mvp->>'rating', '')::numeric(3,1)
    where id = p_fixture_id and status = 'pending'
    returning group_id, home_slot, away_slot into v_group, v_home_slot, v_away_slot;
  get diagnostics v_updated = row_count;

  delete from public.weekly_fixture_stale_queue where fixture_id = p_fixture_id;

  if v_updated = 1 then
    for v_line in select * from jsonb_array_elements(coalesce(p_rewards, '[]'::jsonb))
    loop
      insert into public.weekly_rewards (user_id, fixture_id, group_id, kind, amount)
      values ((v_line->>'userId')::uuid, p_fixture_id, v_group, v_line->>'kind', (v_line->>'amount')::int)
      on conflict do nothing;
    end loop;

    for v_line in select * from jsonb_array_elements(coalesce(p_scorers, '[]'::jsonb))
    loop
      insert into public.weekly_goal_scorers (fixture_id, group_id, slot, player_id, player_name, goals, assists)
      values (p_fixture_id, v_group, (v_line->>'slot')::smallint, v_line->>'playerId',
              left(coalesce(v_line->>'name', '선수'), 40),
              greatest(0, least(30, coalesce((v_line->>'goals')::int, 0))),
              greatest(0, least(30, coalesce((v_line->>'assists')::int, 0))))
      on conflict do nothing;
    end loop;

    for v_line in select * from jsonb_array_elements(coalesce(p_ratings, '[]'::jsonb))
    loop
      insert into public.weekly_player_ratings (fixture_id, group_id, slot, player_id, player_name, position, rating, goals, assists)
      values (p_fixture_id, v_group, (v_line->>'slot')::smallint, v_line->>'playerId',
              left(coalesce(v_line->>'name', '선수'), 40),
              left(coalesce(v_line->>'position', ''), 8),
              greatest(0, least(10, coalesce((v_line->>'rating')::numeric, 0))),
              greatest(0, least(30, coalesce((v_line->>'goals')::int, 0))),
              greatest(0, least(30, coalesce((v_line->>'assists')::int, 0))))
      on conflict do nothing;
    end loop;
  end if;

  if v_updated = 1 then
    update public.weekly_discipline
      set ban_matches = ban_matches - 1, updated_at = now()
      where group_id = v_group and slot in (v_home_slot, v_away_slot) and ban_matches > 0;

    for v_line in select * from jsonb_array_elements(coalesce(p_discipline, '[]'::jsonb))
    loop
      insert into public.weekly_discipline (group_id, slot, player_id, player_name)
      values (v_group, (v_line->>'slot')::smallint, v_line->>'playerId', left(coalesce(v_line->>'name', '선수'), 40))
      on conflict (group_id, slot, player_id) do nothing;

      select yellows, ban_matches into v_yellows, v_ban from public.weekly_discipline
        where group_id = v_group and slot = (v_line->>'slot')::smallint and player_id = v_line->>'playerId';

      if coalesce((v_line->>'red')::boolean, false) then
        v_ban := greatest(v_ban, case when coalesce((v_line->>'secondYellow')::boolean, false) then 1
                                      else 1 + floor(random() * 3)::int end);
      else
        v_yellows := v_yellows + greatest(0, coalesce((v_line->>'yellows')::int, 0));
        if v_yellows >= 4 then
          v_ban := greatest(v_ban, 1);
          v_yellows := 0;
        end if;
      end if;

      update public.weekly_discipline
        set yellows = v_yellows, ban_matches = v_ban, updated_at = now()
        where group_id = v_group and slot = (v_line->>'slot')::smallint and player_id = v_line->>'playerId';
    end loop;
  end if;

  return jsonb_build_object('ok', v_updated = 1, 'alreadySettled', v_updated = 0);
end $$;

revoke all on function public.commit_weekly_fixture_result(bigint, int, int, jsonb, text, text, jsonb, jsonb, jsonb, jsonb, jsonb) from public;
revoke all on function public.commit_weekly_fixture_result(bigint, int, int, jsonb, text, text, jsonb, jsonb, jsonb, jsonb, jsonb) from authenticated;
grant execute on function public.commit_weekly_fixture_result(bigint, int, int, jsonb, text, text, jsonb, jsonb, jsonb, jsonb, jsonb) to service_role;

-- ---------------------------------------------------------------------------
-- 2) 베스트 일레븐
-- ---------------------------------------------------------------------------
create or replace function public._weekly_position_line(p_position text)
  returns text
  language sql
  immutable
as $$
  select case
    when p_position = 'GK' then 'GK'
    when p_position in ('CB', 'LB', 'RB', 'LWB', 'RWB', 'SW') then 'DF'
    when p_position in ('CDM', 'CM', 'CAM', 'LM', 'RM', 'DM', 'AM') then 'MF'
    else 'FW'
  end
$$;

-- 이번 주 그룹의 베스트 일레븐. 반환 순서는 GK → DF → MF → FW, 줄 안에서는 점수 순.
-- score = (평점 합 + 6.0 × 6) / (출전 + 6)  — lib/weeklyLeague/rewards.ts bestElevenScore.
create or replace function public.weekly_best_eleven(p_group_id bigint)
  returns jsonb
  language sql
  stable
  security definer
  set search_path = public
as $$
  with totals as (
    select r.slot, r.player_id,
           max(r.player_name) as player_name,
           mode() within group (order by r.position) as position,
           count(*) as apps,
           sum(r.rating) as rating_sum,
           avg(r.rating) as avg_rating,
           sum(r.goals) as goals,
           sum(r.assists) as assists
    from public.weekly_player_ratings r
    where r.group_id = p_group_id
    group by r.slot, r.player_id
    having count(*) >= 3
  ),
  scored as (
    select t.*, public._weekly_position_line(t.position) as line,
           (t.rating_sum + 6.0 * 6) / (t.apps + 6) as score
    from totals t
  ),
  ranked as (
    select s.*, row_number() over (partition by s.line order by s.score desc, s.apps desc, s.goals desc, s.slot asc, s.player_id) as line_rank
    from scored s
  ),
  by_line as (
    select * from ranked
    where (line = 'GK' and line_rank <= 1)
       or (line = 'DF' and line_rank <= 4)
       or (line = 'MF' and line_rank <= 3)
       or (line = 'FW' and line_rank <= 3)
  ),
  fill as (
    select r.* from ranked r
    where not exists (select 1 from by_line b where b.slot = r.slot and b.player_id = r.player_id)
    order by r.score desc, r.apps desc, r.slot asc, r.player_id
    limit greatest(0, 11 - (select count(*) from by_line))
  ),
  eleven as (
    select * from by_line union all select * from fill
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'slot', e.slot,
    'playerId', e.player_id,
    'name', e.player_name,
    'position', e.position,
    'line', e.line,
    'apps', e.apps,
    'avg', round(e.avg_rating, 2),
    'score', round(e.score, 2),
    'goals', e.goals,
    'assists', e.assists
  ) order by case e.line when 'GK' then 0 when 'DF' then 1 when 'MF' then 2 else 3 end, e.score desc, e.slot), '[]'::jsonb)
  from eleven e
$$;

revoke all on function public.weekly_best_eleven(bigint) from public;
grant execute on function public.weekly_best_eleven(bigint) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3) 명예 기록과 시즌 보상
-- ---------------------------------------------------------------------------
create table if not exists public.weekly_honours (
  id          bigserial primary key,
  group_id    bigint not null references public.weekly_league_groups(id) on delete cascade,
  week_id     text not null,
  tier        smallint not null,
  kind        text not null check (kind in (
                'champion', 'runner_up', 'third',
                'cup_a', 'cup_b', 'masters',
                'best_eleven', 'top_scorer', 'top_assist', 'top_mvp')),
  slot        smallint not null check (slot between 0 and 15),
  user_id     uuid references auth.users on delete set null,
  club_name   text not null,
  player_id   text,
  player_name text,
  position    text,
  detail      jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create unique index if not exists weekly_honours_line_idx
  on public.weekly_honours (group_id, kind, slot, coalesce(player_id, ''));
create index if not exists weekly_honours_week_idx on public.weekly_honours (week_id, tier);
create index if not exists weekly_honours_user_idx on public.weekly_honours (user_id);

alter table public.weekly_honours enable row level security;
drop policy if exists "honours are readable" on public.weekly_honours;
create policy "honours are readable" on public.weekly_honours
  for select to authenticated using (true);

-- 시즌 보상 줄은 특정 fixture에 속하지 않는다.
alter table public.weekly_rewards alter column fixture_id drop not null;
alter table public.weekly_rewards add column if not exists ref text;
alter table public.weekly_rewards drop constraint if exists weekly_rewards_kind_check;
alter table public.weekly_rewards
  add constraint weekly_rewards_kind_check
  check (kind in ('match', 'hot_time', 'tactic_card',
                  'season_rank', 'cup_winner', 'cup_runner_up', 'masters_winner',
                  'best_eleven', 'top_scorer', 'top_assist', 'top_mvp'));
create unique index if not exists weekly_rewards_season_line_idx
  on public.weekly_rewards (group_id, user_id, kind, coalesce(ref, ''))
  where fixture_id is null;

-- 운영자 노브 — game_config에 없으면 lib/tuning.ts의 기본값.
create or replace function public._weekly_knob(p_key text, p_default numeric)
  returns numeric
  language sql
  stable
as $$
  select coalesce((select value from public.game_config where key = p_key), p_default)
$$;

create or replace function public.close_weekly_groups()
  returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_group record;
  v_closed int := 0;
  v_tier_mult numeric;
  v_comp_mult numeric;
  v_rank record;
  v_base numeric;
  v_amount int;
  v_final record;
  v_masters record;
  v_eleven jsonb;
  v_pick jsonb;
  v_owner uuid;
  v_club text;
  v_award record;
  v_kind text;
  v_knob text;
  v_ref text;
begin
  for v_group in
    select g.id, g.tier, g.week_id
    from public.weekly_league_groups g
    where g.status <> 'finished'
      and g.week_id like 'regular-%'
      and exists (select 1 from public.weekly_fixtures f where f.group_id = g.id)
      and not exists (select 1 from public.weekly_fixtures f where f.group_id = g.id and f.status = 'pending')
      and now() > (select max(s.scheduled_at_utc) from public.weekly_schedule_slots s where s.week_id = g.week_id) + interval '20 minutes'
    order by g.id
  loop
    perform pg_advisory_xact_lock(hashtext('close_weekly_group:' || v_group.id::text));
    if exists (select 1 from public.weekly_league_groups where id = v_group.id and status = 'finished') then
      continue;
    end if;

    v_tier_mult := public._weekly_knob('weeklyTierMultiplier' || v_group.tier::text,
                     case v_group.tier when 0 then 1 when 1 then 0.85 when 2 then 0.7 else 0.55 end);
    v_comp_mult := public._weekly_knob('competitiveGoldMultiplier', 1.5);

    -- 최종 순위: 승점 → 골득실 → 득점 → 슬롯 (bootstrap_week_from_previous와 같은 근사).
    for v_rank in
      select m.slot, m.user_id, m.club_name,
             row_number() over (order by s.points desc, s.gd desc, s.gf desc, m.slot asc) as rank,
             s.points, s.gd, s.gf
      from public.weekly_league_members m
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
        where f.group_id = v_group.id and f.status = 'played'
          and (f.home_slot = m.slot or f.away_slot = m.slot)
      ) s on true
      where m.group_id = v_group.id
    loop
      if v_rank.rank <= 3 then
        insert into public.weekly_honours (group_id, week_id, tier, kind, slot, user_id, club_name, detail)
        values (v_group.id, v_group.week_id, v_group.tier,
                case v_rank.rank when 1 then 'champion' when 2 then 'runner_up' else 'third' end,
                v_rank.slot, v_rank.user_id, v_rank.club_name,
                jsonb_build_object('rank', v_rank.rank, 'points', v_rank.points, 'gd', v_rank.gd, 'gf', v_rank.gf))
        on conflict do nothing;
      end if;

      if v_rank.user_id is not null then
        v_knob := case
          when v_rank.rank = 1 then 'weeklySeasonRank1'
          when v_rank.rank = 2 then 'weeklySeasonRank2'
          when v_rank.rank = 3 then 'weeklySeasonRank3'
          when v_rank.rank <= 8 then 'weeklySeasonRank4to8'
          when v_rank.rank <= 13 then 'weeklySeasonRank9to13'
          else 'weeklySeasonRank14to16' end;
        v_base := public._weekly_knob(v_knob, case v_knob
          when 'weeklySeasonRank1' then 30000 when 'weeklySeasonRank2' then 18000 when 'weeklySeasonRank3' then 12000
          when 'weeklySeasonRank4to8' then 6000 when 'weeklySeasonRank9to13' then 3000 else 1500 end);
        v_amount := round(v_base * v_tier_mult * v_comp_mult)::int;
        if v_amount > 0 then
          insert into public.weekly_rewards (user_id, fixture_id, group_id, kind, amount, ref)
          values (v_rank.user_id, null, v_group.id, 'season_rank', v_amount, 'rank:' || v_rank.rank::text)
          on conflict do nothing;
        end if;
      end if;
    end loop;

    -- 컵 결승: 우승·준우승.
    for v_final in
      select c.type, t.winner_slot, t.home_slot, t.away_slot
      from public.weekly_cup_ties t
      join public.weekly_competitions c on c.id = t.competition_id
      where c.group_id = v_group.id and c.type in ('CUP_A', 'CUP_B') and t.stage = 'FINAL' and t.winner_slot is not null
    loop
      v_kind := case v_final.type when 'CUP_A' then 'cup_a' else 'cup_b' end;
      for v_rank in
        select m.slot, m.user_id, m.club_name, (m.slot = v_final.winner_slot) as won
        from public.weekly_league_members m
        where m.group_id = v_group.id and m.slot in (v_final.home_slot, v_final.away_slot)
      loop
        if v_rank.won then
          insert into public.weekly_honours (group_id, week_id, tier, kind, slot, user_id, club_name, detail)
          values (v_group.id, v_group.week_id, v_group.tier, v_kind, v_rank.slot, v_rank.user_id, v_rank.club_name,
                  jsonb_build_object('runnerUpSlot', case when v_final.home_slot = v_rank.slot then v_final.away_slot else v_final.home_slot end))
          on conflict do nothing;
        end if;
        if v_rank.user_id is not null then
          v_base := case when v_rank.won then public._weekly_knob('weeklyCupWinner', 12000) else public._weekly_knob('weeklyCupRunnerUp', 5000) end;
          v_amount := round(v_base * v_tier_mult * v_comp_mult)::int;
          if v_amount > 0 then
            insert into public.weekly_rewards (user_id, fixture_id, group_id, kind, amount, ref)
            values (v_rank.user_id, null, v_group.id, case when v_rank.won then 'cup_winner' else 'cup_runner_up' end, v_amount, v_final.type)
            on conflict do nothing;
          end if;
        end if;
      end loop;
    end loop;

    -- 마스터스 결승: 우승만. 무승부면 홈(Cup A 우승)이 트로피 — 컵 진행기의 근사와 같은 결정론.
    for v_masters in
      select f.home_slot, f.away_slot, f.score_home, f.score_away,
             case when f.score_home >= f.score_away then f.home_slot else f.away_slot end as winner_slot
      from public.weekly_fixtures f
      join public.weekly_competitions c on c.id = f.competition_id and c.type = 'MASTERS_FINAL'
      where f.group_id = v_group.id and f.status = 'played'
      limit 1
    loop
      select user_id, club_name into v_owner, v_club from public.weekly_league_members
        where group_id = v_group.id and slot = v_masters.winner_slot;
      insert into public.weekly_honours (group_id, week_id, tier, kind, slot, user_id, club_name, detail)
      values (v_group.id, v_group.week_id, v_group.tier, 'masters', v_masters.winner_slot, v_owner, coalesce(v_club, '클럽'),
              jsonb_build_object('scoreHome', v_masters.score_home, 'scoreAway', v_masters.score_away,
                                 'homeSlot', v_masters.home_slot, 'awaySlot', v_masters.away_slot))
      on conflict do nothing;
      if v_owner is not null then
        v_amount := round(public._weekly_knob('weeklyMastersWinner', 15000) * v_tier_mult * v_comp_mult)::int;
        if v_amount > 0 then
          insert into public.weekly_rewards (user_id, fixture_id, group_id, kind, amount, ref)
          values (v_owner, null, v_group.id, 'masters_winner', v_amount, 'masters')
          on conflict do nothing;
        end if;
      end if;
    end loop;

    -- 베스트 일레븐: 명예 11줄, 보유 감독에게 선수당 보상.
    v_eleven := public.weekly_best_eleven(v_group.id);
    for v_pick in select * from jsonb_array_elements(v_eleven)
    loop
      select user_id, club_name into v_owner, v_club from public.weekly_league_members
        where group_id = v_group.id and slot = (v_pick->>'slot')::smallint;
      insert into public.weekly_honours (group_id, week_id, tier, kind, slot, user_id, club_name, player_id, player_name, position, detail)
      values (v_group.id, v_group.week_id, v_group.tier, 'best_eleven', (v_pick->>'slot')::smallint, v_owner, coalesce(v_club, '클럽'),
              v_pick->>'playerId', v_pick->>'name', v_pick->>'position',
              jsonb_build_object('line', v_pick->>'line', 'apps', v_pick->'apps', 'avg', v_pick->'avg',
                                 'goals', v_pick->'goals', 'assists', v_pick->'assists'))
      on conflict do nothing;
      if v_owner is not null then
        v_amount := round(public._weekly_knob('weeklyBestElevenBonus', 2500) * v_tier_mult * v_comp_mult)::int;
        if v_amount > 0 then
          insert into public.weekly_rewards (user_id, fixture_id, group_id, kind, amount, ref)
          values (v_owner, null, v_group.id, 'best_eleven', v_amount, 'player:' || (v_pick->>'playerId'))
          on conflict do nothing;
        end if;
      end if;
    end loop;

    -- 개인상: 득점왕 · 도움왕 · MVP왕 (동률은 도움/골 → 슬롯 순으로 한 명).
    for v_award in
      select * from (
        select 'top_scorer' as kind, s.slot, s.player_id, max(s.player_name) as player_name,
               sum(s.goals) as n, sum(s.assists) as tie
        from public.weekly_goal_scorers s where s.group_id = v_group.id
        group by s.slot, s.player_id having sum(s.goals) > 0
        order by sum(s.goals) desc, sum(s.assists) desc, s.slot asc, s.player_id limit 1
      ) a
      union all
      select * from (
        select 'top_assist' as kind, s.slot, s.player_id, max(s.player_name) as player_name,
               sum(s.assists) as n, sum(s.goals) as tie
        from public.weekly_goal_scorers s where s.group_id = v_group.id
        group by s.slot, s.player_id having sum(s.assists) > 0
        order by sum(s.assists) desc, sum(s.goals) desc, s.slot asc, s.player_id limit 1
      ) b
      union all
      select * from (
        select 'top_mvp' as kind, f.mvp_slot as slot, f.mvp_player_id as player_id, max(f.mvp_player_name) as player_name,
               count(*) as n, max(f.mvp_rating) as tie
        from public.weekly_fixtures f where f.group_id = v_group.id and f.status = 'played' and f.mvp_player_id is not null
        group by f.mvp_slot, f.mvp_player_id
        order by count(*) desc, max(f.mvp_rating) desc, f.mvp_slot asc, f.mvp_player_id limit 1
      ) c
    loop
      select user_id, club_name into v_owner, v_club from public.weekly_league_members
        where group_id = v_group.id and slot = v_award.slot;
      insert into public.weekly_honours (group_id, week_id, tier, kind, slot, user_id, club_name, player_id, player_name, detail)
      values (v_group.id, v_group.week_id, v_group.tier, v_award.kind, v_award.slot, v_owner, coalesce(v_club, '클럽'),
              v_award.player_id, v_award.player_name, jsonb_build_object('count', v_award.n, 'tie', v_award.tie))
      on conflict do nothing;
      if v_owner is not null then
        v_amount := round(public._weekly_knob('weeklyIndividualAward', 4000) * v_tier_mult * v_comp_mult)::int;
        if v_amount > 0 then
          v_ref := v_award.kind;
          insert into public.weekly_rewards (user_id, fixture_id, group_id, kind, amount, ref)
          values (v_owner, null, v_group.id, v_award.kind, v_amount, v_ref)
          on conflict do nothing;
        end if;
      end if;
    end loop;

    update public.weekly_league_groups set status = 'finished', finished_at = now() where id = v_group.id;
    v_closed := v_closed + 1;
  end loop;

  return jsonb_build_object('ok', true, 'closed', v_closed);
end $$;

revoke all on function public.close_weekly_groups() from public;
revoke all on function public.close_weekly_groups() from authenticated;
grant execute on function public.close_weekly_groups() to service_role;

select cron.unschedule('close-weekly-groups')
  where exists (select 1 from cron.job where jobname = 'close-weekly-groups');
-- 일요일 23:00 마스터스가 23:15에 정산되고 20분 여유 뒤, 다음 10분 틱에 마감된다.
select cron.schedule('close-weekly-groups', '*/10 * * * *', $$select public.close_weekly_groups()$$);
