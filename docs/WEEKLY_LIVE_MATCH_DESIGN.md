# 주간 리그 실시간 경기 진행 설계

Codex(설계 전용, 코드 수정 금지 조건)에 넘겨 받은 초안이다. 아직 결정되지 않은
항목이 있으므로 착수 전 "미검증/결정 필요" 절부터 정리한다.

## 근거

- 서버 권한 원칙: `docs/SECURITY_ARCHITECTURE.md:25-57`, `:133-139`
- 현재 온라인 매치 한계: `ROADMAP.md:146-160`, `:167-168`
- 현재 주간 정산은 임시 포아송: `supabase/migrations/20260904020000_weekly_fixture_settlement.sql:1-13`, `:63-110`
- 정규 시즌 105슬롯/90라운드: `lib/weeklyLeague/config.ts`, `lib/weeklyLeague/schedule.ts:71-109`
- 개막 배치 45라운드: `lib/weeklyLeague/placement.ts:25-34`, `:86-124`
- 현재 `weekly_fixtures` 스키마: `supabase/schema.sql:1223-1240`
- `weekly_fixtures`는 인증 사용자 전체 읽기 가능: `supabase/schema.sql:1251-1254`
- 서버 결과 기록 패턴: `supabase/schema.sql:847-899`
- 한 틱 진행 엔진: `lib/matchEngine.ts:252-280`, `:380-443`, `:662-699`

## 시간 모델

권장값은 실제 15분 = 경기 90분이다.

- `MATCH_REAL_DURATION_SECONDS = 900`
- `REAL_SECONDS_PER_MATCH_MINUTE = 10`
- `scheduled_at_utc <= now < scheduled_at_utc + 15분`: live
- `now >= scheduled_at_utc + 15분`: 서버가 full-time까지 진행 후 `played`

근거는 슬롯이 1시간 간격이고, 15분이면 다음 슬롯까지 45분 buffer가 남으며, 유저가
stoppage에 반응할 최소 시간이 생긴다는 점이다.

`advance()`의 stoppage tick은 서버 시간을 멈추지 않는다. 주간 리그에서 stoppage는
"명령 적용 경계"일 뿐이다. 서버는 목표 경기분까지 진행하면서 stoppage를 만나면
접수된 명령을 적용하고 계속 진행한다.

## 서버 진행 메커니즘

권장안은 lazy advancement + 예약 catch-up이다.

- `get_state`: 클라이언트 조회 시 Edge Function이 fixture를 서버 시각까지 진행하고 반환
- `submit_command`: 명령 접수 시 서버 시각을 기록하고 같은 advancer로 진행
- `advance_due`: 1분마다 due fixture를 batch로 진행 및 종료

순수 lazy 방식은 아무도 보지 않은 경기가 DB에 남을 수 있어 부족하다. 순수 pg_cron
SQL 방식은 TypeScript `matchEngine`을 실행할 수 없어 카드/전술 반영 요구를
만족하지 못한다.

예약 실행은 Supabase Scheduled Edge Function을 우선 사용한다. 불가하면
`pg_cron + pg_net`으로 Edge Function을 호출하되, DB에는 `service_role`을 저장하지
않고 짧은 cron secret/HMAC만 둔다. 실제 DB 쓰기는 Edge Function의 service role
환경 변수로 수행한다.

## 명령 제출

클라이언트는 테이블을 직접 쓰지 않고 Edge Function만 호출한다.

```ts
type WeeklyLiveMatchRequest =
  | { action: 'get_state'; fixtureId: number }
  | {
      action: 'submit_command'
      fixtureId: number
      idempotencyKey: string
      kind: 'tactic' | 'substitution'
      payload: unknown
      clientSeenRevision?: number
    }
```

서버 검증:

- auth token 유효성
- 요청자가 해당 fixture의 home/away 실유저인지
- fixture가 live window 안인지
- idempotency key 중복 여부
- 전술 payload shape/range
- 교체 대상이 kickoff snapshot의 선수인지
- 벤치/선발 상태, 부상/퇴장, 레벨 cap
- `SQUAD_RULES.maxSubsPerMatch = 5`, `subWindows = 3`

명령 접수 시점은 클라이언트 시간이 아니라 DB/서버 `now()`다.

```text
received_match_minute = floor((server_received_at - scheduled_at_utc) / 10초)
```

적용 규칙:

- 접수 분 이후 첫 legal stoppage에 적용
- 서버가 접수한 순간 canonical state가 stoppage면 같은 stoppage 적용 가능
- 이미 지난 stoppage에는 소급 적용하지 않음
- full-time 전 legal stoppage가 없으면 `expired`

## 동시성

fixture 단위 단일 writer가 필요하다.

권장 구조는 lease + CAS다.

- `claim_weekly_fixture_advance(fixture_id, claim_token, claim_until)`
- Edge Function이 seed/setup/command log로 재생
- `commit_weekly_fixture_advance(..., claim_token, expected_revision, patch)`
- token/revision 불일치 시 최신 상태로 재시도

동일 stoppage 명령 순서:

1. `received_match_minute`
2. `received_at`
3. command id

전술은 side별 최신 pending 전술을 동시에 적용하고, 교체는 side 내부 충돌만 순차
검증한다.

## 스키마 변경안

`weekly_fixtures`에는 공개 가능한 최소 상태만 둔다. 현재 이 테이블은 인증
사용자에게 전체 읽기가 열려 있으므로 seed 원문, 상대 전술, private engine state를
넣으면 안 된다.

추가/변경:

- `status`: `pending | live | played | abandoned`
- `live_started_at_utc`
- `live_ends_at_utc`
- `engine_version`
- `public_minute`
- `state_revision`
- `events jsonb not null default '[]'`
- `simulation_seed`는 경기 종료 후 감사/재생용으로만 공개

비공개 테이블:

```sql
weekly_fixture_engine_state (
  fixture_id bigint primary key,
  seed text not null,
  engine_version text not null,
  setup_snapshot jsonb not null,
  latest_state jsonb not null,
  state_revision bigint not null default 0,
  advance_claim_token uuid,
  advance_claimed_until timestamptz
)
```

명령 로그:

```sql
weekly_fixture_commands (
  id bigserial primary key,
  fixture_id bigint not null,
  side text check (side in ('home','away')),
  user_id uuid not null,
  kind text check (kind in ('tactic','substitution')),
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
```

무관전 경기를 위해 `weekly_member_loadouts`도 필요하다. 없으면 kickoff 시
`saves.data.squad/tactic/plan`을 snapshot fallback으로 읽되, 정식 UI에서는 주간
리그 전용 loadout 저장을 둔다.

## matchEngine 재사용

그대로 재사용 가능:

- `createMatch`
- `advance`
- `runToEnd`
- `toResult`
- `ENGINE_VERSION`
- `evaluateSquad`, `missingSlots`
- 전술/국면별 plan 계산
- 자동 교체 평가 규칙

새로 필요:

- weekly fixture -> match setup 변환
- kickoff snapshot 생성
- AI 스쿼드/전술 결정론적 생성
- 서버 전용 명령 parser/검증기
- UI 내부 `MatchTab.applySub()`를 대체할 서버 교체 검증기
- fixture lease/CAS
- public state projection
- 결과/개입 보상 ledger 기록

주의: 현재 `MatchSetup`은 한쪽 팀은 full squad, 상대는 주로 rating 기반이다.
최상위 PvP에서 양쪽 교체와 전술이 동등하게 영향을 주려면 `MatchSetupV2`처럼
home/away 모두 squad, tactic, phased, traits, stamina를 갖는 양방향 엔진 확장이
필요하다.

## 배포 순서

1. 공용 전술/교체 검증기 정리
2. live 상태, private engine state, command log, loadout 스키마 추가
3. 무개입 엔진 정산을 Edge Function으로 구현하고 기존 포아송과 shadow 비교
4. `get_state`로 live 조회와 Realtime/polling 관전 구현
5. 전술 명령 queue 및 stoppage 적용
6. 교체 명령 검증 및 적용
7. PvP용 양방향 match setup/engine 확장
8. 결과 보상과 개입 보상 ledger 기록
9. 기존 `settle-weekly-fixtures` 포아송 cron 제거

## 미검증/결정 필요

- 이 세션에서는 실제 Supabase Scheduled Edge Function, `pg_net`, Vault 사용 가능
  여부를 확인하지 못했다.
- 이 예약 호출이 전혀 불가능하면 Supabase-only 조건에서 무관전 엔진 정산을
  만족하려면 엔진을 SQL로 포팅해야 한다.
- 운영 DB의 실제 RLS/grant drift는 확인하지 못했다.
- PvP live intervention은 양방향 엔진 확장 전에는 열면 안 된다.
