# 전술 엔진 설계 (Tactics Engine)

이 문서는 이 게임의 전술 시스템이 **무엇을 계산하고 무엇을 계산하지 않는지**를 정의한다.
전술은 P0 시스템이며, 구현 편의보다 현실성 · 확장성 · 밸런스 조정 가능성을 우선한다.

## 0. 원칙

전술은 결과를 직접 바꾸는 보정치가 아니다. 전술은 **행동**을 바꾸고, 행동이 **확률**을
바꾸고, 확률이 **찬스의 양과 질**을 바꾸고, 그 결과로 득점이 달라진다.

```
Tactic → Behaviour → Event Probability → Chance Creation → Goal
```

금지 사항:

- `if (tactic === 'gegenpress') attack += 10`
- `if (opponent === 'possession') winRate += 15`
- 전술 상성 표(가위바위보 테이블), 고정 상성 보너스

상성은 시뮬레이션 결과로 **발생**해야 한다. 이 규칙은 테스트로 강제한다
(`tests/tacticsSim.test.ts`의 *balance*, *no shortcuts*).

## 1. 기존 엔진 요약 (통합 지점)

| 파일 | 역할 |
| --- | --- |
| `lib/matchEngine.ts` | 틱 단위 경기 루프. 90분을 1분 1틱으로 돌리고, 중단(골·파울·아웃·하프타임), 선수 위치(관전 모드용 점), 이벤트, 실시간 체력을 관리 |
| `lib/match.ts` | `runToEnd` + `toResult` + 보상. 리그·컵·친선이 공유 |
| `lib/squad.ts` | 포지션 적합도, 케미, 팀 컬러, 라인업 레벨 상한, `SquadRating`(att/mid/def/hidden) |
| `lib/players.ts` | 선수 능력치(6대 스탯), 레벨 성장, 히든 능력치 |
| `lib/tactics.ts` | 화면에 보이는 4개 다이얼(플랜·압박·라인·템포)과 단축키 |
| `lib/condition.ts` | 경기 후 체력 소모와 부상 |

경기 엔진을 갈아엎지 않았다. 틱 루프 · 이벤트 · 중단 · 관전 모드 · 체력은 그대로 두고,
**한 틱 안에서 일어나는 일**만 전술 엔진으로 교체했다.

## 2. 모듈 구조

```
lib/tactics/
  params.ts      21개 전술 파라미터 (모두 0~100) + 기본값 · 정규화
  archetypes.ts  대표 전술 7종 — 특수 능력이 아니라 파라미터 조합
  profile.ts     선발 11명이 실제로 잘하는 것 (SquadProfile)
  state.ts       파라미터 + 선수 + 피로 → 공간 구조와 행동 능력 (TacticalState)
  sequence.ts    한 번의 공격 전개를 해결하는 순수 함수 (엔진의 심장)
  metrics.ts     경기 통계 (possession, PPDA 유사값, high turnover, xG proxy …)
  bridge.ts      4개 다이얼 → 파라미터 변환, 리그 상대의 스타일 생성
```

`lib/tactics.ts`(기존 UI 다이얼)는 그대로 두었다. `bridge.paramsFromSetup()`이 그것을
전술 파라미터로 번역하므로 **기존 UI · 세이브 · API는 손대지 않았다.**

## 3. 파라미터 (0~100)

**공격**: `tempo` `directness` `attackingWidth` `buildUpShortness` `passingRisk`
`finalThirdPatience` `crossFrequency` `throughBallFrequency` `overlapFrequency`

**수비**: `defensiveLine` `blockHeight` `pressingIntensity` `pressingCompactness`
`defensiveWidth` `offsideTrap`

`defensiveLine`(최종 수비라인)과 `blockHeight`(첫 압박 라인)는 **분리**한다. 미드 블록을
쓰면서 라인을 높게 두는 팀, 라인을 낮추고도 앞에서 압박하는 팀이 모두 표현된다.

**전환**: `counterPressIntensity` `regroupPriority` `counterAttackIntensity`
`transitionSpeed` `forwardRunFrequency` `restDefence`

## 4. 파생 상태 (`state.ts`)

파라미터는 그 자체로 아무 힘이 없다. 선수와 피로를 통과해야 값이 된다.

| 파생값 | 의미 | 주요 입력 |
| --- | --- | --- |
| `teamWidth` / `teamLength` | 팀이 차지하는 폭·길이(m). 공개 트래킹 연구의 관측 범위(폭 35~48m, 길이 31~46m)를 초기 기준으로 삼음 | 공격 폭, 직선성, 전진 빈도, 컴팩트니스 |
| `defensiveHeight` | 최종 라인 높이(m) | 수비 라인 × 남은 체력 |
| `spaceBehind` | 뒷공간 0~1 | 라인 높이 × 오프사이드 트랩 − (CB 속도 · GK 스위핑 · 위치선정) |
| `restDefence` | 역습 대비 0~1 | 잔류 인원 − 전진 인원 − 오버랩 |
| `pressPower` | 실제 압박력 | 압박 강도 × 활동량 × 가속 × 컴팩트니스 × **남은 체력** |
| `buildUpControl` | 압박 속에서 공을 지키는 힘 | 짧은 빌드업 × 짧은 패스 · 침착성 · 테크닉 |
| `bypassPress` | 압박을 건너뛰는 정도 | 직선성 × (1 − 짧은 빌드업) |
| `counterPressPower` | 잃은 직후 되찾는 힘 | 카운터프레스 × 활동량 × 컴팩트니스 × 체력 |
| `fatigueDraw` | 체력 소모 배수 | 압박 · 템포 · 카운터프레스 · 전진 · 오버랩 − 선수 스태미나 |

피로(`fatigue`)가 오르면 압박·라인·카운터프레스가 **먼저** 무너진다. 90분 내내 최대 압박이
최선이 되지 않게 하는 장치다.

## 5. 공격 전개 해결 (`sequence.ts`)

한 틱에서 공을 가진 팀이 한 번의 전개를 시도한다. 순수 함수이며 RNG를 주입받는다.

1. **빌드업 대 압박** — 압박이 닿는 범위(`pressPower × pressHeight`)와 우리가 노출되는
   정도(`buildUpShortness − bypassPress`)가 만나 `pressureFaced`가 정해진다. 길게 차면
   압박은 피하지만 패스 성공률을 잃는다(롱패스 비율만큼 완성률 감소).
2. **잃었을 때** — 어디서 잃었는지가 중요하다. 상대 압박 라인이 높으면 *high turnover*.
   그 직후 우리 `counterPressPower`가 즉시 되찾기를 시도한다(성공 시 우리 회수로 기록).
   되찾지 못하면 `restDefence`가 낮고 카운터프레스에 인원을 쏟았을수록 **역습 허용**.
3. **전진** — 상대 블록(컴팩트니스 · 위치선정)과 우리 전진력(전환 속도 · 직선성 · 시야)의
   싸움. 압박을 깨고 나온 직후에는 상대 블록이 무너져 있어 전진이 쉬워진다(press baiting).
   인내심 높은 팀이 밀집 블록을 만나면 **다시 돌린다**(`retained`) — 점유는 유지하되
   찬스는 만들지 못하는 무의미한 지배가 이렇게 표현된다.
4. **루트 선택** — 여기가 상성이 발생하는 지점이다. 루트 가중치는 우리 선호에
   **상대의 형태**를 곱한다.
   - 측면: 상대 수비 폭이 좁을수록 ↑ → 크로스 → 제공권 싸움
   - 뒷공간: 상대 `spaceBehind`가 클수록 ↑ → 속도 대결
   - 중앙: 상대 컴팩트니스가 낮을수록 ↑ → 테크닉 대 위치선정
5. **찬스 품질** — 위 대결 결과 + 인내심 + 결정력. 슛 하나의 xG proxy(0~1)로 나온다.

득점은 `quality × 전력차 보정 × (1.15 − 상대 GK/200) + 특성`으로 결정된다. 전술은
**기회를 만들고**, 선수 능력이 **그 기회를 마무리한다**. 어느 한쪽도 결과를 독점하지 않는다.

## 6. 경기 통계 (`metrics.ts`)

possession · passes · passesCompleted · longPasses · finalThirdEntries · shots ·
shotsOnTarget · xg · crosses · throughBalls · counterAttacks · pressures ·
defensiveActions · highTurnovers · turnoversLost · pressBeaten · fouls · staminaUsed

`ppda()`는 **PPDA 유사 지표**다(상대 패스 ÷ 우리 수비 액션). 실제 PPDA처럼 피치 60%
구간으로 제한하지 않으므로 절대값은 낮게 나온다. 방향성(압박 ↑ → 값 ↓)만 유효하다.

현재 기본값 기준 관측치(200경기): 득점 1.85 : 1.17, 슈팅 15 : 14, 점유 55%,
패스 성공률 77%, high turnover 8, 역습 5.

## 7. 검증

`tests/tacticsSim.test.ts` — 공식이 아니라 **시뮬레이션 결과**로 검증한다.

| 테스트 | 검증 내용 |
| --- | --- |
| A 압박 | 압박 ↑ → high turnover ↑, PPDA ↓, 체력 소모 ↑ |
| B 수비 라인 | 라인 ↑ + 빠른 상대 공격수 → 실점 기대값 ↑ |
| C 직선성 | 직선성 ↑ → 점유 ↓, 패스 성공률 ↓, 패스당 최종 3분의 1 진입 ↑ |
| D 로우 블록 | 점유는 내주지만 뒷공간 실점 기대값 ↓ |
| E 카운터프레스 | 성공 시 회수 ↑ / 뚫렸을 때(압박이 깨진 손실당) 역습 허용 ↑ |
| F 공격 폭 | 폭 ↑ → 크로스 ↑, 슈팅 대비 측면 비중 ↑ |
| balance | 전술마다 최고·최악 상대의 승점 차 ≥ 0.25(상대가 중요하다는 뜻), 평균 승점 1.5~2.7, 최고·최저 전술 간 격차 < 0.8 |
| no shortcuts | 같은 전술이 상대에 따라 다른 결과를 낸다(고정 보정이면 같아야 함) |

7종 아키타입 라운드로빈 실측 평균 승점: 게겐프레싱 2.47, 직선 역습 2.37, 로우 블록 2.29,
측면 공략 2.26, 점유 2.23, 중원 블록 2.17, 롱볼 2.13. 압박형이 근소하게 앞서지만
모든 전술이 특정 상대에게 승점을 잃는다.

## 8. 확장 계획 (아직 구현하지 않음)

- **국면 분리**: 지금은 IN_POSSESSION / DEFENSIVE_TRANSITION 두 국면만 실제로 분기한다.
  ATTACKING_TRANSITION과 OUT_OF_POSSESSION을 별도 파라미터 세트로 분리할 수 있도록
  `TacticalParams`를 국면별로 감쌀 예정이다.
- **In/Out of possession shape**: `Formation`은 기본 위치만 정의한다. 공격 시 3-2-5,
  수비 시 4-4-2 같은 형태 변환을 위해 `shapeFromSquad`를 국면별로 계산하도록 확장한다.
- **Score/Time context**: 남은 시간과 점수차에 따라 파라미터를 자동 보정하는 Match Plan AI.
  엔진은 이미 분당 상태를 알고 있으므로 훅만 추가하면 된다.
- **감독 능력치**: `coordination`(압박 조직력), `execution consistency`, `adaptability`를
  `TacticalState` 계산에 곱하는 형태로 넣는다. 숫자를 직접 올리지 않는다.
- **xT / VAEP 기반 캘리브레이션**: `sequence.ts`의 품질 계산을 공개 데이터의
  위치별 위협값으로 교체할 수 있도록 상수를 한곳에 모아둔다.
- **슬라이더 UI**: 엔진은 이미 21개 파라미터를 받는다. 화면만 붙이면 된다.

## 9. 밸런스 상수 관리

전술 관련 수치는 `lib/tactics/` 안에만 존재한다. `matchEngine.ts`에는 전술 상수를 두지
않는다(득점 변환식의 `1.15 − GK/200`, 전력차 `/160`만 예외이며 이는 선수 능력 쪽 상수다).
새 상수를 추가할 때는 반드시 해당 모듈 안에 이름을 붙여 둔다.
