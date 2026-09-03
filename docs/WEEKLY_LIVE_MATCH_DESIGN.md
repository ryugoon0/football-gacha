# 주간 리그 실시간 경기 진행 설계

2026-09-04 새벽 세션에서 확정한 설계다. **아직 아무 마이그레이션도 적용하지
않았고 코드도 안 건드렸다** — "확인이 필요한 것들은 변경 수행하지 말고 설계만
해놓고 대기해"라는 지시에 따라 문서만 최대한 구체적으로 다듬었다. 실제
구현 착수는 아래 "결정해 주셔야 하는 것" 절의 답을 받은 뒤다.

핵심 요구사항(사용자 원문): "두명의 실 유저가 캐주얼 모드처럼 경기에 개입을
하고 전술 변경, 교체 등을 통해 영향을 받는걸 체감해야해", "가능하면 작전카드도
구현해줬으면 해".

## 결정해 주셔야 하는 것 (구현 착수 전 필수)

1. **예약 실행 방식** — 아래 "서버 진행 메커니즘"의 세 대안 중 하나를 골라야
   한다. 권장은 대안 B(트래픽 캐치업 + 5분 안전망 cron)다. Scheduled Edge
   Function이 이 프로젝트 Supabase 플랜에서 실제로 되는지는 대시보드를
   열어 확인해야 아는 사실이라 이 세션에서는 결론을 못 냈다.
2. **양방향 확장을 실유저 대 실유저 매치에만 켤지, 실유저 대 AI에도 켤지** —
   기술적으로는 둘 다 같은 코드로 되지만(아래 참고), AI 쪽도 진짜 스쿼드
   시뮬레이션을 태우면 서버 CPU 비용이 지금(포아송 한 번 계산)보다 훨씬
   커진다.
3. **작전카드를 새 재화로 팔지, 기존 아이템처럼 골드로만 팔지** — 아래
   "작전카드" 절 참고. 과금 성격이 생기는 결정이라 확인이 필요하다.
4. **개막 배치 리그(placement-2026-09-04)에도 소급 적용할지, 다음 정규
   시즌(regular-2026-09-07)부터 켤지** — 배치 리그는 이미 진행 중이라
   중간에 엔진을 바꾸면 이미 정산된 경기와 형평성 문제가 생길 수 있다.
   정규 시즌부터 시작하는 쪽을 권장한다.

## 근거

- 서버 권한 원칙: `docs/SECURITY_ARCHITECTURE.md:25-57`, `:133-139`
- 현재 온라인 매치 한계: `ROADMAP.md:146-160`, `:167-168`
- 현재 주간 정산은 임시 포아송: `supabase/migrations/20260904020000_weekly_fixture_settlement.sql`
- 정규 시즌 105슬롯/90라운드: `lib/weeklyLeague/config.ts`, `lib/weeklyLeague/schedule.ts`
- 개막 배치 45라운드: `lib/weeklyLeague/placement.ts`
- 현재 `weekly_fixtures` 스키마: `supabase/schema.sql`(weekly_fixtures 테이블)
- 한 틱 진행 엔진: `lib/matchEngine.ts`
- 상대측을 rating만으로 만드는 지점: `lib/tactics/bridge.ts`의 `opponentParams`/`opponentProfile`
- **이미 절반 열려 있는 문**: `lib/matchEngine.ts`의 `MatchSetup.opponentTactics`는
  이미 `{ params?, phased?, profile? }`를 받을 수 있고, `buildModels()`는
  `setup.opponentTactics?.profile ?? opponentProfile(setup.opponent)`로 값이
  있으면 그걸 쓰고 없으면 기존처럼 rating 기반 가짜 프로필을 만든다. 즉
  **상대측에 진짜 `squadProfile(evaluations)`를 넣어주는 것만으로 전술 계산의
  절반은 이미 양방향으로 동작한다.** 나머지 절반(전투력 수치, 득점자 선택)은
  아래 "양방향 엔진 확장"에서 구체적으로 고친다.

## 시간 모델

실제 15분 = 경기 90분.

- `MATCH_REAL_DURATION_SECONDS = 900`, `REAL_SECONDS_PER_MATCH_MINUTE = 10`
- `scheduled_at_utc <= now < scheduled_at_utc + 15분`: live
- `now >= scheduled_at_utc + 15분`: 서버가 full-time까지 진행 후 `played`

슬롯이 1시간 간격이라 15분이면 다음 슬롯까지 45분 여유가 있고, 유저가
stoppage에 반응할 최소 시간이 생긴다.

`advance()`의 stoppage tick은 서버 시간을 멈추지 않는다 — 주간 리그에서
stoppage는 "명령 적용 경계"일 뿐이고, 서버는 목표 경기분까지 진행하면서
stoppage를 만나면 접수된 명령을 적용하고 계속 진행한다.

## 양방향 엔진 확장 — 구체적 변경 지점

`lib/matchEngine.ts`와 `lib/tactics/bridge.ts`를 손대는 부분만 정확히
적는다(코드는 아직 안 씀, 착수 시 이대로 옮기면 됨).

### 1. `MatchSetup` 확장

```ts
// lib/matchEngine.ts
export interface MatchSetup {
  team: SquadRating
  teamName: string
  opponent: LeagueTeam           // 유지 — AI 상대·캐주얼 모드는 그대로 씀
  opponentSquad?: SquadRating    // 신규 — 있으면 진짜 PvP, 없으면 기존 rating 기반
  opponentName?: string          // 신규 — PvP일 때 opponent.name 대신 표시
  // ...나머지 기존 필드 그대로
}
```

`opponent: LeagueTeam`을 없애지 않는 이유: 캐주얼 모드(디비전 리그)와
주간리그의 실유저-AI 매치는 지금처럼 rating 기반으로 계속 도는 게 맞고, 코드
경로를 하나로 유지해야 "로직은 한 벌" 원칙이 안 깨진다. `opponentSquad`가
있을 때만 아래 함수들이 분기한다.

### 2. `strengthOf()` — 상대측 전투력

지금은 `setup.opponent.rating`(숫자 하나)에서 `oppAtt`/`oppDef`/`oppMid`를
뽑는다. `opponentSquad`가 있으면 그 쪽의 `att`/`def`/`mid`(이미
`evaluateSquad()`가 팀컬러·케미까지 반영해 계산해 둔 값)를 그대로 쓴다.

```ts
oppAtt: (setup.opponentSquad
  ? setup.opponentSquad.att * plan.att // 상대 전술 배율은 buildModels가 이미 반영하므로 여기선 rating만
  : setup.opponent.rating) + awayBonus + plan.counterRisk + (rng() * 6 - 3),
```

`hiddenEdge`(히든 능력치)도 상대측에 대칭 적용해야 한다 — 지금은
`setup.team.hidden / 2`만 있고 상대측 히든 보정이 없다. `opponentSquad.hidden`을
같은 식으로 더한다.

### 3. `buildModels()` — 이미 절반 됨

```ts
const theirProfile = setup.opponentTactics?.profile
  ?? (setup.opponentSquad ? squadProfile(setup.opponentSquad.evaluations) : undefined)
  ?? opponentProfile(setup.opponent)
```

`opponentTactics?.phased`도 같은 우선순위로 실제 상대방이 낸 전술(PvP 명령)을
받는다.

### 4. `pickScorer()` / `playShot()` — 상대측 득점자

지금 `playShot()`은 우리 팀 슈팅만 `pickScorer(setup.team.evaluations, rng)`를
쓰고, 상대측은 `OPPONENT_PLAYERS`(가짜 이름 10개)에서 무작위로 고른다.

```ts
const shooter = weAttack
  ? pickScorer(setup.team.evaluations, rng)
  : setup.opponentSquad
    ? pickScorer(setup.opponentSquad.evaluations, rng)
    : { name: OPPONENT_PLAYERS[Math.floor(rng() * OPPONENT_PLAYERS.length)], uid: null, slotId: null }
```

### 5. 득점자 기록 — 양쪽 다

`LiveMatchState.scorerUids`는 지금 "우리 팀" 전용이다. PvP 경기는 양쪽 다
기록해야 ROADMAP 5번(개인 타이틀: 득점왕 등)과 나중에 이어 붙일 수 있다.

```ts
export interface LiveMatchState {
  // ...
  scorerUids: string[]        // 유지 — team(=home 관점) 득점자
  opponentScorerUids: string[] // 신규 — opponentSquad 득점자
}
```

### 6. 체력·부상 — 상대측도 실제 컨디션 반영

지금 `seedStamina`/`averageStamina`/`staminaFactor`는 `setup.team.evaluations`
전용이다. `opponentSquad`가 있으면 상대측도 같은 파이프라인을 태워서, PvP에서
양쪽 다 실제 부상·컨디션이 경기력에 영향을 주게 한다. 자동교체
(`applyAutoSubs`)도 상대측에 대칭 적용해야 "관전하지 않는 쪽도 불리하지
않다"가 성립한다.

### 7. `venue` — PvP는 항상 `neutral`

두 실유저 매치에서 홈 어드밴티지를 누구에게 줄지는 형평성 문제가 된다.
주간리그의 home_slot/away_slot 구분은 대진표 편성용으로만 쓰고, 실제 엔진에는
`venue: 'neutral'`로 넘겨 `HOME_ADVANTAGE`가 어느 쪽에도 안 붙게 한다(이미
캐주얼 모드 컵 데이에 쓰는 것과 같은 값).

### 검증 범위

`tests/matchEngine.test.ts`에 양방향 대칭 테스트를 추가해야 한다 — 예를
들어 `team`과 `opponentSquad`를 서로 뒤바꿔 넣고 `runToEnd`를 두 번 돌렸을 때
승/패 분포가 뒤집히는지(대칭성 확인), 그리고 지금 있는 "동일 seed는 동일
결과" 재현 테스트가 `opponentSquad`가 있을 때도 성립하는지.

## 서버 진행 메커니즘

무관전 경기(둘 다 AI거나 아무도 안 보는 실유저 매치)도 예약 시각까지는
반드시 끝나 있어야 한다는 요구가 있다. 세 대안을 비교한다.

### 대안 A — Scheduled Edge Function

Supabase 대시보드에서 Edge Function에 직접 cron 스케줄을 붙이는 기능(있다면
가장 깔끔). **이 세션에서는 실제 사용 가능 여부를 확인 못 했다** — 사용자
확인 필요.

### 대안 B — 트래픽에 얹은 캐치업 (권장)

핵심 아이디어: 이 앱은 어차피 계속 요청이 들어온다(누군가 게임을 열 때마다).
"지연된 fixture가 있으면 advance_due를 같이 돌린다"를 다음 두 곳에 끼운다.

1. 클라이언트가 `get_state`를 부를 때마다 그 fixture'만' catch-up (이미
   문서에 있던 것, 유지)
2. **안전망**: `settle-weekly-fixtures`(이미 있는 5분 주기 pg_cron, 순수 SQL)
   자리에서, live 상태로 넘어갔는데 아무도 안 본 fixture를 순수 SQL로는 못
   돌리므로, 이 cron이 "5분 넘게 방치된 live fixture 목록"만 추려 별도 테이블
   (`weekly_fixture_stale_queue`)에 적재해 두고, **다음에 아무 유저나 아무
   Edge Function을 호출할 때** 그 큐를 함께 비운다(HTTP 응답 지연 최소화를
   위해 `waitUntil` 유사 패턴 — Deno Deploy의 `EdgeRuntime.waitUntil` 사용).

이러면 pg_net 없이, 서비스 키를 DB에 두지 않고도 "완료 시각이 심하게 밀리는
경우가 거의 없는" 안전망이 생긴다. 트래픽이 정말 없는 새벽 시간대는 최대
지연이 발생할 수 있다는 한계는 남지만, 실서비스 트래픽 패턴상 감내 가능한
수준으로 본다.

**재검토로 발견한 함정**: "다음에 아무 Edge Function을 호출할 때 큐를
비운다"를 문자 그대로 모든 함수(`draw-pack` 등)에 걸면 안 된다 — 무관한
기능이 이 부가 작업 실패로 함께 죽을 위험이 있고 지연 시간 예측도 힘들어진다.
훅은 **주간리그 전용 함수(`get_state`/`submit_command`)의 응답 마지막
단계에서만**, `EdgeRuntime.waitUntil`로 응답을 막지 않고 걸어야 한다. 그
외 함수는 절대 안 건드린다 — 캐치업 빈도가 그만큼 줄어드는 대신(주간리그
화면을 아무도 안 열면 캐치업도 안 됨), 그 경우는 어차피 "아무도 안 보는
매치"라 진행이 몇 분 늦어져도 체감상 문제가 없다.

### 대안 C — 엔진을 SQL로 포팅

가장 안전하지만 로직이 두 벌이 된다(`_weekly_poisson_goal`과 같은 패턴을
`lib/matchEngine.ts` 전체로 확장). 개입이 없는 매치업(대부분의 AI-AI, 관전자
없는 매치)만 이 경로를 쓰고, 실제로 개입이 들어온 매치는 Edge Function
경로로 넘기는 하이브리드도 가능하지만 복잡도가 커진다. **대안 B가 막히면
이걸로 후퇴.**

## 명령 제출

클라이언트는 테이블을 직접 쓰지 않고 Edge Function만 호출한다.

```ts
type WeeklyLiveMatchRequest =
  | { action: 'get_state'; fixtureId: number }
  | {
      action: 'submit_command'
      fixtureId: number
      idempotencyKey: string
      kind: 'tactic' | 'substitution' | 'card'   // 'card' = 작전카드, 아래 참고
      payload: unknown
      clientSeenRevision?: number
    }
```

서버 검증:

- auth token 유효성
- 요청자가 해당 fixture의 home/away 실유저인지
- fixture가 live window 안인지
- idempotency key 중복 여부
- 전술 payload shape/range (`lib/tactics/params.ts`의 범위 그대로 재사용)
- 교체 대상이 kickoff snapshot의 선수인지, 부상/퇴장 아닌지
- `SQUAD_RULES.maxSubsPerMatch = 5`, `subWindows = 3`
- 작전카드: 보유 수량, 이번 경기 사용 여부(한 경기 1장), 발동 조건(아래 참고)

명령 접수 시점은 클라이언트 시간이 아니라 DB/서버 `now()`다.

```text
received_match_minute = floor((server_received_at - scheduled_at_utc) / 10초)
```

적용 규칙: 접수 분 이후 첫 legal stoppage에 적용, 이미 지난 stoppage에는
소급 적용하지 않음, full-time 전 legal stoppage가 없으면 `expired`.

**재검토로 발견한 함정**: `received_match_minute`은 "시계가 흘러간 만큼"으로
계산한 값이고, `weekly_fixture_engine_state.latest_state`가 실제로 도달해 있는
분(엔진이 진짜로 재생을 마친 지점)은 대안 B(lazy advancement)에서는 다를 수
있다 — 아무도 안 보다가 한 번에 캐치업하면 엔진 쪽 minute이 순간적으로 확
뛴다. `submit_command`는 그래서 접수 즉시 "그 fixture를 서버 시각까지
advance"부터 먼저 실행하고(이미 있는 규칙), 그 advance가 끝난 뒤의 실제 엔진
minute을 기준으로 stoppage를 찾아야 한다 — `received_match_minute`(시계 기준)을
그대로 stoppage 탐색에 쓰면 안 되고, advance 직후의 `latest_state.minute`을
써야 한다. 문서 앞부분의 "명령 접수 시점" 계산식은 감사 로그·리플레이용
타임스탬프로만 쓰고, 적용 로직 자체는 advance 후 엔진 상태 기준으로 다시
정리해야 한다.

## 동시성

fixture 단위 단일 writer가 필요하다. lease + CAS 구조.

- `claim_weekly_fixture_advance(fixture_id, claim_token, claim_until)`
- Edge Function이 seed/setup/command log로 재생
- `commit_weekly_fixture_advance(..., claim_token, expected_revision, patch)`
- token/revision 불일치 시 최신 상태로 재시도

동일 stoppage 명령 순서: `received_match_minute` → `received_at` → command id.
전술은 side별 최신 pending 전술을 동시에 적용하고, 교체·작전카드는 side
내부 충돌만 순차 검증한다.

## 작전카드

### 원작과의 차이, 재해석 방향

원작(풋볼데이)의 작전카드는 "경기마다 부족한 능력을 일시 보완"하는 능력치
버프 아이템이었다. 이 프로젝트는 `docs/football-day-claude-code-handoff.txt`
6절에서 이미 "능력치 버프가 아니라 스카우팅·분석·훈련 효율 등으로
재해석"하기로 방향을 잡아 뒀다. 실시간 개입이라는 맥락에서 그 원칙을
지키면서 원작의 손맛(경기 중 즉각적으로 쓰는 카드)을 살리는 방법:
**전술 파라미터를 한시적으로 크게 흔들되, 반드시 트레이드오프를 동반**시킨다
— `lib/tactics/params.ts`가 이미 갖고 있는 "행동 확률에 영향, 능력치에
직접 보너스 아님" 원칙 그대로다.

### 데이터 모델

```ts
export interface TacticCard {
  id: string
  name: string
  note: string               // 발동 효과를 사람이 읽을 설명
  cooldownMatches: number     // 며칠에 한 번이 아니라 "경기 몇 판에 한 번"
  effect: Partial<TacticalParams> // 발동 즉시 적용, durationMinutes 뒤 원복
  durationMinutes: number     // 대개 10~20분
  tradeoff: Partial<TacticalParams> // effect와 함께 걸리는 페널티, 같은 duration
}
```

예시 3장(전부 `lib/tactics/params.ts`에 이미 있는 파라미터만 사용, 새 능력치
안 만듦):

| 이름 | 효과(effect) | 대가(tradeoff) | 지속 |
| --- | --- | --- | --- |
| 총공격 지시 | `forwardRunFrequency +25`, `crossFrequency +20`, `finalThirdPatience -20` | `restDefence -30`, `regroupPriority -20` | 15분 |
| 침착한 수비 | `defensiveLine -15`, `pressingCompactness +20` | `counterAttackIntensity -25`, `tempo -15` | 15분 |
| 즉각 역습 | `counterAttackIntensity +30`, `transitionSpeed +20` | `buildUpShortness -20`(빌드업 안정성 하락) | 10분 |

한 경기에 한 장만(원작처럼 여러 장 중첩하면 결국 능력치 버프 합연산이
되어버려 원칙이 깨진다), 발동은 stoppage(파울·아웃·하프타임·골 직후)에서만
— 실시간 명령 큐(`kind: 'card'`)와 완전히 같은 처리 경로를 탄다.

### 획득·소지

결정 필요 4번과 이어진다. 권장안: 새 재화를 만들지 않고 기존 `shards`나
상점 아이템 슬롯을 재사용 — 예를 들어 `lib/items.ts`에 `tacticCardPack`
아이템으로 골드나 조각으로 구매, 인벤토리에 카드 종류별 개수로 보관.
서버는 `weekly_fixture_commands`에 `kind='card'`로 기록될 때 그 카드가 실제
보유 수량 안인지 `saves` 기준으로 검증하고 즉시 차감한다(이중 사용 방지,
`commit_pull`과 같은 패턴).

### 엔진 연동

`kind: 'card'` 명령이 적용되면 `PhasedTactics`(국면별 파라미터)에
`effect`를 얹은 임시 오버레이를 만들고, `durationMinutes` 뒤 자동으로 걷어
낸다 — `lib/matchEngine.ts`의 `advance()`가 매 틱 `models[side].inPhase(phase)`를
다시 계산하므로, "지금 카드가 살아있는 구간인지"만 계산에 곱하면 된다(새
레이어 추가 없이 `phasedFrom`에 시간 조건부 오버레이 하나 끼우는 정도).

## 스키마 변경안

`weekly_fixtures`에는 공개 가능한 최소 상태만 둔다(지금 인증 사용자 전체
읽기가 열려 있으므로 seed 원문, 상대 전술, private engine state를 넣지
않는다).

추가/변경:

- `status`: `pending | live | played | abandoned`
- `live_started_at_utc`, `live_ends_at_utc`, `engine_version`, `public_minute`,
  `state_revision`, `events jsonb not null default '[]'`
- `simulation_seed`는 경기 종료 후 감사/재생용으로만 공개

비공개 테이블:

```sql
weekly_fixture_engine_state (
  fixture_id bigint primary key,
  seed text not null,
  engine_version text not null,
  setup_snapshot jsonb not null,   -- team+opponentSquad 둘 다, kickoff 시점 스냅샷
  latest_state jsonb not null,
  state_revision bigint not null default 0,
  advance_claim_token uuid,
  advance_claimed_until timestamptz
)

weekly_fixture_commands (
  id bigserial primary key,
  fixture_id bigint not null,
  side text check (side in ('home','away')),
  user_id uuid not null,
  kind text check (kind in ('tactic','substitution','card')),
  payload jsonb not null,
  idempotency_key text not null,
  received_at timestamptz not null default now(),
  received_match_minute smallint not null,
  status text not null,
  applied_at timestamptz,
  applied_match_minute smallint,
  rejection_reason text,
  unique (fixture_id, user_id, idempotency_key)
)

weekly_fixture_stale_queue (   -- 대안 B 안전망용
  fixture_id bigint primary key,
  queued_at timestamptz not null default now()
)
```

무관전 경기를 위해 `weekly_member_loadouts`도 필요하다(kickoff 시 선발·전술
스냅샷을 어디서 가져올지). 없으면 `saves.data.squad/tactic/plan`을 fallback
으로 읽되, 정식 UI에서는 주간리그 전용 loadout 저장을 둔다.

## matchEngine 재사용 정리

그대로 재사용: `createMatch`, `advance`, `runToEnd`, `toResult`,
`ENGINE_VERSION`, `evaluateSquad`, `missingSlots`, 전술/국면별 plan 계산,
자동 교체 평가 규칙, **양방향 확장 후에는 `buildModels`/`strengthOf`도
그대로**(분기만 추가, 함수는 그대로).

새로 필요: weekly fixture → match setup 변환, kickoff snapshot 생성, AI
스쿼드/전술 결정론적 생성(순수 AI-AI 매치용, 지금 `opponentParams`처럼),
서버 전용 명령 parser/검증기, 서버 교체 검증기(`MatchTab.applySub()`를
서버판으로), fixture lease/CAS, public state projection, 작전카드 보유
검증·차감, 결과/개입 보상 ledger 기록.

## 배포 순서

1. 공용 전술/교체/작전카드 검증기 정리 (클라이언트 lib에서 순수 함수로 뺌)
2. `MatchSetup.opponentSquad` 확장 + 위 "양방향 엔진 확장" 5개 지점 수정,
   `tests/matchEngine.test.ts`에 대칭성 테스트 추가
3. live 상태, private engine state, command log, loadout, stale queue
   스키마 추가
4. 무개입 엔진 정산을 Edge Function으로 구현하고 기존 포아송과 shadow
   비교(같은 fixture를 두 방식으로 돌려 점수 분포가 비슷한지 확인 후 전환)
5. `get_state`로 live 조회와 관전 구현(폴링으로 시작, Realtime은 이후)
6. 전술 명령 queue 및 stoppage 적용
7. 교체 명령 검증 및 적용
8. 작전카드 명령 검증·적용·차감
9. 결과 보상과 개입 보상 ledger 기록
10. 기존 `settle-weekly-fixtures` 포아송 cron을 새 엔진으로 교체(카드 없는
    매치는 여전히 결정론적 AI 대 AI로 계산)

## 리스크

- 서버 CPU: 실시간 개입 매치는 매 `get_state` 호출마다 여러 틱을
  재생(replay)할 수 있어 지금(포아송 한 줄)보다 비용이 크다. 트래픽이
  늘면 fixture당 최대 replay 틱 수에 상한을 두고 그 이상은 `latest_state`
  스냅샷에서 이어가는 최적화가 필요해질 수 있다.
- 양방향 엔진이 실전에서 처음 도는 것이므로, 결정론 테스트(같은 seed·같은
  명령 순서 → 같은 결과)를 실서비스 배포 전에 반드시 통과시켜야 한다.
- 개막 배치 리그에 소급 적용하지 않기로 하면(결정 4번 권장안), 배치 리그는
  포아송 정산인 채로 끝난다 — 사용자에게 그 경기들은 "이벤트성 시범 시즌"
  이었다고 안내가 필요할 수 있다.
