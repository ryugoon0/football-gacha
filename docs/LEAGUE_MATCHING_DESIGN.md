# PR3 설계 — 동일 리그 실제유저 매칭 v1

ROADMAP.md 5절 3항의 설계 문서입니다. **코드는 아직 반영하지 않았습니다.** Codex
위임이 세션 환경 문제로 막혀 있어(플러그인이 로컬 트랜스크립트를 못 찾는 버그,
`codex-companion.mjs`) 대신 직접 설계했습니다. 구현 전에 8, 3(비동기 정산 방식) 두
항목은 특히 검토가 필요합니다 — 판단이 갈리는 지점을 표시해 뒀습니다.

## 지금 상태와 무엇이 바뀌는가

`lib/league.ts`의 `Season`은 완전히 client-local입니다. 유저 1명(`MY_TEAM_ID`) +
`CLUB_POOL`에서 뽑은 AI 19팀이 라운드로빈을 돕니다. 내가 라운드를 진행하면
(`gameReducer.ts`의 `'match'` 액션) 내 경기만 서버 판정을 받고, **같은 라운드의
나머지 18경기는 내 브라우저가 `simulateAiMatch`로 그 자리에서 직접 지어냅니다**
(`others` 파라미터). 즉 지금은 "리그"가 아니라 "나 혼자 보는 리그 흉내"입니다.

PR3는 이 자리에 실제로 여러 유저가 같은 20팀 리그에 들어가게 만드는 일입니다.
가장 큰 구조 변화: **"다른 자리에서 무슨 일이 있었는지"를 더 이상 내 브라우저가
지어낼 수 없습니다.** 그 계산은 서버가 갖고, AI끼리의 경기도 결정론적으로 딱
한 번 정해져야 합니다(누가 먼저 보든 같은 결과).

## 1. DDL 스케치 (적용 안 함)

```sql
-- 리그 한 시즌 한 디비전 = 인스턴스 하나. season_index는 lib/league.ts의
-- Season.index와 같은 개념 — division이 같아도 시즌이 다르면 다른 인스턴스.
create table public.league_instances (
  id            bigserial primary key,
  division      smallint not null check (division between 1 and 5),
  season_index  int not null,
  status        text not null check (status in ('forming', 'active', 'finished')) default 'forming',
  created_at    timestamptz not null default now(),
  finished_at   timestamptz
);

-- 20자리 고정. slot은 lib/league.ts의 roundRobin(ids) 순서를 그대로 서버가
-- 재현하기 위한 자리 번호 — AI 슬롯도 자리를 갖고 있어야 fixture를 만들 수 있음.
create table public.league_members (
  league_id  bigint not null references public.league_instances(id) on delete cascade,
  slot       smallint not null check (slot between 0 and 19),
  kind       text not null check (kind in ('user', 'ai')),
  user_id    uuid references auth.users on delete set null,
  club_name  text not null check (char_length(club_name) between 1 and 30),
  badge      text not null default '',
  rating     smallint not null check (rating between 0 and 200),
  round      smallint not null default 0,  -- 이 멤버가 "여기까지 봤다"는 진행 포인터. 실유저만 의미 있음.
  joined_at  timestamptz not null default now(),
  primary key (league_id, slot),
  unique (league_id, user_id),
  constraint league_members_kind_user check (
    (kind = 'user' and user_id is not null) or (kind = 'ai' and user_id is null)
  )
);

-- 한 실유저는 "활성" 리그에 동시에 하나만. DB 제약으로는 league_instances.status와
-- 조인해야 해서 부분 유니크 인덱스로 못 걸림 — RPC에서 advisory lock으로 강제.
-- (아래 "리그 배정" 절 참고)

create table public.league_fixtures (
  league_id     bigint not null references public.league_instances(id) on delete cascade,
  round         smallint not null check (round between 0 and 18),
  home_slot     smallint not null,
  away_slot     smallint not null,
  status        text not null check (status in ('pending', 'played')) default 'pending',
  score_home    smallint check (score_home between 0 and 30),
  score_away    smallint check (score_away between 0 and 30),
  seed          text,
  match_id      bigint references public.match_results(id),  -- 실유저가 낀 경기만 채워짐
  settled_at    timestamptz,
  primary key (league_id, round, home_slot, away_slot)
);

create index league_fixtures_pending_idx
  on public.league_fixtures (league_id, round) where status = 'pending';
```

순위표는 **저장하지 않고 뷰로 계산**합니다. `league_fixtures`가 진실이고, 표를
따로 저장하면 "표가 두 벌"이라는 이 프로젝트가 계속 피해온 문제가 그대로
재발합니다(뽑기 확률·MatchResult 재현이 같은 이유로 지금 구조가 됐습니다).

```sql
create view public.league_standings as
select
  league_id, slot,
  count(*) filter (where played) as played,
  count(*) filter (where played and won) as w,
  ... -- home/away 양쪽 집계를 union all로 모아 group by
from ( ... ) results
group by league_id, slot;
```

(정확한 집계 SQL은 구현 단계에서 채웁니다. 여기서 정할 건 "저장하지 않는다"는
결정 자체입니다.)

## 2. 리그 배정 알고리즘

새 유저(또는 승격·강등으로 디비전이 바뀐 유저)가 리그를 배정받는 순서:

1. `status='forming'`이고 `division = <내 division>`이고 실유저 슬롯이 20개 미만인
   `league_instances`를 찾는다. 여러 개면 가장 오래된 것.
2. 없으면 새 `league_instances` 행을 만들고 `status='forming'`으로 시작.
3. 빈 슬롯 중 하나(순서 무관, 그냥 `slot`이 비어 있는 가장 작은 번호)에 `kind='user'`로
   앉힌다. `rating`은 가입 시점 세이브의 실제 스쿼드 평균 OVR 스냅샷(표시·매칭용일
   뿐, 실제 경기 판정은 매번 세이브에서 다시 계산 — PR2와 같은 원칙).
4. 실유저가 12명이 되거나, **일정 시간(예: 가입 후 24시간) 안에 12명이 안 차면**
   나머지를 `lib/aiClub.ts`의 `CLUB_POOL`에서 결정론적으로 채우고 `status='active'`로
   전환, `league_fixtures`를 라운드로빈으로 한 번에 생성한다.
   - **판단 필요**: "24시간 대기 후 AI로 채움"은 하나의 선택지입니다. 다른 선택지는
     "실유저가 8명만 모여도 즉시 시작, 나머지 12자리를 AI로" — 실유저를 더 빨리
     게임에 넣고 싶다면 후자가 낫습니다. 초반엔 유저 수 자체가 적어서 대기가
     길어질 수 있어, **후자(최소 인원만 모이면 즉시 시작, 나머지 AI)를 권장**합니다.
5. 동시 가입 경합은 `pg_advisory_xact_lock(hashtext('league_join:' || division))`으로
   막는다 — `commit_pull`, `commit_match`가 이미 쓰는 패턴 그대로.
6. 운영자/테스트 계정은 `is_admin()`이 참이면 배정 대상에서 제외(`lib/monitor.ts`가
   이미 비슷한 구분을 하고 있다면 그 판정을 재사용).

AI 슬롯은 `CLUB_POOL`에서 **그 리그 인스턴스 id로 시드**해 결정론적으로 고른다
(`hashString(league_id + ':' + slot)`) — `lib/aiClub.ts`가 division으로만 시드하는
지금 패턴을 리그 인스턴스 단위로 한 겹 더 좁히는 것.

## 3. Fixture 생성과 라운드 진행, 그리고 정산 방식

Fixture 생성 자체는 `lib/league.ts`의 `roundRobin()`을 그대로 서버(Edge
Function이나 RPC)에서 20개 슬롯 id에 대해 돌려 `league_fixtures`에 벌크 insert —
로직을 새로 안 짜고 그대로 가져다 씀.

라운드 진행은 **이번 범위에서도 유저가 버튼을 눌러 진행**하는 지금 방식을 그대로
씁니다(실시간 킥오프는 PR4). 다만 "내가 진행하면 같은 라운드 남을 내가
지어낸다"는 지금 구조는 못 씁니다. 대신:

- **실유저 vs AI 슬롯**: 지금 `simulate-match`가 이미 하는 일과 거의 같습니다.
  `opponent`를 클라이언트가 이름만 알려주는 대신, 서버가 `league_fixtures`에서
  상대 슬롯을 찾아 AI면 `lib/aiClub.ts` 방식으로 결정론적 rating을 구해 판정.
- **실유저 vs 실유저**: 아래 "비동기 정산" 절 참고 — 이번 설계의 핵심 결정.
- **AI vs AI**: 아무도 트리거하지 않아도 순위표에는 나와야 하므로, 그 라운드의
  누군가(실유저 아무나)가 처음 그 라운드를 조회/진행할 때 **해당 라운드의 AI끼리
  경기 중 미정산 건을 함께 정산**합니다. 시드는 `hashString(league_id + round +
  home_slot + away_slot)`로 고정 — 누가 먼저 계산을 트리거하든 같은 결과.
  `status='pending' → 'played'`로 잠그는 조건부 업데이트(`update ... where
  status='pending'`)로 이중 정산을 막습니다.

### 실유저 vs 실유저 — 비동기 정산 (핵심 결정, 검토 필요)

두 실유저가 붙는 fixture는 두 사람이 동시에 온라인일 필요가 없어야 합니다(PR4
전까지는 실시간 동시 접속 개념 자체가 없음). 제안하는 방식:

**먼저 그 fixture 라운드에 도달한 쪽이 정산을 트리거한다.** 서버는 트리거한 쪽의
스쿼드는 그 자리에서 세이브를 읽어 검증하고(PR2와 동일), **상대측 실유저의
스쿼드는 세이브가 아니라 `public_club_squads`(이미 있는 테이블)를 읽어** 구성한다.
경기를 한 번 계산해서 양쪽 `match_results`에 한 트랜잭션으로 기록하고, 양쪽
`gold_ledger`에 각자의 결과(W/D/L)에 맞는 보상을 넣는다. 상대측 유저가 나중에 그
라운드에 도달하면 이미 정산된 결과를 "재생"만 한다(같은 seed로 `useLiveEngine`
관전) — 자기가 다시 "플레이"하지 않는다.

이 설계를 고른 이유:
- `public_club_squads`가 이미 있고, opt-in(`is_public`)·검증(길이·포메이션
  화이트리스트)까지 돼 있어 **새로 안 만들어도 됨**.
- 상대가 온라인이 아니어도, 상대가 그 라운드에 아직 도달 안 했어도 막히지 않음 —
  로컬 싱글플레이와 체감이 비슷하게 유지됨.
- PR2의 원칙("클라이언트가 자기 자신에 대해 말한 것만 믿는다")이 그대로 확장됨 —
  트리거한 쪽 자신의 스쿼드는 세이브에서, 상대의 스쿼드는 **상대 본인이 미리
  공개하기로 선택한 값**에서 읽으므로 누구도 서로의 비공개 세이브를 못 봄.

**남는 문제 — 명시적으로 표시**:
- 상대가 `public_club_squads`를 아예 공개 안 했으면? → 이번 설계에서는 **그
  슬롯을 fixture 생성 시점에 AI로 대체**하는 걸 권장합니다(공개 안 한 유저는
  "리그에는 있지만 남과 안 붙는" 상태가 아니라, 애초에 AI 슬롯처럼 취급). 즉
  실유저 12명 목표에서 "실제로 남과 붙는" 유저는 **공개 스쿼드가 있는 사람으로
  좁혀질 수 있음** — UI에서 "리그 참가 = 스쿼드 공개"를 사실상 하나로 묶는 게
  나을 수 있습니다. **판단 필요.**
- `public_club_squads`가 정산 시점에 이미 낡았으면(카드 방출·부상 등)? → PR2처럼
  트리거 시점에 상대의 **진짜 세이브**로 재검증하되, 결과가 다르면(카드를 이미
  안 갖고 있음) 그 슬롯을 빈 자리로 처리해 `missingSlots`처럼 페널티를 주는 대신
  ─ 상대는 경기에 안 낀 것도 아니고 몰랐던 것도 아니므로 ─ **공개 스쿼드
  스냅샷을 그대로 신뢰하고 쓰되(표시된 대로 책임진다), 소유권만 최소 확인**하는
  절충안을 권장합니다. 완벽한 실시간 검증은 PR4의 동시 접속 개념이 생긴 뒤에나
  의미가 있습니다.
- 두 실유저가 동시에 같은 fixture를 트리거하는 경합 → `pg_advisory_xact_lock`으로
  같은 패턴으로 막음. 먼저 잡은 쪽이 정산, 나중 쪽은 이미 정산된 결과를 받음.

## 4. 스쿼드 스냅샷 잠금 시점

- **실유저가 AI와 붙을 때**: 지금 `simulate-match`와 동일 — 트리거 시점에 자기
  세이브를 읽어 그 자리에서 평가. 잠금 시점이랄 게 따로 없음(매번 최신).
- **실유저끼리 붙을 때**: 트리거한 쪽은 위와 같음. 상대측은 **상대가
  `public_club_squads`를 마지막으로 갱신한 시점**이 사실상의 스냅샷 시점 —
  fixture가 배정된 시점이 아니라 "정산되는 순간의 공개 스쿼드"를 씀. 상대가 언제든
  자기 공개 스쿼드를 바꿀 수 있게 두는 대신, 정산은 그 순간의 최신값을 씀(과거
  라운드를 소급 재정산하지 않음 — `league_fixtures.status='played'`가 되는 순간
  스코어는 고정).
- AI 슬롯은 원래 결정론적이라 "잠금"이라는 개념이 필요 없음(항상 재계산해도 같은 값).

검증 재사용: 트리거한 쪽 자신의 스쿼드는 `lib/squad.ts`의 `evaluateSquad` +
`missingSlots`를 그대로 호출(PR2와 100% 동일 코드 경로). 상대측 스쿼드는 새로
`SharedSquad` 형태로 변환해 같은 함수에 통과시키되, 위에서 정한 절충안대로 실패
시 거부가 아니라 완화된 처리를 함 — **이 완화 로직만 새로 필요**하고 검증 로직
자체는 재사용.

## 5. 보상 멱등키 설계

`commit_match`를 확장하는 대신 **새 RPC `commit_league_fixture`**를 권장합니다.
이유: `commit_match`는 "한 유저가 한 경기를 했다"는 1:1 모델인데, 실유저끼리
붙는 경기는 한 번의 판정이 **최대 두 유저**에게 각자 다른 보상을 만들어야 해서
시그니처가 달라짐.

```sql
create or replace function public.commit_league_fixture(
  p_league_id bigint,
  p_round     int,
  p_home_slot int,
  p_away_slot int,
  ...
) returns jsonb
  language plpgsql security definer set search_path = public
as $$
begin
  -- 멱등성의 핵심: (league_id, round, home_slot, away_slot)은 PK라서
  -- update ... where status = 'pending' 이 0행이면 이미 정산된 것으로 보고
  -- 새로 계산한 스코어/보상은 버리고 기존 저장된 값을 그대로 반환한다.
  -- (재계산 자체를 막는 게 아니라, "먼저 커밋된 결과가 이긴다"는 원칙)
  ...
end $$;
```

이러면 두 유저가 경합해도, 또는 네트워크 재시도로 같은 fixture가 두 번 제출돼도
`match_results`/`gold_ledger`에 중복 행이 안 생깁니다 — `league_fixtures`의
`(league_id, round, home_slot, away_slot)` PK 자체가 멱등키 역할을 합니다.
`commit_match`가 쓰는 advisory lock + insert 패턴을 그대로 재사용.

## 6. 시즌 경계의 승격·강등

지금 `seasonOutcome()`은 client-local 계산입니다(`myRank(season)` → 승격/강등 →
다음 division). 서버 멤버십으로 옮기면:

- 시즌 종료(`league_instances.status='finished'`, 모든 fixture가 played 또는
  라운드 마감 시점)에 서버가 `league_standings` 뷰로 최종 순위를 계산.
- 각 실유저 멤버의 `nextDivision`을 `lib/league.ts`의 `seasonOutcome` 규칙(2위
  이내 승격, 18위 이하 강등)으로 그대로 계산 — 로직은 안 바꾸고 입력만 서버
  뷰에서 가져옴.
- 다음 시즌 배정은 2절의 "리그 배정 알고리즘"을 `nextDivision`으로 다시 태움 —
  같은 리그 인스턴스에 남는 게 아니라 **매 시즌 새 인스턴스**를 만듦(승격·강등으로
  구성원이 바뀌므로 인스턴스를 재사용할 이유가 없음). 이번 시즌 같이 뛰던 유저와
  다음 시즌도 같은 리그일 수 있지만, 그건 배정 알고리즘이 우연히 같은 결과를
  낸 것이지 보장은 아님.

## 7. 이번 범위에서 뺀 것

- 실시간 킥오프 시각 배정, 경기 중 개입 보상 (PR4).
- 친선 경기(미니게임) — 순위 없는 경기라 매칭 대상 아님, 지금처럼 로컬/AI만.
- 동시 접속 기반의 진짜 실시간 대전 — 3절에서 정한 비동기 정산이 v1의 답.
- 리그 채팅·초대·친구 등 소셜 기능.
- `public_club_squads`를 공개 안 한 유저가 그래도 "다른 실유저와 붙고 싶다"는
  요구 — v1에서는 공개가 사실상 참가 조건.

## 8. 롤아웃 리스크 — 지금 진행 중인 로컬 시즌

기존 유저는 이미 `saves.data.season`에 로컬 진행 중인(또는 완료된) 시즌을 갖고
있습니다. 이걸 강제로 서버 리그로 옮기면:

- 진행 중인 라운드·순위·보상 기록이 새 모델과 안 맞음(로컬 Season과 서버
  league_instances는 다른 스키마).
- **권장**: 강제 이관하지 않는다. 기존 로컬 시즌은 **그 시즌이 끝날 때까지
  지금 방식대로 완주**하게 두고, `newSeason` 액션이 발동하는 시점(=현재 로컬
  시즌이 `finished`가 되는 시점)에 처음으로 서버 리그 배정을 받게 한다. 이러면
  마이그레이션 스크립트나 유예 기간 관리가 필요 없고, `newSeason`이라는 이미
  있는 전환점을 그대로 씀.
- 서버 리그가 없는 빌드(로컬 개발, `NEXT_PUBLIC_SUPABASE_URL` 미설정)는 지금
  로직을 그대로 폴백으로 유지 — PR2가 "서버 없으면 아예 실패"로 간 것과 달리,
  리그 배정은 순위가 걸린 자산이 아니라 "누구랑 붙는지"이므로 서버가 없는
  개발 환경에서도 게임 자체는 돌아가야 함. 다만 그 폴백에서 나온 보상은
  서버가 있는 정식 빌드와 절대 같은 코드 경로면 안 됨(PR2와 같은 원칙 —
  섞이면 안 됨). **판단 필요**: 폴백을 아예 없애고 "서버 없으면 리그 탭 비활성화"로
  가는 게 더 안전할 수 있음.
- 비용 감각(ROADMAP 4절에 이미 있는 계산 재사용): 유저가 늘수록 라운드당 AI vs
  AI 정산 호출이 늘어남 — 다만 이건 멱등이라 여러 유저가 동시에 트리거해도
  실제 계산은 한 번만 일어남.

## Codex에 이어서 맡길 때

이 문서를 그대로 컨텍스트로 주고, 표시해 둔 "판단 필요" 네 곳(2절 대기시간, 3절
공개 스쿼드 없는 유저 처리, 8절 폴백 존치 여부)에 대한 결정을 먼저 받은 뒤 구현을
맡기는 게 낫습니다. 구현 범위를 맡길 땐 이 문서 + `lib/league.ts` +
`supabase/functions/simulate-match/handler.ts` + `supabase/schema.sql`의
`match_results`/`commit_match`/`public_club_squads` 절만 읽게 좁히면 됩니다.
