-- 정식 주간 시즌(9/7 첫 주) 자동 생성.
--
-- 배치 리그와 같은 원칙 — 대진 패턴은 클럽이 누구인지와 무관하게 항상
-- 같으므로, generateLeagueFixtures/buildWeeklySlots의 실제 출력을 정적
-- 표로 저장해 두고 조인만 한다. 첫 주는 배치 리그에 승격·강등이 없었으므로
-- 배치 리그의 등급 구성을 그대로 이어받는다 — 2주차부터 필요한 "직전 주
-- 순위로 승격·강등 반영" 로직은 이번 범위 밖이다(2026-09-14 즈음 필요).

create table if not exists public.weekly_regular_slot_template (
  slot_index  smallint not null primary key,
  day_of_week text not null,
  local_hour  smallint not null,
  type        text not null,
  cup_stage   text,
  leg         smallint
);

-- buildWeeklySlots()의 실제 출력. lib/weeklyLeague/config.ts의 WEEKLY_SLOTS가
-- 바뀌면 이 표도 다시 뽑아 갱신해야 한다.
insert into public.weekly_regular_slot_template (slot_index, day_of_week, local_hour, type, cup_stage, leg)
values
(0,'MON',9,'LEAGUE',null,null),(1,'MON',10,'LEAGUE',null,null),(2,'MON',11,'LEAGUE',null,null),(3,'MON',12,'LEAGUE',null,null),(4,'MON',13,'LEAGUE',null,null),(5,'MON',14,'LEAGUE',null,null),(6,'MON',15,'LEAGUE',null,null),(7,'MON',16,'LEAGUE',null,null),(8,'MON',17,'LEAGUE',null,null),(9,'MON',18,'LEAGUE',null,null),(10,'MON',19,'LEAGUE',null,null),(11,'MON',20,'LEAGUE',null,null),(12,'MON',21,'LEAGUE',null,null),(13,'MON',22,'LEAGUE',null,null),(14,'MON',23,'LEAGUE',null,null),(15,'TUE',9,'LEAGUE',null,null),(16,'TUE',10,'LEAGUE',null,null),(17,'TUE',11,'LEAGUE',null,null),(18,'TUE',12,'LEAGUE',null,null),(19,'TUE',13,'LEAGUE',null,null),(20,'TUE',14,'CUP_A','R16',1),(21,'TUE',15,'LEAGUE',null,null),(22,'TUE',16,'LEAGUE',null,null),(23,'TUE',17,'LEAGUE',null,null),(24,'TUE',18,'LEAGUE',null,null),(25,'TUE',19,'LEAGUE',null,null),(26,'TUE',20,'CUP_B','R16',1),(27,'TUE',21,'LEAGUE',null,null),(28,'TUE',22,'LEAGUE',null,null),(29,'TUE',23,'LEAGUE',null,null),(30,'WED',9,'LEAGUE',null,null),(31,'WED',10,'LEAGUE',null,null),(32,'WED',11,'LEAGUE',null,null),(33,'WED',12,'LEAGUE',null,null),(34,'WED',13,'LEAGUE',null,null),(35,'WED',14,'CUP_A','R16',2),(36,'WED',15,'LEAGUE',null,null),(37,'WED',16,'LEAGUE',null,null),(38,'WED',17,'LEAGUE',null,null),(39,'WED',18,'LEAGUE',null,null),(40,'WED',19,'LEAGUE',null,null),(41,'WED',20,'CUP_B','R16',2),(42,'WED',21,'LEAGUE',null,null),(43,'WED',22,'LEAGUE',null,null),(44,'WED',23,'LEAGUE',null,null),(45,'THU',9,'LEAGUE',null,null),(46,'THU',10,'LEAGUE',null,null),(47,'THU',11,'LEAGUE',null,null),(48,'THU',12,'LEAGUE',null,null),(49,'THU',13,'LEAGUE',null,null),(50,'THU',14,'CUP_A','QF',1),(51,'THU',15,'LEAGUE',null,null),(52,'THU',16,'LEAGUE',null,null),(53,'THU',17,'LEAGUE',null,null),(54,'THU',18,'LEAGUE',null,null),(55,'THU',19,'LEAGUE',null,null),(56,'THU',20,'CUP_B','QF',1),(57,'THU',21,'LEAGUE',null,null),(58,'THU',22,'LEAGUE',null,null),(59,'THU',23,'LEAGUE',null,null),(60,'FRI',9,'LEAGUE',null,null),(61,'FRI',10,'LEAGUE',null,null),(62,'FRI',11,'LEAGUE',null,null),(63,'FRI',12,'LEAGUE',null,null),(64,'FRI',13,'LEAGUE',null,null),(65,'FRI',14,'CUP_A','QF',2),(66,'FRI',15,'LEAGUE',null,null),(67,'FRI',16,'LEAGUE',null,null),(68,'FRI',17,'LEAGUE',null,null),(69,'FRI',18,'LEAGUE',null,null),(70,'FRI',19,'LEAGUE',null,null),(71,'FRI',20,'CUP_B','QF',2),(72,'FRI',21,'LEAGUE',null,null),(73,'FRI',22,'LEAGUE',null,null),(74,'FRI',23,'LEAGUE',null,null),(75,'SAT',9,'CUP_A','SF',1),(76,'SAT',10,'LEAGUE',null,null),(77,'SAT',11,'CUP_B','SF',1),(78,'SAT',12,'LEAGUE',null,null),(79,'SAT',13,'CUP_A','SF',2),(80,'SAT',14,'LEAGUE',null,null),(81,'SAT',15,'CUP_B','SF',2),(82,'SAT',16,'LEAGUE',null,null),(83,'SAT',17,'LEAGUE',null,null),(84,'SAT',18,'LEAGUE',null,null),(85,'SAT',19,'LEAGUE',null,null),(86,'SAT',20,'CUP_A','FINAL',null),(87,'SAT',21,'LEAGUE',null,null),(88,'SAT',22,'LEAGUE',null,null),(89,'SAT',23,'CUP_B','FINAL',null),(90,'SUN',9,'LEAGUE',null,null),(91,'SUN',10,'LEAGUE',null,null),(92,'SUN',11,'LEAGUE',null,null),(93,'SUN',12,'LEAGUE',null,null),(94,'SUN',13,'LEAGUE',null,null),(95,'SUN',14,'LEAGUE',null,null),(96,'SUN',15,'LEAGUE',null,null),(97,'SUN',16,'LEAGUE',null,null),(98,'SUN',17,'LEAGUE',null,null),(99,'SUN',18,'LEAGUE',null,null),(100,'SUN',19,'LEAGUE',null,null),(101,'SUN',20,'LEAGUE',null,null),(102,'SUN',21,'LEAGUE',null,null),(103,'SUN',22,'LEAGUE',null,null),(104,'SUN',23,'MASTERS_FINAL',null,null)
on conflict (slot_index) do nothing;

create table if not exists public.weekly_league_fixture_template (
  round     smallint not null,
  home_slot smallint not null check (home_slot between 0 and 15),
  away_slot smallint not null check (away_slot between 0 and 15),
  primary key (round, home_slot, away_slot)
);

-- generateLeagueFixtures(['0'..'15'])의 실제 출력(90라운드 × 8경기 = 720행).
insert into public.weekly_league_fixture_template (round, home_slot, away_slot)
values
(0,0,15),(0,1,14),(0,2,13),(0,3,12),(0,4,11),(0,5,10),(0,6,9),(0,7,8),(1,0,14),(1,15,13),(1,1,12),(1,2,11),(1,3,10),(1,4,9),(1,5,8),(1,6,7),(2,0,13),(2,14,12),(2,15,11),(2,1,10),(2,2,9),(2,3,8),(2,4,7),(2,5,6),(3,0,12),(3,13,11),(3,14,10),(3,15,9),(3,1,8),(3,2,7),(3,3,6),(3,4,5),(4,0,11),(4,12,10),(4,13,9),(4,14,8),(4,15,7),(4,1,6),(4,2,5),(4,3,4),(5,0,10),(5,11,9),(5,12,8),(5,13,7),(5,14,6),(5,15,5),(5,1,4),(5,2,3),(6,0,9),(6,10,8),(6,11,7),(6,12,6),(6,13,5),(6,14,4),(6,15,3),(6,1,2),(7,0,8),(7,9,7),(7,10,6),(7,11,5),(7,12,4),(7,13,3),(7,14,2),(7,15,1),(8,0,7),(8,8,6),(8,9,5),(8,10,4),(8,11,3),(8,12,2),(8,13,1),(8,14,15),(9,0,6),(9,7,5),(9,8,4),(9,9,3),(9,10,2),(9,11,1),(9,12,15),(9,13,14),(10,0,5),(10,6,4),(10,7,3),(10,8,2),(10,9,1),(10,10,15),(10,11,14),(10,12,13),(11,0,4),(11,5,3),(11,6,2),(11,7,1),(11,8,15),(11,9,14),(11,10,13),(11,11,12),(12,0,3),(12,4,2),(12,5,1),(12,6,15),(12,7,14),(12,8,13),(12,9,12),(12,10,11),(13,0,2),(13,3,1),(13,4,15),(13,5,14),(13,6,13),(13,7,12),(13,8,11),(13,9,10),(14,0,1),(14,2,15),(14,3,14),(14,4,13),(14,5,12),(14,6,11),(14,7,10),(14,8,9),(15,15,0),(15,14,1),(15,13,2),(15,12,3),(15,11,4),(15,10,5),(15,9,6),(15,8,7),(16,14,0),(16,13,15),(16,12,1),(16,11,2),(16,10,3),(16,9,4),(16,8,5),(16,7,6),(17,13,0),(17,12,14),(17,11,15),(17,10,1),(17,9,2),(17,8,3),(17,7,4),(17,6,5),(18,12,0),(18,11,13),(18,10,14),(18,9,15),(18,8,1),(18,7,2),(18,6,3),(18,5,4),(19,11,0),(19,10,12),(19,9,13),(19,8,14),(19,7,15),(19,6,1),(19,5,2),(19,4,3),(20,10,0),(20,9,11),(20,8,12),(20,7,13),(20,6,14),(20,5,15),(20,4,1),(20,3,2),(21,9,0),(21,8,10),(21,7,11),(21,6,12),(21,5,13),(21,4,14),(21,3,15),(21,2,1),(22,8,0),(22,7,9),(22,6,10),(22,5,11),(22,4,12),(22,3,13),(22,2,14),(22,1,15),(23,7,0),(23,6,8),(23,5,9),(23,4,10),(23,3,11),(23,2,12),(23,1,13),(23,15,14),(24,6,0),(24,5,7),(24,4,8),(24,3,9),(24,2,10),(24,1,11),(24,15,12),(24,14,13),(25,5,0),(25,4,6),(25,3,7),(25,2,8),(25,1,9),(25,15,10),(25,14,11),(25,13,12),(26,4,0),(26,3,5),(26,2,6),(26,1,7),(26,15,8),(26,14,9),(26,13,10),(26,12,11),(27,3,0),(27,2,4),(27,1,5),(27,15,6),(27,14,7),(27,13,8),(27,12,9),(27,11,10),(28,2,0),(28,1,3),(28,15,4),(28,14,5),(28,13,6),(28,12,7),(28,11,8),(28,10,9),(29,1,0),(29,15,2),(29,14,3),(29,13,4),(29,12,5),(29,11,6),(29,10,7),(29,9,8),(30,0,15),(30,1,14),(30,2,13),(30,3,12),(30,4,11),(30,5,10),(30,6,9),(30,7,8),(31,0,14),(31,15,13),(31,1,12),(31,2,11),(31,3,10),(31,4,9),(31,5,8),(31,6,7),(32,0,13),(32,14,12),(32,15,11),(32,1,10),(32,2,9),(32,3,8),(32,4,7),(32,5,6),(33,0,12),(33,13,11),(33,14,10),(33,15,9),(33,1,8),(33,2,7),(33,3,6),(33,4,5),(34,0,11),(34,12,10),(34,13,9),(34,14,8),(34,15,7),(34,1,6),(34,2,5),(34,3,4),(35,0,10),(35,11,9),(35,12,8),(35,13,7),(35,14,6),(35,15,5),(35,1,4),(35,2,3),(36,0,9),(36,10,8),(36,11,7),(36,12,6),(36,13,5),(36,14,4),(36,15,3),(36,1,2),(37,0,8),(37,9,7),(37,10,6),(37,11,5),(37,12,4),(37,13,3),(37,14,2),(37,15,1),(38,0,7),(38,8,6),(38,9,5),(38,10,4),(38,11,3),(38,12,2),(38,13,1),(38,14,15),(39,0,6),(39,7,5),(39,8,4),(39,9,3),(39,10,2),(39,11,1),(39,12,15),(39,13,14),(40,0,5),(40,6,4),(40,7,3),(40,8,2),(40,9,1),(40,10,15),(40,11,14),(40,12,13),(41,0,4),(41,5,3),(41,6,2),(41,7,1),(41,8,15),(41,9,14),(41,10,13),(41,11,12),(42,0,3),(42,4,2),(42,5,1),(42,6,15),(42,7,14),(42,8,13),(42,9,12),(42,10,11),(43,0,2),(43,3,1),(43,4,15),(43,5,14),(43,6,13),(43,7,12),(43,8,11),(43,9,10),(44,0,1),(44,2,15),(44,3,14),(44,4,13),(44,5,12),(44,6,11),(44,7,10),(44,8,9),(45,15,0),(45,14,1),(45,13,2),(45,12,3),(45,11,4),(45,10,5),(45,9,6),(45,8,7),(46,14,0),(46,13,15),(46,12,1),(46,11,2),(46,10,3),(46,9,4),(46,8,5),(46,7,6),(47,13,0),(47,12,14),(47,11,15),(47,10,1),(47,9,2),(47,8,3),(47,7,4),(47,6,5),(48,12,0),(48,11,13),(48,10,14),(48,9,15),(48,8,1),(48,7,2),(48,6,3),(48,5,4),(49,11,0),(49,10,12),(49,9,13),(49,8,14),(49,7,15),(49,6,1),(49,5,2),(49,4,3),(50,10,0),(50,9,11),(50,8,12),(50,7,13),(50,6,14),(50,5,15),(50,4,1),(50,3,2),(51,9,0),(51,8,10),(51,7,11),(51,6,12),(51,5,13),(51,4,14),(51,3,15),(51,2,1),(52,8,0),(52,7,9),(52,6,10),(52,5,11),(52,4,12),(52,3,13),(52,2,14),(52,1,15),(53,7,0),(53,6,8),(53,5,9),(53,4,10),(53,3,11),(53,2,12),(53,1,13),(53,15,14),(54,6,0),(54,5,7),(54,4,8),(54,3,9),(54,2,10),(54,1,11),(54,15,12),(54,14,13),(55,5,0),(55,4,6),(55,3,7),(55,2,8),(55,1,9),(55,15,10),(55,14,11),(55,13,12),(56,4,0),(56,3,5),(56,2,6),(56,1,7),(56,15,8),(56,14,9),(56,13,10),(56,12,11),(57,3,0),(57,2,4),(57,1,5),(57,15,6),(57,14,7),(57,13,8),(57,12,9),(57,11,10),(58,2,0),(58,1,3),(58,15,4),(58,14,5),(58,13,6),(58,12,7),(58,11,8),(58,10,9),(59,1,0),(59,15,2),(59,14,3),(59,13,4),(59,12,5),(59,11,6),(59,10,7),(59,9,8),(60,0,15),(60,1,14),(60,2,13),(60,3,12),(60,4,11),(60,5,10),(60,6,9),(60,7,8),(61,0,14),(61,15,13),(61,1,12),(61,2,11),(61,3,10),(61,4,9),(61,5,8),(61,6,7),(62,0,13),(62,14,12),(62,15,11),(62,1,10),(62,2,9),(62,3,8),(62,4,7),(62,5,6),(63,0,12),(63,13,11),(63,14,10),(63,15,9),(63,1,8),(63,2,7),(63,3,6),(63,4,5),(64,0,11),(64,12,10),(64,13,9),(64,14,8),(64,15,7),(64,1,6),(64,2,5),(64,3,4),(65,0,10),(65,11,9),(65,12,8),(65,13,7),(65,14,6),(65,15,5),(65,1,4),(65,2,3),(66,0,9),(66,10,8),(66,11,7),(66,12,6),(66,13,5),(66,14,4),(66,15,3),(66,1,2),(67,0,8),(67,9,7),(67,10,6),(67,11,5),(67,12,4),(67,13,3),(67,14,2),(67,15,1),(68,0,7),(68,8,6),(68,9,5),(68,10,4),(68,11,3),(68,12,2),(68,13,1),(68,14,15),(69,0,6),(69,7,5),(69,8,4),(69,9,3),(69,10,2),(69,11,1),(69,12,15),(69,13,14),(70,0,5),(70,6,4),(70,7,3),(70,8,2),(70,9,1),(70,10,15),(70,11,14),(70,12,13),(71,0,4),(71,5,3),(71,6,2),(71,7,1),(71,8,15),(71,9,14),(71,10,13),(71,11,12),(72,0,3),(72,4,2),(72,5,1),(72,6,15),(72,7,14),(72,8,13),(72,9,12),(72,10,11),(73,0,2),(73,3,1),(73,4,15),(73,5,14),(73,6,13),(73,7,12),(73,8,11),(73,9,10),(74,0,1),(74,2,15),(74,3,14),(74,4,13),(74,5,12),(74,6,11),(74,7,10),(74,8,9),(75,15,0),(75,14,1),(75,13,2),(75,12,3),(75,11,4),(75,10,5),(75,9,6),(75,8,7),(76,14,0),(76,13,15),(76,12,1),(76,11,2),(76,10,3),(76,9,4),(76,8,5),(76,7,6),(77,13,0),(77,12,14),(77,11,15),(77,10,1),(77,9,2),(77,8,3),(77,7,4),(77,6,5),(78,12,0),(78,11,13),(78,10,14),(78,9,15),(78,8,1),(78,7,2),(78,6,3),(78,5,4),(79,11,0),(79,10,12),(79,9,13),(79,8,14),(79,7,15),(79,6,1),(79,5,2),(79,4,3),(80,10,0),(80,9,11),(80,8,12),(80,7,13),(80,6,14),(80,5,15),(80,4,1),(80,3,2),(81,9,0),(81,8,10),(81,7,11),(81,6,12),(81,5,13),(81,4,14),(81,3,15),(81,2,1),(82,8,0),(82,7,9),(82,6,10),(82,5,11),(82,4,12),(82,3,13),(82,2,14),(82,1,15),(83,7,0),(83,6,8),(83,5,9),(83,4,10),(83,3,11),(83,2,12),(83,1,13),(83,15,14),(84,6,0),(84,5,7),(84,4,8),(84,3,9),(84,2,10),(84,1,11),(84,15,12),(84,14,13),(85,5,0),(85,4,6),(85,3,7),(85,2,8),(85,1,9),(85,15,10),(85,14,11),(85,13,12),(86,4,0),(86,3,5),(86,2,6),(86,1,7),(86,15,8),(86,14,9),(86,13,10),(86,12,11),(87,3,0),(87,2,4),(87,1,5),(87,15,6),(87,14,7),(87,13,8),(87,12,9),(87,11,10),(88,2,0),(88,1,3),(88,15,4),(88,14,5),(88,13,6),(88,12,7),(88,11,8),(88,10,9),(89,1,0),(89,15,2),(89,14,3),(89,13,4),(89,12,5),(89,11,6),(89,10,7),(89,9,8)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 첫 주 정식 시즌 생성.
--
-- Cup A 시드는 배치 리그 최종 순위를 쓴다. 완전한 동률 처리(상대 전적 →
-- 전체 골득실 → ... → 고정 시드, standings.ts의 7단계)를 SQL로 다시 짜는
-- 대신, 여기서는 승점만으로 순위를 매기는 단순화를 썼다 — 대진 시드
-- 배정에만 쓰이고 실제 경기 결과·보상에는 영향이 없으므로 허용 가능한
-- 근사치로 판단했다. Cup B는 그룹 id로 시드한 결정론적 뒤섞기(무작위 추첨
-- 대신)를 쓴다.
-- ---------------------------------------------------------------------------
create or replace function public.auto_bootstrap_regular_season()
  returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_week_id text := 'regular-2026-09-07';
  v_placement_week_id text := 'placement-2026-09-04';
  v_first_match_at timestamptz := '2026-09-07T00:00:00+09:00'::timestamptz;
  v_tier record;
  v_existing_group bigint;
  v_placement_group bigint;
  v_group_id bigint;
  v_members jsonb;
  v_competitions jsonb;
  v_league_id bigint;
  v_cup_a_id bigint;
  v_cup_b_id bigint;
  v_league_fixtures jsonb;
  v_seed_a text[];
  v_seed_b text[];
  v_a_ties jsonb;
  v_b_ties jsonb;
  v_created_tiers int[] := array[]::int[];
begin
  -- 배치 리그(placement-2026-09-04)가 끝나기 전에는 절대 만들지 않는다 —
  -- 그 전에 만들면 순위가 아직 확정되지 않은 채로 Cup A 시드가 정해진다.
  if now() < v_first_match_at then
    return jsonb_build_object('ok', true, 'weekId', v_week_id, 'createdTiers', array[]::int[], 'reason', 'too early');
  end if;

  perform pg_advisory_xact_lock(hashtext('auto_bootstrap_regular:' || v_week_id));

  perform public.seed_weekly_schedule_slots(v_week_id, (
    select jsonb_agg(jsonb_build_object(
      'index', t.slot_index,
      'day', t.day_of_week,
      'hour', t.local_hour,
      'type', t.type,
      'cupStage', t.cup_stage,
      'leg', t.leg,
      'scheduledAtUtc',
        v_first_match_at
        + (case t.day_of_week
             when 'MON' then 0 when 'TUE' then 1 when 'WED' then 2 when 'THU' then 3
             when 'FRI' then 4 when 'SAT' then 5 when 'SUN' then 6 end) * 24 * interval '1 hour'
        + t.local_hour * interval '1 hour'
    ))
    from public.weekly_regular_slot_template t
  ));

  for v_tier in select tier, max_real_users, ai_base_rating from public.weekly_tier_rules order by tier
  loop
    select id into v_existing_group from public.weekly_league_groups
      where tier = v_tier.tier and week_id = v_week_id limit 1;
    if v_existing_group is not null then
      continue;
    end if;

    select id into v_placement_group from public.weekly_league_groups
      where tier = v_tier.tier and week_id = v_placement_week_id limit 1;
    if v_placement_group is null then
      -- 배치 리그가 이 등급에서 아직 안 만들어졌으면 정식 시즌도 못 만든다.
      continue;
    end if;

    select jsonb_agg(jsonb_build_object(
      'slot', m.slot, 'kind', m.kind, 'userId', m.user_id,
      'clubName', m.club_name, 'badge', m.badge, 'rating', m.rating
    ) order by m.slot) into v_members
    from public.weekly_league_members m
    where m.group_id = v_placement_group;

    v_group_id := public.create_weekly_league_group(v_tier.tier, v_week_id, v_members);
    v_competitions := public.seed_weekly_competitions(v_group_id);
    v_league_id := (v_competitions->>'LEAGUE')::bigint;
    v_cup_a_id := (v_competitions->>'CUP_A')::bigint;
    v_cup_b_id := (v_competitions->>'CUP_B')::bigint;

    -- 리그 90경기: 라운드 순서대로 105슬롯 중 LEAGUE 타입 슬롯에 1:1 배정.
    select jsonb_agg(jsonb_build_object(
      'round', f.round, 'homeSlot', f.home_slot, 'awaySlot', f.away_slot,
      'scheduledAtUtc', s.scheduled_at_utc
    )) into v_league_fixtures
    from public.weekly_league_fixture_template f
    join (
      select row_number() over (order by slot_index) - 1 as league_round, scheduled_at_utc
      from public.weekly_schedule_slots
      where week_id = v_week_id and type = 'LEAGUE'
    ) s on s.league_round = f.round;

    perform public.seed_league_fixtures(v_group_id, v_league_id, v_league_fixtures);

    -- Cup A 시드: 배치 리그 승점 순(단순화 — standings.ts의 완전한 동률
    -- 처리는 대진 시드에는 재현하지 않음).
    select array_agg(slot::text order by points desc, slot asc) into v_seed_a
    from (
      select m.slot,
        coalesce(sum(case
          when f.home_slot = m.slot and f.score_home > f.score_away then 3
          when f.away_slot = m.slot and f.score_away > f.score_home then 3
          when (f.home_slot = m.slot or f.away_slot = m.slot) and f.score_home = f.score_away then 1
          else 0
        end), 0) as points
      from public.weekly_league_members m
      left join public.weekly_fixtures f
        on f.group_id = v_placement_group and f.status = 'played'
        and (f.home_slot = m.slot or f.away_slot = m.slot)
      where m.group_id = v_placement_group
      group by m.slot
    ) ranked;

    -- Cup B 시드: 그룹 id로 결정론적으로 뒤섞은 순서(무작위 추첨 대용).
    select array_agg(slot::text order by md5(v_group_id::text || ':' || slot::text)) into v_seed_b
    from public.weekly_league_members where group_id = v_group_id;

    select jsonb_agg(jsonb_build_object(
      'homeSlot', v_seed_a[i + 1]::int, 'awaySlot', v_seed_a[16 - i]::int,
      'leg1ScheduledAtUtc', (select scheduled_at_utc from public.weekly_schedule_slots
        where week_id = v_week_id and type = 'CUP_A' and cup_stage = 'R16' and leg = 1),
      'leg2ScheduledAtUtc', (select scheduled_at_utc from public.weekly_schedule_slots
        where week_id = v_week_id and type = 'CUP_A' and cup_stage = 'R16' and leg = 2)
    )) into v_a_ties
    from generate_series(0, 7) i;

    select jsonb_agg(jsonb_build_object(
      'homeSlot', v_seed_b[i + 1]::int, 'awaySlot', v_seed_b[16 - i]::int,
      'leg1ScheduledAtUtc', (select scheduled_at_utc from public.weekly_schedule_slots
        where week_id = v_week_id and type = 'CUP_B' and cup_stage = 'R16' and leg = 1),
      'leg2ScheduledAtUtc', (select scheduled_at_utc from public.weekly_schedule_slots
        where week_id = v_week_id and type = 'CUP_B' and cup_stage = 'R16' and leg = 2)
    )) into v_b_ties
    from generate_series(0, 7) i;

    perform public.seed_cup_stage_ties(v_group_id, v_cup_a_id, 'R16', v_a_ties);
    perform public.seed_cup_stage_ties(v_group_id, v_cup_b_id, 'R16', v_b_ties);

    v_created_tiers := v_created_tiers || v_tier.tier;
  end loop;

  return jsonb_build_object('ok', true, 'weekId', v_week_id, 'createdTiers', v_created_tiers);
end $$;

revoke all on function public.auto_bootstrap_regular_season() from public;
revoke all on function public.auto_bootstrap_regular_season() from authenticated;
grant execute on function public.auto_bootstrap_regular_season() to service_role;

select cron.unschedule('auto-bootstrap-regular-season')
  where exists (select 1 from cron.job where jobname = 'auto-bootstrap-regular-season');

-- 배치 리그가 끝나기 전까지는(9/6 23:00 마지막 경기) 배치 순위가 아직
-- 확정되지 않으므로, 시드가 흔들릴 수 있다. 배치 마지막 날 밤부터 10분마다
-- 돌게 해서 배치 종료 직후 곧바로 만들어지게 한다.
select cron.schedule('auto-bootstrap-regular-season', '*/10 * * * *', $$select public.auto_bootstrap_regular_season()$$);
