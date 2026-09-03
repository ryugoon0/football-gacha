# 주간 리그·컵 대회 시스템

사용자가 2026-09-03에 직접 제시한 상세 스펙의 구현 기록입니다. 기존
`docs/LEAGUE_MATCHING_DESIGN.md`(PR3, 20팀 단일 라운드로빈 위의 실유저 매칭)는
이 스펙으로 폐기·대체됐습니다.

## 기존 구조와의 관계 — 완전히 새 네임스페이스

`lib/league.ts` · `lib/cup.ts` · `lib/schedule.ts`는 지금 라이브로 도는
싱글플레이 시즌이 그대로 걸려 있어 **건드리지 않았습니다.** 이 대회 시스템은
`lib/weeklyLeague/` 아래 완전히 별도로 추가됩니다. 두 시스템이 같은 화면에서
어떻게 공존할지(새 탭/모드로 노출할지, 기존 로컬 시즌을 언제 은퇴시킬지)는
아직 정하지 않았습니다 — UI 단계에서 결정합니다.

## 확정된 결정 (사용자 승인)

- PR3 설계는 폐기하고 이 스펙으로 진행한다.
- 유저 미접속 시 자동 진행을 위한 크론 인프라(Supabase pg_cron 등)를 지금
  들여오는 것을 승인한다. — **아직 실제로 들여오지 않음, Phase 3의 일.**
- 등급(디비전)별 리그 인스턴스당 실유저 상한: 최하위 리그 1명, 그 위 리그
  2명, 나머지 등급은 미정(`lib/weeklyLeague/config.ts`의 `TIER_MAX_REAL_USERS`).
  유저가 모자라도 등급별 리그 자체는 열고 나머지를 AI로 채운다.

## Phase 1 — 완료 (순수 함수, DB·크론 없음)

새 파일:

| 파일 | 내용 |
| --- | --- |
| `lib/weeklyLeague/config.ts` | 중앙 설정 — 요일·시각별 105개 슬롯 표, 16팀·90라운드·승강 규칙, 컵 시딩 방식, 징계 기본값(기존 프로젝트에 징계 규칙 없음을 확인 후 스펙 기본값 사용), 등급별 실유저 상한 |
| `lib/weeklyLeague/schedule.ts` | 105개 전역 슬롯 조립, 16팀 대진(더블 라운드로빈 3회 = 6사이클, 상대별 3홈·3원정) 생성 후 90개 리그 슬롯에 배정 |
| `lib/weeklyLeague/cup.ts` | 컵 브래킷 진행기 — 16강 시작(조별리그 없음), R16/QF/SF 2차전 + 결승 단판, 원정 다득점 미적용, 합산 동점일 때만 연장전·승부차기, 탈락 구단은 다음 라운드 대진에서 제외 |
| `lib/weeklyLeague/standings.ts` | 순위표 + 7단계 동률 처리(상대 전적 승점·골득실 → 전체 골득실·득점 → 승리 수 → 페어플레이 → 고정 시드) |
| `lib/weeklyLeague/mastersFinal.ts` | Masters Final 대진 선정 — 두 컵 우승 구단이 같으면 합산 성적 1위인 구단을 상대로 선정, 선정 근거를 `runnerUpRanking`에 그대로 남김 |
| `tests/weeklyLeague.test.ts` | 26개 테스트, 요구사항 11절의 20개 검증 중 순수 함수로 표현 가능한 항목 전부 커버 |

### 일정 생성 방식

`WEEKLY_SLOTS`(설정 파일에 요일·시각 순으로 미리 적어 둔 105개 슬롯 표)를
그대로 순서대로 훑어 90개 LEAGUE 슬롯만 추립니다. 리그 대진은 원의 방법(circle
method)으로 16팀 단일 라운드로빈(15라운드)을 한 번 만들고, 그 홈/원정을
반전한 버전을 하나 더 만들어 "더블 라운드로빈"(상대당 1홈·1원정, 30라운드)을
구성한 뒤 이걸 3번 반복 — 3 × (1홈+1원정) = 상대당 정확히 3홈·3원정, 총
90라운드. 이 90라운드를 90개 리그 슬롯에 순서대로 1:1 배정합니다. 난수를 전혀
쓰지 않아 같은 구단 순서를 넣으면 항상 같은 대진이 나옵니다(멱등).

### 컵 진출·탈락 처리 방식

`CupBracket` 상태에 현재 스테이지의 대진(`ties`)과 지나간 스테이지의 완료된
대진(`history`)을 갖고 있습니다. 1차전(`recordFirstLeg`)은 점수만 기록하고
승자를 정하지 않습니다. 2차전(`recordSecondLeg`)에서 합산을 계산해 — 다르면
그대로, 같으면 연장전 스코어로, 그래도 같으면 승부차기로 승자를 정합니다(각
단계가 실제로 필요했는지는 검증하고, 불필요한 연장전/승부차기 데이터가 들어오면
거부합니다). 결승(`recordFinal`)은 단판으로 같은 규칙을 적용합니다. 한
스테이지의 모든 대진이 끝나면 `advanceStageIfDone`이 승자만으로 다음 스테이지
대진을 만듭니다 — 탈락한 구단은 그 목록에 아예 없으므로 다음 라운드 슬롯에
자동으로 나타나지 않습니다. 대체 경기(친선전 등)를 만드는 코드 자체가 없습니다.

## Phase 2 — 영속화 (스키마 완료, 배정·정산 로직은 아직)

`supabase/migrations/20260904000000_weekly_tournament.sql`(`supabase/schema.sql`
9절에도 반영) — `weekly_league_groups` / `weekly_league_members` /
`weekly_schedule_slots` / `weekly_competitions` / `weekly_fixtures` /
`weekly_cup_ties` 여섯 테이블과, 대진을 저장만 하는 4개 RPC
(`seed_weekly_schedule_slots` / `create_weekly_league_group` /
`seed_weekly_competitions` / `seed_league_fixtures` / `seed_cup_stage_ties`,
전부 service_role 전용).

**컵 8강부터는 한 번에 안 만듭니다.** 요구사항 10절("2차전 결과가 나오기
전에는 다음 라운드 대진을 확정하지 않는다")을 그대로 따라, 그룹 생성 시점에는
리그 90경기와 컵 16강만 저장하고, 8강·4강·결승은 이전 스테이지가
`advanceStageIfDone`으로 정해진 뒤 `seed_cup_stage_ties`를 그 스테이지에 대해
한 번 더 호출해서 만듭니다 — 미리 빈 자리를 예약해두는 대신, 필요해지는
시점에만 fixture를 만드는 방식으로 같은 요구사항을 만족시켰습니다.

각 RPC는 "이미 있으면 그대로 둔다"로 멱등성을 보장합니다(재실행해도 중복
안 생김 — 요구사항 20). `lib/weeklyLeague/persistence.ts`가 Phase 1의 순수
함수 출력(GlobalSlot·LeagueFixtureDef·CupBracket)을 이 RPC들이 기대하는
JSONB 모양으로 바꾸는 매핑을 담당하고, `tests/weeklyLeaguePersistence.test.ts`
(12개)로 검증했습니다 — KST↔UTC 변환, club id↔슬롯 번호 매핑, 리그/컵
스케줄 시각 배정을 확인합니다.

**마이그레이션은 `BEGIN ... ROLLBACK`으로 실제 운영 DB에 대고 먼저 검증했습니다**
(스키마 생성 + 그룹·대회·리그 8경기·컵 R16 8타이 생성 + 재실행 시 0건 삽입
확인). 검증 중 실제로 버그 하나를 잡았습니다: `weekly_fixtures`의 "한 구단이
같은 시각에 중복 경기 없음" 유니크 인덱스가 대회 종류와 무관하게 걸려
있어서(의도한 대로 — 리그든 컵이든 실제로 같은 시각에 두 경기를 할 수는
없음), 스모크 테스트 데이터가 리그와 컵 fixture에 같은 시각을 썼다가 그
제약에 걸렸습니다 — 스키마 버그가 아니라 테스트 데이터 버그였고, 고치고
재검증했습니다.

**이 커밋을 푸시하면서 이 저장소의 자동 배포(`.github/workflows/supabase.yml`)가
실제로는 안 돌고 있었다는 걸 발견했습니다.** PR2(`64bfd7f`)의 마이그레이션이
main에 올라간 뒤로도 운영 DB에 반영 안 돼 있었고(`match_results` 테이블
자체가 없었음), `simulate-match` Edge Function도 배포된 적이 없었습니다 —
즉 PR2 이후 리그·컵 경기를 실제로 플레이했다면 전부 실패했을 것입니다. 둘
다 이 자리에서 수동으로 고쳤습니다: `supabase db push --linked --yes
--include-all`로 PR2 마이그레이션과 이 마이그레이션을 함께 반영했고(순서가
꼬여 있어 `--include-all`이 필요했습니다 — 아마 사용자님의 로컬 세션이 PR2
병합 전에 한 번 `db push`를 돌려서 그 뒤 마이그레이션만 먼저 올라간 것으로
보입니다), `supabase functions deploy simulate-match`로 함수를 처음
배포했습니다. 자동 배포가 왜 안 돌았는지는 확인 못 했습니다 — GitHub Actions
탭에서 직접 봐야 합니다(ROADMAP.md 5절 11번 참고).

남은 것:
- Edge Function(대진 생성기) — Phase 1 순수 함수 + persistence.ts 매핑을
  실제로 호출해서 이 RPC들에 보내는 서버 함수가 아직 없습니다.
- 요구사항 19(같은 스냅샷·시드 재실행 시 동일 결과)는 이미 있는 PR2
  (`supabase/functions/simulate-match`)의 시드 재현 구조를 재사용할
  계획이지만, 이 스케줄과 엮어 검증하는 테스트는 아직 없습니다.
- 컵 fixture 결과를 실제로 기록하고 `weekly_cup_ties`의 합산·승자·`decidedBy`를
  갱신하는 정산 RPC/로직이 아직 없습니다(지금 RPC는 대진 "저장"까지만).

## 개막 배치 리그 (2026-09-03 추가 요청)

정규 시즌이 월요일부터 시작하는데 지금(2026-09-03)은 월요일이 아니라서,
금·토·일 사흘만 한 번 도는 일회성 다리 리그입니다. 전부 절대 시각으로
관리합니다(`lib/weeklyLeague/config.ts`의 `TRANSITION_SCHEDULE` — "오늘"·
"내일" 같은 상대값은 쓰지 않음).

새 파일:
- `lib/weeklyLeague/placement.ts` — 45슬롯 조립, 16개 구단 360경기(3사이클
  라운드로빈) 생성, 보상 배율, Cup A 시드 핸드오프.
- `supabase/migrations/20260904010000_opening_placement_league.sql` — 어제
  만든 `weekly_competitions`/`weekly_schedule_slots`의 type CHECK를
  `OPENING_PLACEMENT`까지 넓히고, `weekly_league_groups`에 `schedule_version`
  컬럼 추가(요구사항 9).
- `tests/weeklyLeaguePlacement.test.ts` — 17개 테스트.

**홈/원정 밸런싱이 처음 짠 대로는 안 맞았습니다.** 1·2사이클(기본+완전반전)은
상대당 1홈·1원정이 자동으로 보장되지만, 3사이클째는 `schedule.ts`의
`singleRoundRobin`(원의 방법)이 입력 배열의 첫 팀을 매 라운드 고정 홈으로
두는 편향을 그대로 물려받아, 그리디("누적 홈이 적은 쪽에 홈")만으로는 실제로
24~21회까지 벌어졌습니다(테스트로 직접 확인). "홈 쪽이 원정 쪽보다 2 이상
많은 경기를 더는 없을 때까지 뒤집는" 교정 패스를 추가해서 8팀 23·8팀 22로
정확히 맞췄습니다.

**DB 마이그레이션은 실제 운영 DB에 대고 BEGIN/ROLLBACK으로 검증한 뒤 반영까지
마쳤습니다** — `OPENING_PLACEMENT` 타입 삽입, 기존 타입(`LEAGUE`)이 여전히
통과하는지, 아무 타입이나 넣으면 여전히 거부되는지까지 확인했습니다.

### 대진 생성 Edge Function — 운영자 전용

`supabase/functions/generate-placement-league` — 운영자가 호출하면 그 자리에서
배치 리그 그룹 하나(등급·실유저 목록을 넘김)를 만들고 45슬롯 + 360경기까지
전부 저장합니다. 실유저 자동 매칭 알고리즘은 없습니다 — 이번 세션 초반의
결정("admin은 직접 입력으로 충분")을 그대로 따라, 운영자가 넣을 실유저
목록(`{userId, clubName, rating}`)을 직접 넘기고 나머지 자리는 `lib/league.ts`의
`CLUB_POOL`에서 AI로 채웁니다.

- 인증: 호출자 토큰으로 `/auth/v1/user` 확인 후, **호출자 본인 토큰으로**
  `is_admin()` RPC를 불러 운영자인지 확인합니다(`is_admin()`은
  `auth.uid()`를 보므로 서비스 키로 부르면 항상 거짓이 나옵니다 — 반드시
  호출자 토큰).
- 실제 저장은 서비스 키로 어제 만든 RPC 4개(`create_weekly_league_group` →
  `seed_weekly_schedule_slots` → `seed_weekly_competitions` →
  `seed_league_fixtures`)를 순서대로 부릅니다. 대진 생성 로직 자체는
  `lib/weeklyLeagueServer.ts`가 번들한 `shared.js` 하나뿐입니다.
- **재호출해도 그룹이 두 번 생기지 않습니다.** `create_weekly_league_group`
  자체는 멱등하지 않아서(부를 때마다 새 행을 만듦), 함수가 부르기 전에
  같은 (tier, week_id) 그룹이 이미 있는지 먼저 조회하고 있으면 그걸 그대로
  씁니다 — 실유저가 같은 배치 리그에 두 번 들어가는 사고를 막습니다.
- `week_id`는 `TRANSITION_SCHEDULE.cutoverAt`의 날짜 부분에서 고정으로
  만듭니다(`placement-2026-09-04`) — 등급이 여러 개여도 같은 주의 105슬롯
  테이블은 한 번만 만들어지고 공유됩니다.
- `tests/generatePlacementLeagueFunction.test.ts` 13개로 검증(관리자 확인,
  실유저+AI 채움, 중복 그룹 방지, 잘못된 입력 거부 등).

`.github/workflows/supabase.yml`에 이 함수의 배포 스텝과 `lib/weeklyLeague/**`
트리거 경로를 추가했습니다.

### 경기 자동 정산 — pg_cron, 임시 근사치

`supabase/migrations/20260904020000_weekly_fixture_settlement.sql`이
`pending`이고 시각이 지난 fixture를 5분마다 자동으로 정산합니다
(`cron.schedule('settle-weekly-fixtures', '*/5 * * * *', ...)`). 이제
운영자가 배치 리그를 만들어 두면 사람이 접속하지 않아도 경기가 실제로
진행됩니다.

**중요한 단순화 — 정식 엔진이 아닙니다.** 이 리그용 스쿼드를 유저가 저장하는
화면 자체가 아직 없어서(선발 11명·전술을 이 시스템에 제출한 사람이 아무도
없음), 카드·전술 기반 엔진(`lib/matchEngine.ts`)으로 정산할 데이터가 없습니다.
대신 `weekly_league_members.rating`(평점) 하나로 `lib/league.ts`의
`simulateAiMatch`와 같은 포아송 모델을 SQL 함수(`_weekly_poisson_goal`)로
옮겨 임시로 씁니다 — "로직은 한 벌"이라는 이 프로젝트 원칙에서 벗어나는
걸 알면서 하는 선택이고, 실제 스쿼드 제출 기능이 생기면 이 함수를 은퇴시키고
Edge Function 기반(진짜 엔진, 진짜 재현 가능한 시드)으로 옮겨야 합니다.
`simulation_seed` 컬럼은 이 경로에서는 채우지 않습니다 — PR2의 진짜 시드
재현과 헷갈리지 않도록 하기 위해서입니다.

검증 중 실제 버그를 하나 더 잡았습니다: `seed_weekly_competitions`가
`OPENING_PLACEMENT` 타입 CHECK를 넓힌 뒤에도 그 타입의 대회 행을 만들지
않고 있었습니다 — 이미 배포된 `generate-placement-league` 함수가 이 버그에
그대로 걸리는 상태였고, 이번 마이그레이션에 같이 수정했습니다.

**아직 못 만든 것**:
- 선수단 상태 초기화(스펙 6절) — `sourceCompetitionId`/`sourceFixtureId`/
  `isTransitionEffect`/`expiresAt` 필드가 붙을 실제 상태 저장소(선수 체력·
  컨디션·부상·징계) 자체가 아직 없습니다. 지금 근사 정산은 그런 상태를
  아예 다루지 않습니다(평점만 봄) — 진짜 엔진이 붙을 때 같이 설계합니다.
- 진짜 엔진 기반 정산(스냅샷 잠금 → 시뮬레이션 → 결과 기록)과 그 전제인
  "이 리그용 스쿼드 저장 화면" 자체.
- 징계(카드 누적) 시스템, 리그 배정 알고리즘(`TIER_MAX_REAL_USERS` 적용),
  일반 사용자용 화면(순위표·경기 결과 열람) — 전부 아직 없습니다.

## 테스트 결과

```
npx tsc --noEmit    → 통과
npx vitest run      → 485/485 통과 (weeklyLeague 26 + persistence 12 + placement 17 + generatePlacementLeagueFunction 13 포함)
npx next lint       → 경고·오류 없음
npm run build       → 성공
```

정산 마이그레이션(포아송 함수·pg_cron 등록)은 순수 SQL이라 vitest 대상이
아니고, 대신 `BEGIN...ROLLBACK` 안에서 실제 정산 결과(상태·점수·재실행
멱등성)를 명시적 `assert`로 검증했습니다.

## 남은 위험 요소와 후속 작업
- 이 리그용 스쿼드 저장 화면 + 진짜 엔진 기반 정산으로 근사 정산을 교체.
- 요구사항 7의 "전술이 행동에 영향을 준다"는 ROADMAP 4절에서 이미 대부분
  구현된 것으로 확인된 부분(`lib/tactics/*`)과 맞닿아 있어, 재작성이 아니라
  연결만 하면 될 가능성이 높습니다 — 실제 확인은 아직 안 함.
- 징계(카드 누적) 시스템은 스펙 기본값을 `config.ts`에 넣어만 뒀고, 실제로
  카드 발생·누적·정지를 적용하는 로직은 아직 없습니다.
- 리그 배정 알고리즘(등급별 실유저 상한을 실제로 적용해 새 유저를 리그
  인스턴스에 배치하는 로직)은 아직 없습니다 — `TIER_MAX_REAL_USERS`에 값만
  받아 뒀습니다.
- 일반 사용자용 화면(순위표·경기 결과 열람)이 전혀 없습니다. 지금 라이브
  싱글플레이 화면과 어떻게 공존할지도 미정입니다.
- pg_cron이 5분마다 도는 비용 감각을 지켜봐야 합니다 — fixture가 없으면
  즉시 빈 루프로 끝나 저렴하지만, 여러 등급이 동시에 돌면 늘어납니다.

**독창성 검토**: 대회명은 `TOURNAMENT_NAMES`(Cup A/Cup B/Masters Final)로
설정에서 교체 가능하게 뒀고, 실제 게임의 UI·문구·자산을 참고하지 않고
스펙 문서만으로 작성했습니다.
