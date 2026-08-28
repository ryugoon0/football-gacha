# Football Day — 축구 카드 매니저

풋볼데이 스타일의 축구 카드 수집·매니지먼트 게임입니다. 카드팩을 뽑아 선수를 모으고,
스쿼드를 짜고, 리그 경기를 시뮬레이션하며 승격을 노립니다. Next.js App Router + TypeScript +
Tailwind CSS로 만들었고, 서버나 데이터베이스 없이 브라우저에서 완결됩니다.

## 게임 방식

| 탭 | 내용 |
| --- | --- |
| **뽑기** | 1회(300G) / 10연차(2700G) 카드팩. 10연차는 레어 이상 1장 보장. 노멀 70% · 레어 20% · 레전드 5% · 라이브 3% · 월드 2% |
| **스쿼드** | 4-3-3 / 4-4-2 / 4-2-3-1 / 3-5-2 전술판. 자리를 눌러 선수를 배치하거나 자동 배치. 포지션이 맞을수록 케미가 오르고 팀 전력이 올라갑니다 |
| **선수단** | 보유 카드 목록, 등급·포지션 필터, 강화(전 능력치 +1/레벨, 최대 10), 방출, 중복 카드 일괄 방출, 도감 진행도 |
| **경기** | 상대 3팀 중 선택 → 90분 실시간 텍스트 중계. 결과에 따라 골드와 승점을 얻고, 승점 15점마다 상위 리그로 승격 |

- 선수 61명, 5등급, 12개 포지션. 능력치는 포지션별 가중치로 계산한 오버롤(OVR)로 표시됩니다.
- 카드 일러스트는 선수 ID에서 결정되는 SVG로 그려집니다(이미지 파일 없음).
- 진행 상황은 `localStorage`에 자동 저장되며, 하단의 **게임 초기화**로 되돌릴 수 있습니다.

## 실행

```bash
npm install
npm run dev      # http://localhost:3000
npm run build && npm start
npm run typecheck
npm run lint
```

## 구조

```
app/
  layout.tsx            루트 레이아웃 / 메타데이터
  page.tsx              엔트리
  api/gacha/route.ts    카드 뽑기 API (?count=1..10)
components/
  GachaGame.tsx         헤더 + 탭 셸
  GameProvider.tsx      게임 상태 리듀서 · localStorage 저장
  PlayerCard.tsx        카드 UI
  PlayerAvatar.tsx      선수 ID 기반 SVG 초상
  tabs/                 뽑기 · 스쿼드 · 선수단 · 경기 화면
lib/
  players.ts            선수 로스터와 능력치 생성
  gacha.ts              확률과 뽑기 로직 (API와 클라이언트 공용)
  formations.ts         포메이션과 전술판 좌표
  squad.ts              포지션 적합도 · 케미 · 팀 전력 계산
  match.ts              경기 시뮬레이션과 보상
  storage.ts            세이브 데이터
```

등장하는 선수·클럽 이름은 모두 가상의 이름입니다.
