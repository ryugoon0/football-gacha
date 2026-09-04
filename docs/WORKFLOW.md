# 작업 절차 (여러 PC · 여러 세션 공통)

이 문서는 어느 PC의 어느 Claude Code 세션이든 같은 방식으로 일하기 위한 절차다.
규칙(무엇을 하지 않을지)은 `CLAUDE.md`에, 절차(어떻게 하는지)는 여기에 둔다.

## 0. PC 준비 (한 번)

| 항목 | 명령 | 비고 |
| --- | --- | --- |
| Git | `winget install -e --id Git.Git` | 설치 후 새 창 |
| Node 20+ | `winget install -e --id OpenJS.NodeJS.LTS` | 게임 빌드·검증 |
| Python 3.11~3.13 | `winget install -e --id Python.Python.3.12` | 페이스팩 도구 |
| Claude Code | `winget install -e --id Anthropic.ClaudeCode` | 같은 계정으로 로그인 |
| 저장소 | `git clone https://github.com/ryugoon0/football-gacha.git` → `npm install` | |
| Codex CLI | `npm i -g @openai/codex` → `codex login` | ChatGPT 계정, 브라우저 로그인 |
| Codex 플러그인 | `claude plugin marketplace add openai/codex-plugin-cc` → `claude plugin install codex@openai-codex`(마켓플레이스 등록 이름이 `openai-codex`) → 세션 재시작 후 `/codex:setup` | 이미지 생성·독립 리뷰용, 선택 |
| Supabase | `npx supabase login` → `npx supabase link --project-ref mpndwtqvwmarkepxzhew` | 마이그레이션·함수 수동 배포가 필요할 때만 |
| `.env.local` | 다른 PC에서 복사 | 로컬에서 앱을 띄울 때만 |
| 권한 | `.claude/settings.local.json` 의 `permissions.allow` | 예: `Bash(python:*)`, `Bash(python -m pip:*)` |

GPU PC(RTX 3070)는 PyTorch를 CUDA 빌드로 바꾼다:
`python -m pip uninstall -y torch && python -m pip install torch --index-url https://download.pytorch.org/whl/cu128`.
rembg를 GPU로 돌리려면 `onnxruntime-gpu==1.20.1`(CUDA 12 계열).

## 1. 세션 시작

1. `git pull` — 다른 PC가 먼저 밀어 둔 커밋이 있다.
2. `CLAUDE.md`의 "지켜야 할 결정"과 `ROADMAP.md` 4·5절, 관련 `docs/`를 읽는다.
3. 다른 PC의 세션이 살아 있으면 `ListAgents`로 보이고, 필요한 배경은 그 세션에 메시지로 물을 수 있다.

## 2. 개발 사이클

1. 변경 → `npx tsc --noEmit && npx next lint && npx vitest run && npm run build`.
   검증은 종료 코드로 묶어 실패하면 커밋하지 않는다(`| head` 같은 파이프로 tsc 결과를 가리지 않기).
2. 커밋 메시지는 한국어, 무엇이 왜 바뀌었는지 한두 줄. 끝에 `Co-Authored-By: Claude …` 와 세션 링크.
3. `git push origin main` → Vercel이 프론트를, GitHub Actions가 Edge Function을 배포한다.
4. `AGENTS.md`(Codex 플러그인 생성물)는 커밋하지 않는다.

## 3. 서버 변경

- **마이그레이션**: `supabase/migrations/<타임스탬프>_<이름>.sql` 추가 → `npx supabase db push --linked --yes`.
  함수 시그니처가 바뀌면 옛 시그니처를 `drop function if exists`로 지운다.
  검증은 `do $$ … raise exception 'ROLLBACK_TEST …'; end $$;` 블록을 `npx supabase db query --linked -f 파일`로 돌려
  롤백되는 상태에서 결과를 읽는다(여러 문장은 마지막 결과만 보이므로 문장당 파일 하나).
- **Edge Function**: `lib/` 변경이 판정에 영향을 주면 `npm run build:functions` 뒤
  `npx supabase functions deploy <이름들> --project-ref mpndwtqvwmarkepxzhew`.
  선수 데이터가 바뀌면 `draw-pack simulate-match simulate-pvp-match pvp-opponent-squad weekly-fixture-live` 전부.
- **크론**: pg_cron 작업은 마이그레이션 안에서 `cron.unschedule` 후 `cron.schedule`.

## 4. 명단·초상

- 실제 스쿼드 카드: `data/squads/NN-<club>.json` 추가(파일명 정렬 순서가 id 순서) → `npm run build:squads`.
  `pilot: true`면 뽑기·시장에서 빠진 `unreleased` 카드. 가명이 겹치면 빌드가 실패한다.
- 초상은 배포하지 않는다. 페이스팩은 `tools/facepack/README.md` 절차로 각자 기기에서 만든다.

## 5. 두 PC를 함께 쓸 때

- 같은 파일을 두 세션이 동시에 고치지 않는다. 한쪽이 푸시하면 다른 쪽은 작업 전 `git pull`.
- 무거운 계산(초상 업스케일·인물 분리·대량 이미지)은 GPU PC 세션에 맡긴다. 이 세션에서
  `SendMessage`로 지시하고 결과를 돌려받을 수 있다.
- 사진·모델 가중치·생성 이미지는 어느 PC에서도 커밋하지 않는다(`.gitignore`에 있음).

## 6. Codex 쓰는 기준

`CLAUDE.md`의 위임 규칙을 따른다. 요약하면: 단순·명확한 작업은 Claude가 직접, Codex는
독립적인 두 번째 시각(리뷰·원인 분석)이나 이미지 생성처럼 실제 이득이 있을 때만.
Codex 플러그인은 그 PC의 Codex CLI 로그인 상태를 쓰고, 이미지 생성은 ChatGPT 사용량 한도에 걸린다.
