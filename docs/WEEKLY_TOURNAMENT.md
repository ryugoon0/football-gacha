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
  들여오는 것을 승인한다. — **완료, `settle_due_weekly_fixtures`가 5분마다 돈다.**
- **등급 구조 확정 (2026-09-04).** 실유저가 많지 않아 등급 수 자체를 4단계로
  적게 두고, 등급이 낮을수록(=`TIERS` 인덱스가 클수록) 실유저 상한을 좁히고
  AI 평점도 낮춘다 — 아래쪽 리그일수록 실유저가 약한 AI를 쉽게 이기고 쉽게
  승격해서 기분 좋게 시작하고, 위로 갈수록 실유저 비중과 상대 강도가 함께
  오른다(`lib/weeklyLeague/config.ts`의 `TIERS`, 인덱스 0이 최상위 —
  관리자 화면의 "등급 (0이 최상위)"과 같은 방향).

  | 등급 | 실유저 상한 | AI 기준 평점 |
  | --- | --- | --- |
  | 0 (최상위) | 8명 | 75 |
  | 1 | 4명 | 68 |
  | 2 | 2명 | 61 |
  | 3 (최하위) | 1명 | 54 |

  등급당 리그 인스턴스는 하나면 충분하다고 판단(리그 수를 적게). 서버가
  이 상한을 실제로 강제하고(초과 요청 거부), 관리자 화면도 등급을 고르면
  상한·AI 평점을 바로 보여주고 그 이상 실유저를 못 넣게 막는다.

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

### 리그 생성 자체도 자동화 — 운영자 버튼이 필요 없어짐

사용자가 "자동으로 만들어져야해"라고 명확히 요청해서, 관리자 화면의 수동
버튼 대신 `auto_bootstrap_placement_leagues()`가 10분마다 스스로 실유저를
골라 4개 등급 리그를 전부 만듭니다(`20260904030000_auto_placement_bootstrap.sql`).

- **실유저 선정**: 운영자 계정이 아니고 실제 진행 기록(`saves` 행)이 있는
  사람 중, 이번 주 다른 등급에 이미 배정되지 않은 사람을 상한만큼 뽑습니다.
  **최상위 등급부터 먼저 채워서** "최상위일수록 실유저가 많다"는 규칙을
  그대로 지킵니다.
- **대진 로직은 다시 안 짬**: 라운드로빈 페어링 패턴(어느 라운드에 몇 번
  슬롯끼리 붙는지)은 클럽이 누구인지와 무관하게 항상 같습니다. 이 사실을
  이용해 `generatePlacementFixtures(['0'..'15'])`를 한 번 실행한 실제
  출력값(360행)을 정적 표(`weekly_placement_fixture_template`)로 저장해
  두고, 함수는 그 표와 "이번엔 누가 몇 번 슬롯인지"만 조인합니다 — 알고리즘
  자체를 SQL로 다시 구현하지 않았습니다. `lib/weeklyLeague/placement.ts`가
  바뀌면 이 표도 다시 뽑아 갱신해야 합니다(주석으로 남겨 둠).
- **pg_net·Vault는 안 씀**: Edge Function을 크론에서 직접 부르는 방법도
  검토했지만, 그러려면 서비스 키를 DB 안에 심어야 해서 위험과 복잡도가
  커집니다. 위 정적 표 방식으로 그 필요 자체를 없앴습니다.
- **알려진 한계**: 등급 하나가 이미 만들어지고 나면(=실유저가 다 배정되고
  나머지가 AI로 채워지고 나면) 그 등급은 다시 안 건드립니다. 그래서 4개
  등급이 전부 채워진 뒤 새로 가입하는 실유저는 이번 주 개막 배치 리그에
  자동으로는 못 들어갑니다 — 슬롯 16자리가 이미 확정됐기 때문입니다. 정식
  주간 시스템에서는 신규 가입 시점의 리그 배정 알고리즘을 따로 설계해야
  합니다.
- 실제 운영 DB(비관리자 계정 9명 존재)에 대고 `BEGIN...ROLLBACK`으로
  검증: 4개 등급 그룹·64명(16×4) 멤버·1440경기(360×4) 생성, 재실행 시
  0건 추가(멱등)까지 전부 확인했습니다.

### 정식 시즌(9/7 첫 주) 자동 생성

`supabase/migrations/20260904050000_auto_regular_season_bootstrap.sql`의
`auto_bootstrap_regular_season()`이 10분마다 돌면서, 배치 리그가 끝나면
(`now() >= 2026-09-07T00:00:00+09:00`) 자동으로 리그 90경기 + Cup A/B 16강까지
만듭니다. **첫 주는 배치 리그에 승격·강등이 없었으므로 등급 구성을 그대로
이어받습니다**. 2주차(9/14)부터는 아래의 승격·강등 함수가 이어받습니다.

### 2주차부터 — 직전 주 순위로 승격·강등 (`bootstrap_week_from_previous`)

`supabase/migrations/20260905110000_weekly_promotion_relegation.sql`.
크론 진입점 `auto_bootstrap_next_week()`이 10분마다 돌며, 이번 주 월요일
00:00 KST가 2026-09-14 이후이고 직전 정규 주(`regular-<7일 전>`)의 경기가
모두 정산됐으면 새 주를 만듭니다.

- **순위**: 직전 주 리그 경기 승점 → 골득실 → 득점 → 슬롯 순(첫 주 함수와
  같은 근사).
- **이동**: 등급 간 3팀(`PROMOTION_SPOTS`·`RELEGATION_SPOTS`). 최상위는
  1~13위 잔류 + 아래서 3팀, 최하위는 4~16위 잔류 + 위에서 3팀, 중간은
  4~13위 잔류 + 양쪽 3팀. AI 클럽도 같은 규칙으로 오르내립니다.
- **새 슬롯 번호**: 승격팀 → 잔류팀 → 강등팀 순으로 직전 순위를 유지해
  0..15를 붙이고, 그 순서를 Cup A 시드로 씁니다. Cup B는 그룹 id 뒤섞기.
- **검증**: 배치 리그를 직전 주로 삼아 `p_wait_for_settlement=false`로
  롤백 블록 안에서 실행 — 4개 등급 모두 16팀·752경기(리그 720 + 컵 16강
  32)·컵 16타이가 만들어지는 것을 확인했습니다.

### 안전망 큐를 서버가 비운다 (`drain_stale_weekly_fixtures`)

실유저가 낀 경기는 Edge Function만 정산할 수 있어서, 예전엔 누군가 앱을
열어 `weekly-fixture-live`를 호출해야 큐가 비워졌다(대안 B). 이제 pg_cron이
5분마다(`2-59/5`) pg_net으로 같은 함수의 `drain_stale` 액션을 호출한다.
인증은 전용 공유 토큰 `x-drain-token`(Edge Function 비밀
`WEEKLY_DRAIN_TOKEN` = Vault `drain_token`)이고, 게이트웨이 JWT 자리에는
공개 anon 키(Vault `anon_key`)를 보낸다. 큐가 비어 있으면 호출하지 않는다.
토큰을 바꾸려면 두 곳(Vault, `supabase secrets set`)을 같이 바꾼다.

### 지난 주 결과 배너 (`lib/weeklyLeague/recap.ts`)

새 주 그룹에 들어간 뒤 처음 경쟁 리그 탭을 열면 직전 주 그룹의 최종
순위(`standings()` 재계산)와 등급 이동(승격/강등/잔류)을 배너로 보여 주고,
비서 셋이 각자 말투로 같은 사실을 말한다. 「확인」을 누르면 그 주 id가
localStorage에 남아 다시 뜨지 않는다.

### 징계 (`weekly_discipline`)

엔진이 파울마다 파울 선수를 고르고(수비수·미드필더 우대, 주 난수 1회는
예전과 동일), 파울 자체에서 시드를 딴 보조 난수로 경고(12%)·직접 퇴장(1%)을
냅니다. 경고 2장이면 퇴장. 퇴장당한 쪽은 이후 슛·도움·파울에서 빠지고 전력이
퇴장 1명당 9% 줄어듭니다. 저장된 시드의 점수는 바뀌지 않습니다.

- 캐주얼: 카드에 `suspendedFor`(출전정지)·`yellows`(시즌 경고)가 붙고,
  `isSidelined()`가 부상과 함께 출전 불가를 판단합니다. 새 시즌에 초기화.
- 경쟁 리그: 실유저 슬롯의 카드만 `weekly_discipline`에 누적. 킥오프 스냅샷을
  만들 때 `ban_matches > 0`인 선수는 부상으로 처리돼 자동 교체가 빼고, 그
  경기가 정산되면 1 줄어듭니다. 규칙은 `DISCIPLINE_RULES`(경고 4장 → 1경기,
  경고 누적 퇴장 → 1경기, 직접 퇴장 → 1~3경기).
- 경쟁 리그 탭 「내 경기」 상단에 내 클럽의 출전정지·경고 현황이 보입니다.

### 주간 시즌 마감 — 순위·컵·마스터스 보상, 베스트 일레븐, 개인상 (`close_weekly_groups`)

`supabase/migrations/20260906050000_weekly_season_honours.sql` (2026-09-06). 한 주가
한 시즌이다. 경기마다 쌓이는 골드(`rewardsForFixture`)와 주 종료 카드 보상
(`grant_weekly_card_rewards`) 위에 시즌 보상을 얹었다.

- **평점 기록**: 엔진으로 정산되는 경기마다 선발 전원의 평점·포지션·골·도움을
  `weekly_player_ratings`에 적는다(`commit_weekly_fixture_result`의 `p_ratings`,
  `ratingsOf`). AI 대 AI(포아송) 경기는 기록이 없다.
- **베스트 일레븐** `weekly_best_eleven(group_id)`: 출전 3경기 이상 선수의 평점을
  6.0 쪽으로 가상 6경기만큼 당긴 점수(`bestElevenScore`)로 정렬해 GK 1·DF 4·MF 3·FW 3,
  모자라는 줄은 나머지 최고점으로 채운다. 클라이언트도 이 함수로 "현재 기준"을
  본다(선수 순위 탭). 규칙 상수는 `lib/weeklyLeague/rewards.ts`에 있고 SQL이 그대로
  옮겼다 — 바꾸면 둘 다.
- **마감** `close_weekly_groups()` (10분 cron): `regular-*` 주의 그룹 중 그 주 마지막
  슬롯(일요일 23시)이 20분 이상 지났고 pending이 없는 그룹을 마감한다. 순위 1~16
  보상(6개 구간 노브), Cup A/B 우승·준우승, 마스터스 우승(무승부면 홈=Cup A 우승),
  베스트 일레븐 보유 감독에게 선수당, 득점왕·도움왕·MVP왕 보유 감독에게 각각을
  `weekly_rewards`에 `fixture_id null`·`ref`로 넣고(기존 「보상 받기」가 그대로 수령),
  같은 사실을 `weekly_honours`에 남긴다(AI 클럽도 명예에는 오름). 그룹은
  `status='finished'`. 배치 리그(`placement-*`)는 대상이 아니다.
- **금액**: `seasonAmount` = 노브(0등급 기준) × `weeklyTierMultiplier<tier>` ×
  `competitiveGoldMultiplier`. 노브는 `game_config`에서 읽고 없으면 `lib/tuning.ts`
  기본값(SQL `_weekly_knob`에 같은 값이 하드코딩돼 있으니 기본값을 바꾸면 같이).
  운영자 「보상」 탭에 등급별 시즌 보상표가 미리보기로 붙어 있다.
- **화면**: 경쟁 리그 탭 「팀 순위」에 이번 주 시즌 보상표와 지난 주 명예
  (내가 있던 그룹의 `weekly_honours`), 「선수 순위」에 현재 기준 베스트 일레븐,
  보상 배너에 시즌 보상 줄 요약, 지난 주 결과 배너에 내 수상 칩.
- **검증**: 운영 DB에 대고 `BEGIN…ROLLBACK`(예외로 되돌림)으로 실유저 14명 그룹을
  강제 마감 — 명예 17줄(순위 3 + 개인상 3 + 베스트 일레븐 11), 보상 줄, 1-4-3-3
  선발, 재실행 시 0건(멱등)까지 확인했다.

### 득점 순위 (`weekly_goal_scorers`)

실제 엔진으로 정산되는 경기(실유저가 낀 경기)는 득점자를 카드 uid로
알기 때문에, Edge Function이 `scorersOf(replay)`로 선수 id·이름으로 풀어
`commit_weekly_fixture_result(..., p_scorers)`에 넘기고 fixture당 (슬롯,
선수)별 골 수를 적습니다. 경쟁 리그 탭 「선수 순위」가 그룹 단위로
합산해 득점왕 표를 보여줍니다. AI 대 AI(포아송) 경기는 득점자가 없어
집계에서 빠집니다.

- **시간 가드가 핵심**: 이 함수를 만들면서 처음에 실수할 뻔했습니다 —
  가드 없이 그냥 크론에 걸면 오늘 밤부터 10분마다 돌면서 배치 리그가 채
  끝나기도 전에 0-0 순위로 정식 시즌을 만들어버립니다. `now() <
  v_first_match_at`이면 그냥 `{reason: 'too early'}`를 반환하고 아무것도
  안 하도록 막았습니다.
- **대진 패턴도 정적 표**: `weekly_regular_slot_template`(105행,
  `buildWeeklySlots()` 출력)과 `weekly_league_fixture_template`(720행,
  `generateLeagueFixtures(['0'..'15'])` 출력)을 그대로 저장해 두고
  조인만 합니다 — 배치 리그와 같은 원칙.
- **Cup A 시드는 배치 리그 승점 순**(단순화 — `standings.ts`의 7단계 완전
  동률 처리는 대진 시드까지는 재현하지 않음, 실제 보상·결과에는 영향 없음).
  **Cup B는 그룹 id로 결정론적으로 뒤섞은 순서**(무작위 추첨 대신).
- 검증: 실제 운영 DB에 대고 배치 리그 일부 경기를 임시로 `played`로
  바꿔(테스트 전용, 롤백으로 되돌림) `BEGIN...ROLLBACK` 안에서 시간 가드를
  뺀 테스트 전용 함수로 전체 흐름(4개 그룹·16명씩·리그 720경기·컵 16강
  16타이·재실행 멱등성)을 검증했습니다.

**아직 못 만든 것**:
- 선수단 상태 초기화(스펙 6절) — `sourceCompetitionId`/`sourceFixtureId`/
  `isTransitionEffect`/`expiresAt` 필드가 붙을 실제 상태 저장소(선수 체력·
  컨디션·부상·징계) 자체가 아직 없습니다. 지금 근사 정산은 그런 상태를
  아예 다루지 않습니다(평점만 봄) — 진짜 엔진이 붙을 때 같이 설계합니다.
- 진짜 엔진 기반 정산(스냅샷 잠금 → 시뮬레이션 → 결과 기록)과 그 전제인
  "이 리그용 스쿼드 저장 화면" 자체.
- 징계(카드 누적) 시스템, 도움·MVP 개인 기록 — 아직 없습니다. (승격·강등,
  컵 자동 진행, Masters Final, 사용자 화면, 득점 순위는 그 뒤에 들어왔습니다.)
  관리자 화면의 수동 생성 버튼(`WeeklyLeaguePanel`)은 자동 생성으로 대체돼
  필요할 때만 쓰는 보조 수단으로 남아 있습니다.

## 체력 (2026-09-06 추가)

경쟁 리그 경기는 세이브를 직접 고치지 않으므로, 정산이 세이브 밖의 원장에 "누가
뛰었나"만 적는다(`weekly_wear`: user_id, fixture_id, starters[], subs[], applied_at).
Edge Function `weekly-fixture-live`가 확정할 때 `wearOf(snapshot, replay)`로 킥오프
11명과 교체 투입을 뽑아 `commit_weekly_fixture_result(p_wear)`에 넘긴다. AI 쪽은
줄이 없다.

클라이언트(`components/WeeklyWearSync.tsx` → `lib/weeklyWear.ts`)는 로그인·5분마다·
탭 복귀 때 `applied_at is null`인 줄을 읽어 경기 순서대로 반영하고
`ack_weekly_wear(ids)`로 잠근 뒤 바로 클라우드 저장한다. 반영 규칙은 경기당이며
시간 회복은 없다(사용자 결정, 2026-09-06):

| 노브 | 기본값 | 대상 |
| --- | --- | --- |
| `weeklyDrainStarter` | 6 | 킥오프 11명 |
| `weeklyDrainSub` | 3 | 교체 투입 |
| `weeklyRestRecover` | 8 | 그 경기에 뛰지 않은 모든 카드(벤치·보관함) |

같은 11명으로 하루 15경기를 다 뛰면 90이 빠지도록 잡았다. 「내 경기」 상단에
규칙이 현재 노브 값으로 보인다.

### 킥오프 명단에서 부상·정지 걷어내기 (2026-09-06)

`kickoffSquadOf` = `applyAutoSubs`(부상·정지·지친 선발 ↔ 벤치) → `clearSidelined`
(`lib/autoSub.ts`). 두 번째 단계가 (1) 벤치가 못 메운 부상 선발을 보관함에서 그
슬롯 적합도 순으로, (2) 벤치에 남은 부상 카드를 "선발에 가장 많은 클럽" 카드
우선(골키퍼 자리는 골키퍼)으로 채운다. 같은 인물(`person`)은 18명 안에 한 번만.
채울 카드가 없으면 자리를 비운다(빈 슬롯은 아카데미 대체 38). 자동 교체를 꺼도
부상·정지만은 빠진다(지친 기준 −1). 출전정지는 handler의 `withBans`가 injuredFor≥1로
표시하므로 같은 길을 탄다.

## 스쿼드 레벨 상한 = 경쟁 리그 등급 (2026-09-07)

선발 레벨 합 상한(`lineupCapOf`)의 키는 이제 캐주얼 디비전이 아니라 경쟁 리그 등급이다.
`lib/squad.ts capDivisionOfTier(tier)`가 등급 0~3을 상한 행 1~4(110·89·77·66)에 대응시키고,
클라이언트는 `GameState.weeklyTier`(접속 때 `WeeklyTierSync`, 경쟁 리그 탭 로드 때 동기화)로
`lineupDivisionOf(state)`를 쓴다. 서버는 weekly-fixture-live가 그룹 tier로, simulate-match /
simulate-pvp-match가 세이브의 `weeklyTier`로 같은 함수를 부른다. 미배정은 최하위 등급 기준.
캐주얼 디비전은 상대 강도·보상에만 남는다.

## 테스트 결과

```
npx tsc --noEmit    → 통과
npx vitest run      → 488/488 통과 (weeklyLeague 26 + persistence 12 + placement 17 + generatePlacementLeagueFunction 16 포함)
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
- 등급별 실유저 상한(`TIERS`)은 서버·관리자 화면 양쪽에서 강제되지만,
  "새 유저가 가입하면 자동으로 적절한 등급의 리그에 배치"하는 로직은
  없습니다 — 지금은 운영자가 관리자 화면에서 유저 ID를 직접 넣습니다.
- 일반 사용자용 화면(순위표·경기 결과 열람)이 전혀 없습니다. 지금 라이브
  싱글플레이 화면과 어떻게 공존할지도 미정입니다.
- pg_cron이 5분마다 도는 비용 감각을 지켜봐야 합니다 — fixture가 없으면
  즉시 빈 루프로 끝나 저렴하지만, 여러 등급이 동시에 돌면 늘어납니다.

**독창성 검토**: 대회명은 `TOURNAMENT_NAMES`(Cup A/Cup B/Masters Final)로
설정에서 교체 가능하게 뒀고, 실제 게임의 UI·문구·자산을 참고하지 않고
스펙 문서만으로 작성했습니다.
