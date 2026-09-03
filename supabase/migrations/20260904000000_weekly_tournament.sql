-- 주간 리그·컵 대회 시스템 — Phase 2 스키마.
--
-- 대진 생성 알고리즘(라운드로빈·컵 브래킷) 자체는 여기 SQL로 다시 쓰지
-- 않는다. lib/weeklyLeague/schedule.ts·cup.ts가 이미 순수 함수로 만들고
-- 테스트돼 있으므로, Edge Function이 그 결과를 JSONB로 만들어 보내고 여기
-- RPC는 "한 번만 저장되게" 트랜잭션·잠금·중복 방지만 책임진다 — draw-pack·
-- simulate-match와 같은 원칙(로직은 한 벌, lib/에만 있다).
--
-- 실제 서버가 알아서 진행하는 크론(Phase 3)은 아직 배선하지 않는다. 이
-- 마이그레이션은 스키마만 추가하고 기존 테이블은 건드리지 않는다.

-- ---------------------------------------------------------------------------
-- 1. 리그 그룹 — 한 등급(디비전)의 16개 구단 한 묶음.
-- ---------------------------------------------------------------------------

create table if not exists public.weekly_league_groups (
  id          bigserial primary key,
  tier        smallint not null check (tier >= 0),
  week_id     text not null check (char_length(week_id) between 1 and 20),
  status      text not null check (status in ('forming', 'active', 'finished')) default 'forming',
  created_at  timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists weekly_league_groups_tier_week_idx
  on public.weekly_league_groups (tier, week_id);

alter table public.weekly_league_groups enable row level security;
drop policy if exists "groups are readable" on public.weekly_league_groups;
create policy "groups are readable" on public.weekly_league_groups
  for select to authenticated using (true);

create table if not exists public.weekly_league_members (
  group_id  bigint not null references public.weekly_league_groups(id) on delete cascade,
  slot      smallint not null check (slot between 0 and 15),
  kind      text not null check (kind in ('user', 'ai')),
  user_id   uuid references auth.users on delete set null,
  club_name text not null check (char_length(club_name) between 1 and 30),
  badge     text not null default '',
  rating    smallint not null check (rating between 0 and 200),
  joined_at timestamptz not null default now(),
  primary key (group_id, slot),
  unique (group_id, user_id),
  constraint weekly_league_members_kind_user check (
    (kind = 'user' and user_id is not null) or (kind = 'ai' and user_id is null)
  )
);

alter table public.weekly_league_members enable row level security;
drop policy if exists "members are readable" on public.weekly_league_members;
create policy "members are readable" on public.weekly_league_members
  for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- 2. 한 주의 105개 전역 슬롯 — 그룹과 무관하게 week_id 하나에 한 번만 존재.
-- ---------------------------------------------------------------------------

create table if not exists public.weekly_schedule_slots (
  week_id          text not null check (char_length(week_id) between 1 and 20),
  slot_index       smallint not null check (slot_index between 0 and 104),
  day_of_week      text not null check (day_of_week in ('MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN')),
  local_hour       smallint not null check (local_hour between 9 and 23),
  type             text not null check (type in ('LEAGUE', 'CUP_A', 'CUP_B', 'MASTERS_FINAL')),
  cup_stage        text check (cup_stage in ('R16', 'QF', 'SF', 'FINAL')),
  leg              smallint check (leg in (1, 2)),
  scheduled_at_utc timestamptz not null,
  primary key (week_id, slot_index)
);

alter table public.weekly_schedule_slots enable row level security;
drop policy if exists "slots are readable" on public.weekly_schedule_slots;
create policy "slots are readable" on public.weekly_schedule_slots
  for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- 3. 대회 — 한 그룹 안의 리그 하나 + 컵 두 개 + Masters Final 하나.
-- ---------------------------------------------------------------------------

create table if not exists public.weekly_competitions (
  id           bigserial primary key,
  group_id     bigint not null references public.weekly_league_groups(id) on delete cascade,
  type         text not null check (type in ('LEAGUE', 'CUP_A', 'CUP_B', 'MASTERS_FINAL')),
  display_name text not null,
  rules_config jsonb not null default '{}'::jsonb,
  status       text not null check (status in ('pending', 'active', 'finished')) default 'pending',
  unique (group_id, type)
);

alter table public.weekly_competitions enable row level security;
drop policy if exists "competitions are readable" on public.weekly_competitions;
create policy "competitions are readable" on public.weekly_competitions
  for select to authenticated using (true);

-- 컵 타이(2차전 합산)와 fixture가 서로를 참조해서(순환 FK) fixture 테이블을
-- 먼저 만들고 나중에 컵 타이 쪽 FK를 건다. cup_tie_id 컬럼은 여기서는
-- FK 없이 만든다.

create table if not exists public.weekly_fixtures (
  id               bigserial primary key,
  group_id         bigint not null references public.weekly_league_groups(id) on delete cascade,
  competition_id   bigint not null references public.weekly_competitions(id) on delete cascade,
  -- 리그면 0~89 라운드 번호. 컵/Masters Final이면 null.
  round            smallint check (round between 0 and 89),
  -- 컵/Masters Final이면 그 타이 id. 리그면 null. (FK는 아래서 건다)
  cup_tie_id       bigint,
  leg              smallint check (leg in (1, 2)),
  neutral_venue    boolean not null default false,
  home_slot        smallint not null check (home_slot between 0 and 15),
  away_slot        smallint not null check (away_slot between 0 and 15),
  scheduled_at_utc timestamptz not null,
  status           text not null check (status in ('pending', 'played')) default 'pending',
  simulation_seed  text,
  score_home       smallint check (score_home between 0 and 30),
  score_away       smallint check (score_away between 0 and 30),
  events           jsonb,
  settled_at       timestamptz,
  constraint weekly_fixtures_distinct_clubs check (home_slot <> away_slot)
);

create index if not exists weekly_fixtures_group_idx on public.weekly_fixtures (group_id, round);
create index if not exists weekly_fixtures_pending_idx
  on public.weekly_fixtures (scheduled_at_utc) where status = 'pending';
-- 요구사항 8: 한 구단이 같은 시각에 중복 경기를 갖지 않는다.
create unique index if not exists weekly_fixtures_home_slot_time_idx
  on public.weekly_fixtures (group_id, scheduled_at_utc, home_slot);
create unique index if not exists weekly_fixtures_away_slot_time_idx
  on public.weekly_fixtures (group_id, scheduled_at_utc, away_slot);

alter table public.weekly_fixtures enable row level security;
drop policy if exists "fixtures are readable" on public.weekly_fixtures;
create policy "fixtures are readable" on public.weekly_fixtures
  for select to authenticated using (true);

create table if not exists public.weekly_cup_ties (
  id                    bigserial primary key,
  competition_id        bigint not null references public.weekly_competitions(id) on delete cascade,
  stage                 text not null check (stage in ('R16', 'QF', 'SF', 'FINAL')),
  home_slot              smallint not null check (home_slot between 0 and 15),
  away_slot              smallint not null check (away_slot between 0 and 15),
  first_leg_fixture_id   bigint references public.weekly_fixtures(id),
  second_leg_fixture_id  bigint references public.weekly_fixtures(id),
  aggregate_home_score   smallint,
  aggregate_away_score   smallint,
  winner_slot            smallint,
  decided_by             text check (decided_by in ('AGGREGATE', 'EXTRA_TIME', 'PENALTIES', 'REGULATION')),
  constraint weekly_cup_ties_distinct_clubs check (home_slot <> away_slot),
  unique (competition_id, stage, home_slot, away_slot)
);

create index if not exists weekly_cup_ties_competition_idx on public.weekly_cup_ties (competition_id, stage);

alter table public.weekly_cup_ties enable row level security;
drop policy if exists "cup ties are readable" on public.weekly_cup_ties;
create policy "cup ties are readable" on public.weekly_cup_ties
  for select to authenticated using (true);

alter table public.weekly_fixtures
  add constraint weekly_fixtures_cup_tie_fk foreign key (cup_tie_id)
  references public.weekly_cup_ties(id) on delete cascade;

-- ---------------------------------------------------------------------------
-- 4. 쓰기는 전부 service_role RPC를 통해서만 — 대진 조작을 막는다
--    (commit_match·commit_pull과 같은 원칙).
--
-- 컵은 8강·4강·결승 대진이 이전 라운드 결과가 나와야 정해지므로(요구사항
-- 10절), 한 번에 다 만들지 않는다. 리그 90경기와 컵 16강만 그룹 생성 시점에
-- 전부 알 수 있고, 8강부터는 이전 스테이지가 끝난 뒤 그때 가서
-- seed_cup_stage_ties를 한 번 더 부른다 — "다음 라운드 슬롯만 먼저 예약"
-- (스펙 10절)을 굳이 빈 자리로 만들어 두지 않고, 필요해지는 시점에 그
-- 스테이지 fixture를 만드는 방식으로 만족시킨다. 참가 구단이 없는 슬롯
-- 자체는 weekly_schedule_slots(week 단위, 그룹과 무관)에 이미 존재한다.
-- ---------------------------------------------------------------------------

-- 한 주의 105개 전역 슬롯을 저장한다. Edge Function이
-- lib/weeklyLeague/config.ts + 그 주의 월요일 00:00 KST epoch로 계산해
-- p_slots에 담아 보낸다. 이미 그 week_id로 저장돼 있으면 아무것도 하지
-- 않는다(멱등) — 생성기를 재실행해도 중복이 안 생긴다는 요구사항 20.
create or replace function public.seed_weekly_schedule_slots(p_week_id text, p_slots jsonb)
  returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_existing int;
begin
  perform pg_advisory_xact_lock(hashtext('weekly_schedule:' || p_week_id));

  select count(*) into v_existing from public.weekly_schedule_slots where week_id = p_week_id;
  if v_existing > 0 then
    return jsonb_build_object('ok', true, 'inserted', 0, 'reason', 'already seeded');
  end if;

  insert into public.weekly_schedule_slots
    (week_id, slot_index, day_of_week, local_hour, type, cup_stage, leg, scheduled_at_utc)
  select
    p_week_id,
    (slot->>'index')::smallint,
    slot->>'day',
    (slot->>'hour')::smallint,
    slot->>'type',
    slot->>'cupStage',
    (slot->>'leg')::smallint,
    (slot->>'scheduledAtUtc')::timestamptz
  from jsonb_array_elements(p_slots) as slot;

  return jsonb_build_object('ok', true, 'inserted', jsonb_array_length(p_slots));
end $$;

revoke all on function public.seed_weekly_schedule_slots(text, jsonb) from public;
revoke all on function public.seed_weekly_schedule_slots(text, jsonb) from authenticated;
grant execute on function public.seed_weekly_schedule_slots(text, jsonb) to service_role;

-- 새 리그 그룹(16자리)을 만든다. p_members는 이미 결정된 슬롯 배정
-- (실유저 + AI)을 담은 배열 — 실유저 상한 등 배정 로직 자체는 Edge
-- Function 쪽(다음 단계)의 몫이고, 여기는 저장만 한다.
create or replace function public.create_weekly_league_group(
  p_tier int,
  p_week_id text,
  p_members jsonb
) returns bigint
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_group_id bigint;
begin
  if jsonb_array_length(p_members) <> 16 then
    raise exception 'create_weekly_league_group: expected 16 members, got %', jsonb_array_length(p_members);
  end if;

  insert into public.weekly_league_groups (tier, week_id)
  values (p_tier, p_week_id)
  returning id into v_group_id;

  insert into public.weekly_league_members (group_id, slot, kind, user_id, club_name, badge, rating)
  select
    v_group_id,
    (member->>'slot')::smallint,
    member->>'kind',
    nullif(member->>'userId', '')::uuid,
    member->>'clubName',
    coalesce(member->>'badge', ''),
    (member->>'rating')::smallint
  from jsonb_array_elements(p_members) as member;

  return v_group_id;
end $$;

revoke all on function public.create_weekly_league_group(int, text, jsonb) from public;
revoke all on function public.create_weekly_league_group(int, text, jsonb) from authenticated;
grant execute on function public.create_weekly_league_group(int, text, jsonb) to service_role;

-- 그룹의 대회 4개(LEAGUE·CUP_A·CUP_B·MASTERS_FINAL)를 만든다. 이미 있으면
-- 손대지 않는다(unique(group_id, type) + on conflict do nothing) — 그리고
-- 항상 {type: id} 매핑을 돌려주므로, 이미 만들어져 있던 경우에도 호출하는
-- 쪽이 다음 단계(대진 생성)에 쓸 id를 그대로 받을 수 있다.
create or replace function public.seed_weekly_competitions(p_group_id bigint)
  returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  insert into public.weekly_competitions (group_id, type, display_name)
  values
    (p_group_id, 'LEAGUE', '리그'),
    (p_group_id, 'CUP_A', 'Cup A'),
    (p_group_id, 'CUP_B', 'Cup B'),
    (p_group_id, 'MASTERS_FINAL', 'Masters Final')
  on conflict (group_id, type) do nothing;

  return (
    select jsonb_object_agg(type, id)
    from public.weekly_competitions
    where group_id = p_group_id
  );
end $$;

revoke all on function public.seed_weekly_competitions(bigint) from public;
revoke all on function public.seed_weekly_competitions(bigint) from authenticated;
grant execute on function public.seed_weekly_competitions(bigint) to service_role;

-- 리그 90경기를 한 번에 저장한다. 이미 이 대회에 fixture가 있으면
-- 아무것도 하지 않는다(멱등).
create or replace function public.seed_league_fixtures(
  p_group_id bigint,
  p_competition_id bigint,
  p_fixtures jsonb
) returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_existing int;
begin
  perform pg_advisory_xact_lock(hashtext('weekly_league_fixtures:' || p_competition_id::text));

  select count(*) into v_existing from public.weekly_fixtures where competition_id = p_competition_id;
  if v_existing > 0 then
    return jsonb_build_object('ok', true, 'inserted', 0, 'reason', 'already seeded');
  end if;

  insert into public.weekly_fixtures (
    group_id, competition_id, round, home_slot, away_slot, scheduled_at_utc
  )
  select
    p_group_id,
    p_competition_id,
    (f->>'round')::smallint,
    (f->>'homeSlot')::smallint,
    (f->>'awaySlot')::smallint,
    (f->>'scheduledAtUtc')::timestamptz
  from jsonb_array_elements(p_fixtures) as f;

  return jsonb_build_object('ok', true, 'inserted', jsonb_array_length(p_fixtures));
end $$;

revoke all on function public.seed_league_fixtures(bigint, bigint, jsonb) from public;
revoke all on function public.seed_league_fixtures(bigint, bigint, jsonb) from authenticated;
grant execute on function public.seed_league_fixtures(bigint, bigint, jsonb) to service_role;

-- 컵의 한 스테이지(R16/QF/SF/FINAL)를 만든다 — 타이 자체와 그 leg
-- fixture(FINAL은 1개, 나머지는 2개)를 함께 넣고 타이의
-- first/second_leg_fixture_id를 채운다. 이미 이 대회·스테이지에 타이가
-- 있으면 손대지 않는다(멱등) — 그래서 8강·4강·결승은 이전 스테이지가 끝난
-- 뒤 이 함수를 다시 호출해서 그때서야 만들어진다(요구사항 10절: 2차전
-- 결과가 나오기 전에는 다음 라운드 대진을 확정하지 않는다).
create or replace function public.seed_cup_stage_ties(
  p_group_id bigint,
  p_competition_id bigint,
  p_stage text,
  p_ties jsonb
) returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_existing int;
  v_tie jsonb;
  v_tie_id bigint;
  v_leg1_id bigint;
  v_leg2_id bigint;
begin
  perform pg_advisory_xact_lock(hashtext('weekly_cup_stage:' || p_competition_id::text || ':' || p_stage));

  select count(*) into v_existing
  from public.weekly_cup_ties
  where competition_id = p_competition_id and stage = p_stage;
  if v_existing > 0 then
    return jsonb_build_object('ok', true, 'inserted', 0, 'reason', 'already seeded');
  end if;

  for v_tie in select * from jsonb_array_elements(p_ties)
  loop
    insert into public.weekly_cup_ties (competition_id, stage, home_slot, away_slot)
    values (
      p_competition_id,
      p_stage,
      (v_tie->>'homeSlot')::smallint,
      (v_tie->>'awaySlot')::smallint
    )
    returning id into v_tie_id;

    insert into public.weekly_fixtures (
      group_id, competition_id, cup_tie_id, leg, neutral_venue,
      home_slot, away_slot, scheduled_at_utc
    )
    values (
      p_group_id, p_competition_id, v_tie_id,
      case when p_stage = 'FINAL' then null else 1 end,
      p_stage = 'FINAL',
      (v_tie->>'homeSlot')::smallint,
      (v_tie->>'awaySlot')::smallint,
      (v_tie->'leg1ScheduledAtUtc' #>> '{}')::timestamptz
    )
    returning id into v_leg1_id;

    update public.weekly_cup_ties set first_leg_fixture_id = v_leg1_id where id = v_tie_id;

    if p_stage <> 'FINAL' then
      insert into public.weekly_fixtures (
        group_id, competition_id, cup_tie_id, leg, neutral_venue,
        home_slot, away_slot, scheduled_at_utc
      )
      values (
        p_group_id, p_competition_id, v_tie_id, 2, false,
        -- 2차전은 홈/원정이 뒤바뀐다.
        (v_tie->>'awaySlot')::smallint,
        (v_tie->>'homeSlot')::smallint,
        (v_tie->'leg2ScheduledAtUtc' #>> '{}')::timestamptz
      )
      returning id into v_leg2_id;

      update public.weekly_cup_ties set second_leg_fixture_id = v_leg2_id where id = v_tie_id;
    end if;
  end loop;

  return jsonb_build_object('ok', true, 'inserted', jsonb_array_length(p_ties));
end $$;

revoke all on function public.seed_cup_stage_ties(bigint, bigint, text, jsonb) from public;
revoke all on function public.seed_cup_stage_ties(bigint, bigint, text, jsonb) from authenticated;
grant execute on function public.seed_cup_stage_ties(bigint, bigint, text, jsonb) to service_role;
