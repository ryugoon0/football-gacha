-- 라이브 개입에 "지친 선수 자동 교체" 명령을 추가한다.
--
-- 캐주얼 모드의 같은 버튼과 같은 규칙(lib/autoSub.ts, liveTired 노브)이고,
-- 누구를 빼고 넣을지는 서버가 그 시점의 실제 체력으로 정한다 — 그래서
-- payload가 비어 있다. 자동교체를 켜 둔 감독은 명령 없이도 매 정지마다
-- 같은 규칙이 돈다(lib/weeklyLeague/liveReplay.ts).
alter table public.weekly_fixture_commands drop constraint if exists weekly_fixture_commands_kind_check;
alter table public.weekly_fixture_commands
  add constraint weekly_fixture_commands_kind_check
  check (kind in ('tactic', 'substitution', 'autosub'));
