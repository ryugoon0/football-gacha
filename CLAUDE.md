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

## 작업 시작 전에 읽을 것

- `ROADMAP.md` 4·5절 — 핸드오프 문서 검토 결과와 미결 항목이 우선순위로 정리돼 있다.
  `docs/football-day-claude-code-handoff.txt`는 그린필드를 전제로 쓰여 있어서 이미
  구현된 것을 미구현으로 다루는 부분이 있다. 그 문서만 보고 착수하지 않는다.
- `docs/SECURITY_ARCHITECTURE.md` — 서버 이전 단계 계획. 리그를 서버로 옮기는 이야기가
  나오면 이 문서와 핸드오프 문서가 충돌하므로 먼저 정리한다.

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

## 어느 PC에서든 지켜야 할 결정 (2026-09-05 기준)

이 목록은 세션 메모리와 무관하게 저장소에 남긴다. 새 PC·새 세션에서도 그대로 적용한다.

- **실명 금지**: 선수·클럽 실명을 명단(`lib/players.ts`, `data/squads/*.json`의 `name`)에 넣지 않는다. 힌트
  스타일 가명만 쓴다. 실명은 운영자 전용 매핑(`lib/rosterRealHints.ts`, squads JSON의 `real`)에만 둔다.
- **초상은 SVG 그림 + 유저 페이스팩**: AI 생성 초상(실사·일러스트 모두)은 게임에 배포하지 않는다.
  `public/players/`와 `lib/portraitManifest.ts`는 비워 둔다. 생성물은 `assets/players-hold/`에만 보관.
- **페이스팩 사진은 저장소에 넣지 않는다**: 사진·결과 PNG·zip은 각자 기기에서 `tools/facepack/`으로 만들어
  게임 「계정 → 페이스팩」으로 불러온다. 사진 권리 확인과 출처 표기(CREDITS)는 만드는 사람이 한다.
- **「퇴장감」(n1125) 카드는 영구 유지**: 어떤 명단 개편·이관에서도 삭제·이관하지 않는다. 특수 히든도 없다.
- **"레전드"는 최상위 등급(표시 라벨)을 뜻한다**, 내부 `Legend` 타입이 아니다.
- **팀 컬러는 선발+후보 18명 기준**, 같은 종류(클럽/리그/국가)는 가장 큰 그룹 하나만 발동.
- **라이브 입장·히든 카드는 킥오프 10분 전부터**.
- **카드에 국기·등급·리그 표식·클럽 배지 넣지 않기** — 테스트 결과 지저분하다고 롤백됨.
- 사용자에게 보이는 모든 출력은 한국어.

## 다른 PC에서 작업을 시작할 때

- Node 20+, Python 3.11~3.13, Git. `npm install` 후 `npx tsc --noEmit && npx next lint && npx vitest run`.
- Supabase 마이그레이션·Edge Function 배포는 `npx supabase login` + `npx supabase link --project-ref mpndwtqvwmarkepxzhew`
  가 먼저 필요하다. 프론트 배포는 main 푸시로 Vercel이, 함수 배포는 GitHub Actions가 맡는다.
- `.env.local`(Supabase 키)은 깃에 없다. 로컬에서 앱을 띄울 때만 필요하다.
- Codex 플러그인(이미지 생성)은 선택 사항이며 페이스팩 도구에는 필요 없다.
