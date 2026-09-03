-- 개막 배치 리그 — 정규 주간 시스템이 월요일부터 시작하는데 지금은 그렇지
-- 않아서, 금·토·일 사흘만 한 번 도는 다리 역할의 리그(docs/WEEKLY_TOURNAMENT.md).
-- 대진 생성 알고리즘 자체는 lib/weeklyLeague/placement.ts에만 있다.
--
-- 어제 만든 weekly_tournament 마이그레이션의 테이블은 아직 운영 데이터가
-- 하나도 없어서(방금 배포됐다), CHECK 제약을 넓히는 게 안전하다.

alter table public.weekly_competitions drop constraint if exists weekly_competitions_type_check;
alter table public.weekly_competitions
  add constraint weekly_competitions_type_check
  check (type in ('OPENING_PLACEMENT', 'LEAGUE', 'CUP_A', 'CUP_B', 'MASTERS_FINAL'));

alter table public.weekly_schedule_slots drop constraint if exists weekly_schedule_slots_type_check;
alter table public.weekly_schedule_slots
  add constraint weekly_schedule_slots_type_check
  check (type in ('OPENING_PLACEMENT', 'LEAGUE', 'CUP_A', 'CUP_B', 'MASTERS_FINAL'));

-- 요구사항 9: 구형 일정과 신규 일정을 구분할 값. week_id 자체가 이미
-- 배치 리그는 고정된 한 번짜리 값(config.ts의 TRANSITION_SCHEDULE 기준)을
-- 쓰고 정규 주는 실제 ISO 주차를 쓰므로 서로 겹칠 일이 없지만, 명시적인
-- 버전 컬럼도 남겨 둔다 — 나중에 스케줄 생성 규칙 자체가 바뀌면 이 값으로
-- 구분한다.
alter table public.weekly_league_groups
  add column if not exists schedule_version smallint not null default 1;

comment on column public.weekly_league_groups.schedule_version is
  '스케줄 생성 규칙 버전. 지금은 전부 1 — 규칙이 바뀌면 새 값을 쓰고 옛 값은 그대로 둔다.';
