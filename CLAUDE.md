# football-gacha

풋볼데이 스타일 축구 클럽 매니저 게임. Next.js 14 App Router · TypeScript · Tailwind ·
Supabase(인증·클라우드 세이브·게시판·Edge Function).

## 확인 명령

```bash
npx tsc --noEmit      # 타입
npx next lint         # 린트
npx vitest run        # 테스트
npm run build         # 프로덕션 빌드
npm run build:roster  # lib/rosterData.ts 재생성 (선수 명단 스크립트)
```

선수 데이터(`lib/players.ts`, `lib/rosterData.ts`, `lib/rosterOverrides.ts`)를 고치면
뽑기를 확정하는 Edge Function 번들도 다시 나가야 한다. main에 올라가면 GitHub Actions가
알아서 배포한다.

## Codex 작업 분산 규칙

이 저장소는 OpenAI 공식 플러그인 `openai/codex-plugin-cc`로 Codex를 함께 쓴다.
Claude가 작업을 조율하고, 판단이 무거운 일만 Codex에 넘긴다.

### Claude가 직접 처리

- 파일 검색과 기존 구조 파악
- 한두 파일의 단순 수정
- import, 문구, 스타일, 타입 오류 수정
- lint, build, test 실행
- Git 상태와 변경 파일 확인
- 요구사항이 명확하고 판단이 적은 작업

### Codex 위임을 우선 고려

- 아키텍처와 데이터 모델 설계
- 원인 후보가 여러 개인 복잡한 장애 분석
- 세 개 이상 모듈이 관련된 설계 변경
- 알고리즘과 시뮬레이션 계산식 설계 (경기 엔진, 전술, 능력치 생성 등)
- 성능, 동시성, 보안, 데이터 손실 위험 검토
- 대규모 리팩터링 전략 수립
- 중요 기능 구현 후 독립적인 코드 리뷰
- 사용자가 명시적으로 Codex 위임을 요청한 작업

### 위임 원칙

- 단순 작업은 Claude가 직접 처리한다.
- Codex 호출 전에 관련 파일 경로, 목표, 제약조건, 오류 로그를 좁혀 전달한다.
- Codex에 저장소 전체를 다시 분석하라고 요청하지 않는다.
- 설계만 필요하면 코드 수정 금지를 명시한다.
- 구현을 맡길 때는 수정 가능한 파일 범위와 테스트 조건을 명시한다.
- 같은 문제를 Claude와 Codex가 처음부터 중복 분석하지 않는다. 한쪽이 이미 좁혀 놓은
  범위와 사실을 넘겨주고, 받은 쪽은 그 지점에서 이어서 한다.
- Codex 결과를 무조건 적용하지 않는다. 현재 코드와의 충돌과 타당성을 먼저 확인한다.
- 중요하지 않은 작업에는 Codex를 호출하지 않는다.
- 사용자가 요청하지 않는 한 자동 review gate(`/codex:setup --enable-review-gate`)를
  켜지 않는다. 사용량이 빠르게 소모된다.
- 오래 걸리는 작업은 가능한 경우 `--background`로 실행하고 `/codex:status`로 확인한다.

### 명령

| 명령 | 쓰임 |
| --- | --- |
| `/codex:review` | 현재 변경사항 독립 코드 리뷰 |
| `/codex:adversarial-review` | 더 공격적인 리뷰 |
| `/codex:rescue` | 막힌 문제의 원인 분석·설계 요청 |
| `/codex:transfer` | 작업 자체를 Codex에 넘김 |
| `/codex:status` · `/codex:result` · `/codex:cancel` | background 작업 관리 |

Codex는 로컬 Codex CLI의 ChatGPT 로그인 상태를 그대로 쓴다. API 키를 코드나 설정
파일에 적지 않는다. 따라서 이 연동은 Codex CLI가 설치·로그인된 PC의 로컬 세션에서만
동작하고, 클라우드 세션(claude.ai/code)에서는 동작하지 않는다.
