/**
 * Every change that has shipped, newest first.
 *
 * This file is the record. A change is not finished until it has an entry
 * here, so the log is written at the same time as the code rather than
 * reconstructed afterwards.
 *
 * Nothing here is published on its own. The operator reads the log on the
 * 운영자 tab, picks the entries players should hear about, and those become a
 * patch note posted to 공지사항. Internal work — refactors, security fixes,
 * repository chores — can stay in the log and never leave it.
 */

export type PatchKind = 'feature' | 'balance' | 'fix' | 'internal'

export const PATCH_KIND_LABELS: Record<PatchKind, string> = {
  feature: '추가',
  balance: '조정',
  fix: '수정',
  internal: '내부',
}

export interface PatchEntry {
  /** Stable id. Never reuse or renumber — published notices point at these. */
  id: string
  /** ISO date the change shipped. */
  date: string
  kind: PatchKind
  /** One line, written for a player rather than a developer. */
  title: string
  /** Optional detail lines. */
  detail?: string[]
}

export const PATCH_LOG: PatchEntry[] = [
  {
    id: '2026-09-05-scout-reel',
    date: '2026-09-05',
    kind: 'feature',
    title: '뽑기가 「스카우트」로 — 프리미엄은 룰렛 연출로 한 명씩',
    detail: [
      '일반 스카우트는 지금처럼 바로 공개됩니다.',
      '프리미엄 스카우트는 후보 7명이 가로로 돌다 한 명에서 멈춥니다. 10연속은 한 명씩 열 번 이어지고, 「빨리 보기」로 남은 장을 한 번에 볼 수 있습니다.',
      '판이 금빛으로 바뀌는 특별 연출이 뜨면 후보에 라이브 이상이 섞여 있습니다 — 거기서 멈출 수도, 옆 실버에서 멈출 수도 있습니다.',
      '포지션을 지정해 뽑는 기능은 없어졌습니다.',
      '등급 이름을 정리했습니다: 일반 · 실버 · 골드 · 라이브 · 레전드 (예전 「월드」가 「골드」입니다). 카드 자체는 그대로입니다.',
    ],
  },
  {
    id: '2026-09-03-new-legend-card',
    date: '2026-09-03',
    kind: 'feature',
    title: '월드 등급 신규 카드 추가',
    detail: ['도르트 옐로우 소속 공격형 미드필더가 새로 들어왔습니다.'],
  },
  {
    id: '2026-09-03-server-match',
    date: '2026-09-03',
    kind: 'balance',
    title: '리그·컵 경기 결과를 서버가 정합니다',
    detail: [
      '결과 조작을 막기 위해 리그·컵 경기는 서버가 판정하고, 화면은 그 경기를 그대로 재생합니다.',
      '재생 중 전술 변경·교체 지시는 당분간 꺼져 있습니다 — 서버가 이미 정한 결과와 화면이 어긋나지 않도록 하기 위해서입니다. 친선 경기는 그대로 직접 조작할 수 있습니다.',
    ],
  },
  {
    id: '2026-09-03-match-seed',
    date: '2026-09-03',
    kind: 'internal',
    title: '경기 결과에 seed·engineVersion 기록',
    detail: ['같은 경기를 나중에 그대로 재현할 수 있도록 기록을 남깁니다. 서버 판정과 밸런스 조사의 전제입니다.'],
  },
  {
    id: '2026-09-03-player-archive',
    date: '2026-09-03',
    kind: 'feature',
    title: '선수 도감에서 모든 능력치를 보고, 같은 리그 팀의 스쿼드를 구경합니다',
    detail: [
      '아직 갖고 있지 않은 선수도 상세 능력치를 전부 볼 수 있습니다.',
      '내 리그에 있는 다른 팀(실제 유저든 AI든) 스쿼드를 열람할 수 있습니다. 히든 능력치는 여전히 운영자만 봅니다.',
    ],
  },
  {
    id: '2026-09-03-league-hub',
    date: '2026-09-03',
    kind: 'feature',
    title: '공개 리그센터 — 로그인 없이도 클럽과 카드를 둘러볼 수 있습니다',
    detail: ['새 첫 화면에서 리그·클럽·카드 도감을 볼 수 있습니다. 실제 플레이는 그대로 로그인 후 진행합니다.'],
  },
  {
    id: '2026-09-03-admin-console-split',
    date: '2026-09-03',
    kind: 'internal',
    title: '운영자 콘솔을 별도 화면(/admin)으로 분리',
    detail: ['게임 화면과 운영자 화면이 완전히 나뉘어, 게임 쪽 코드 용량이 줄었습니다.'],
  },
  {
    id: '2026-09-03-save-conflict-fix',
    date: '2026-09-03',
    kind: 'fix',
    title: '여러 탭·기기에서 동시에 플레이할 때 진행이 서로 덮어써지던 문제 수정',
    detail: ['오래된 탭의 저장이 최신 진행을 덮어쓰는 경우가 있었습니다. 이제 오래된 저장은 자동으로 최신 상태를 따라잡습니다.'],
  },
  {
    id: '2026-09-03-register-knob-lock',
    date: '2026-09-03',
    kind: 'internal',
    title: '운영자 전용 설정 함수에 권한 검사 추가',
    detail: ['해당 함수에 권한 검사가 빠져 있던 것을 막았습니다.'],
  },
  {
    id: '2026-09-03-rarity-labels',
    date: '2026-09-03',
    kind: 'fix',
    title: '카드 등급 표시가 바뀌었습니다 — 최상위는 레전드, 그 아래는 월드',
    detail: ['예전에는 최상위가 월드, 그 아래가 레전드였습니다. 순서를 바꿔 최상위를 레전드로 옮겼습니다. 능력치와 카드 자체는 그대로입니다 — 이름만 바뀌었습니다.'],
  },
  {
    id: '2026-09-03-hidden-stats-hidden',
    date: '2026-09-03',
    kind: 'balance',
    title: '히든 능력치는 이제 운영자만 봅니다',
    detail: ['결정력·지구력·큰 경기·기복 네 수치가 잠깐 선수 상세에 공개됐다가, 경기 결과에 영향을 주는 정보라 다시 비공개로 돌렸습니다. 카드 능력 자체는 그대로입니다.'],
  },
  {
    id: '2026-09-03-substats',
    date: '2026-09-03',
    kind: 'feature',
    title: '세부 능력치 23개 — 카드는 평균, 스쿼드에서 진짜 수치를 봅니다',
    detail: ['기존 6개 능력치 안쪽에 더 자세한 항목이 생겼습니다. 카드에 보이는 숫자는 그 항목들의 평균이고, 스쿼드 화면에서 선수를 눌러보면 세부 수치를 볼 수 있습니다.'],
  },
  {
    id: '2026-09-03-item-shop-admin',
    date: '2026-09-03',
    kind: 'internal',
    title: '교환소 비용과 상점 진열을 운영자 탭에서 조절',
    detail: ['배포 없이 값을 바꿀 수 있습니다.'],
  },
  {
    id: '2026-09-02-leagues',
    date: '2026-09-02',
    kind: 'feature',
    title: '8개 리그 160팀 · 선수 2,781명',
    detail: [
      '킹덤·이베리아·게르만·아주로·코리아·루소·오라녜·트리콜로 여덟 리그, 리그마다 20팀입니다.',
      '팀마다 양쪽 풀백과 윙어가 있고, 팀당 에이스 카드가 둘씩 있습니다.',
      '골드 이상 등급에 왼쪽·오른쪽 수비수가 한 명도 없던 문제가 해결됐습니다.',
      '이미 가지고 계신 카드는 그대로입니다. 새 선수는 뒤에 붙였습니다.',
    ],
  },
  {
    id: '2026-09-02-pack-reason',
    date: '2026-09-02',
    kind: 'fix',
    title: '10연차가 이유 없이 잠기던 문제',
    detail: [
      '보관함에 한 칸이라도 남으면 경고가 사라져서, 10연차 버튼만 조용히 잠긴 채 이유를 알 수 없었습니다.',
      '이제 팩마다 왜 못 사는지 적힙니다 — 몇 칸이 더 필요한지, 골드가 얼마 모자란지.',
    ],
  },
  {
    id: '2026-09-02-sub-limit',
    date: '2026-09-02',
    kind: 'balance',
    title: '경기당 교체 5명 제한',
    detail: ['자동 교체와 직접 교체를 합쳐 한 경기에 5명까지 바꿀 수 있습니다.'],
  },
  {
    id: '2026-09-02-live-autosub',
    date: '2026-09-02',
    kind: 'feature',
    title: '경기 중 자동 교체',
    detail: [
      '경기 도중 체력이 떨어진 선수를 자동으로 교체합니다. 지시는 바로 들어가고 경기가 멈추면 투입됩니다.',
      '교체로 들어갈 선수가 곧바로 다시 빠질 만큼 지쳐 있으면 아예 바꾸지 않습니다.',
    ],
  },
  {
    id: '2026-09-02-lineup-and-items',
    date: '2026-09-02',
    kind: 'balance',
    title: '경기 후 라인업 유지, 아이템 정리',
    detail: [
      '경기가 끝나면 감독이 짠 선발 라인업으로 돌아옵니다. 교체는 그 경기에만 적용됩니다.',
      '지치거나 다친 선수는 킥오프 직전에 자동으로 교체됩니다. 기본으로 켜져 있습니다.',
      '한계 돌파석, 훈련 교본, 특별 훈련서를 상점에서 뺐습니다.',
    ],
  },
  {
    id: '2026-09-02-password-reset',
    date: '2026-09-02',
    kind: 'feature',
    title: '비밀번호 재설정',
    detail: [
      '로그인 화면의 "비밀번호 재설정"으로 메일을 받아 새 비밀번호를 정할 수 있습니다.',
      '로그인 상태에서는 내 계정에서 바로 바꿀 수 있습니다.',
    ],
  },
  {
    id: '2026-09-02-item-prices',
    date: '2026-09-02',
    kind: 'internal',
    title: '아이템 가격을 운영자가 조절',
    detail: ['운영자 탭에서 아이템별 골드·조각 가격을 바꿉니다. 배포 없이 상점에 반영됩니다.'],
  },
  {
    id: '2026-09-02-items',
    date: '2026-09-02',
    kind: 'feature',
    title: '아이템 · 상점 · 창고 추가',
    detail: [
      '회복 음료, 치료 키트, 훈련 교본, 한계 돌파석, 이적시장 갱신권, 친선 경기권, 보관함 확장권, 조각 주머니 등 열 가지.',
      '골드로 사는 것과 조각으로 사는 것이 나뉘고, 강한 아이템에는 하루 구매 한도가 있습니다.',
      '창고에서 선수를 골라 씁니다. 효과가 없을 아이템은 아예 소모되지 않습니다.',
    ],
  },
  {
    id: '2026-09-02-care-visible',
    date: '2026-09-02',
    kind: 'fix',
    title: '부상 치료 · 체력 회복 버튼이 늘 보이게',
    detail: [
      '예전에는 부상이 있거나 체력이 닳았을 때만 나타나서, 기능이 있는지 알 수 없었습니다.',
      '이제 항상 보이고, 지금 쓸 수 없으면 왜인지 버튼에 적힙니다.',
    ],
  },
  {
    id: '2026-09-02-hidden-and-cards',
    date: '2026-09-02',
    kind: 'feature',
    title: '히든 능력치 공개와 카드 생성 탭',
    detail: [
      '결정력·지구력·큰 경기·기복이 선수 상세에 나옵니다. 경기 결과를 바꾸는데 지금까지 어디에도 보이지 않았습니다.',
      '카드 생성이 별도 탭으로 나왔고, 여섯 능력치와 히든 넷을 하나씩 정할 수 있습니다.',
    ],
  },
  {
    id: '2026-09-02-draw-server-hardening',
    date: '2026-09-02',
    kind: 'fix',
    title: '뽑기 서버 안정화',
    detail: [
      '서버 함수가 바깥 모듈을 하나도 불러오지 않도록 바꿨습니다. 모듈을 못 불러와 함수가 뜨지 못하는 경우가 사라집니다.',
      '실패하면 무엇이 잘못됐는지 화면에 함께 나옵니다.',
    ],
  },
  {
    id: '2026-09-02-draw-error-fix',
    date: '2026-09-02',
    kind: 'fix',
    title: '뽑기 실패 원인이 가려지던 문제 수정',
    detail: [
      '골드 부족이나 계정 준비 같은 이유가 "서버에 연결하지 못했습니다"로 뭉뚱그려지던 것을 고쳤습니다.',
    ],
  },
  {
    id: '2026-09-02-operator-tools',
    date: '2026-09-02',
    kind: 'internal',
    title: '운영 도구 — 밸런스 조절과 신규 카드 만들기',
    detail: [
      '체력 저하율 등 13개 값을 운영자 탭에서 바로 조절합니다. 저장하면 배포 없이 적용됩니다.',
      '신규 카드는 게임이 실제로 만들 카드를 미리 보고, 붙여넣을 코드 한 줄을 받습니다.',
    ],
  },
  {
    id: '2026-09-02-signup-fix',
    date: '2026-09-02',
    kind: 'fix',
    title: '회원가입 문제 수정 — 확인 메일 링크와 안내',
    detail: [
      '확인 메일의 링크가 가입한 주소로 돌아옵니다. 예전에는 서버 기본 주소로 가서 링크가 열리지 않을 수 있었습니다.',
      '이미 가입된 이메일이면 그렇다고 알려줍니다. 오지 않을 메일을 기다리지 않도록.',
      '확인 메일 다시 보내기와 서버 연결 확인 버튼을 로그인 화면에 넣었습니다.',
    ],
  },
  {
    id: '2026-09-02-build-stamp',
    date: '2026-09-02',
    kind: 'internal',
    title: '화면 아래에 배포일시 표시',
    detail: [
      '같은 커밋을 다시 배포하면 커밋만으로는 구분이 되지 않아, 빌드 시각을 함께 찍습니다.',
    ],
  },
  {
    id: '2026-09-02-server-gacha',
    date: '2026-09-02',
    kind: 'internal',
    title: '뽑기를 서버로 — 확률과 난수가 서버에 있습니다',
    detail: [
      '카드팩은 이제 서버가 엽니다. 모든 뽑기가 시드·확률표와 함께 기록되어, 고지한 확률이 실제와 같음을 증명할 수 있습니다.',
      '골드는 숫자 하나가 아니라 거래 기록이 되었습니다. 잔액은 그 합계입니다.',
      '픽업 주간이 기기 시간이 아니라 서버 기준(KST)으로 정해집니다.',
    ],
  },
  {
    id: '2026-09-02-monitoring',
    date: '2026-09-02',
    kind: 'internal',
    title: '치팅 모니터링 — 서로 다른 신호가 겹치는 계정을 찾습니다',
    detail: [
      '저장 거부·저장 폭주·골드 급증·경기 폭주·진행 되감기·게시판 도배 여섯 신호를 따로 봅니다.',
      '한 신호는 우연일 수 있으므로, 겹치는 계정만 위로 올립니다.',
    ],
  },
  {
    id: '2026-09-02-security-boundary',
    date: '2026-09-02',
    kind: 'internal',
    title: '신뢰 경계 설계와 세이브 감사 · 방어벽',
    detail: [
      '상용화와 실시간 리그를 전제로 서버 권한 이전 계획을 문서로 확정했습니다.',
      '세이브 쓰기를 전부 기록하고, 정상 플레이로는 불가능한 값은 서버가 거부합니다.',
    ],
  },
  {
    id: '2026-09-02-tactics-compare',
    date: '2026-09-02',
    kind: 'feature',
    title: '전술 비교 — 두 전술을 같은 상대·같은 운으로 겨뤄 봅니다',
    detail: [
      '스쿼드 탭의 전술 비교에서 두 전술을 골라 30·60·120경기를 치릅니다.',
      '승점, 득실, 기대 득점, 점유율, PPDA, 상대 진영 탈취까지 나란히 보여줍니다.',
      '두 전술은 같은 난수를 씁니다. 표의 차이는 운이 아니라 전술이 만든 것입니다.',
    ],
  },
  {
    id: '2026-09-02-patch-board',
    date: '2026-09-02',
    kind: 'internal',
    title: '운영자 전용 패치 로그 게시판과 공지 발행 기능',
    detail: [
      '바뀐 내용이 패치 로그로 남고, 운영자가 고른 항목만 공지사항으로 나갑니다.',
    ],
  },
  {
    id: '2026-09-02-tactics-mode',
    date: '2026-09-02',
    kind: 'feature',
    title: '전술 방식 선택 — 슬라이더냐, 국면 분리냐',
    detail: [
      '스쿼드 → 전술 상세 맨 위에서 고릅니다.',
      '슬라이더는 21개 값 하나로 90분을 지시하고, 국면 분리는 네 상황마다 따로 지시합니다.',
      '고른 방식이 실제 경기에 반영됩니다. 국면 지시는 방식을 바꿔도 저장돼 있습니다.',
    ],
  },
  {
    id: '2026-09-02-card-style',
    date: '2026-09-02',
    kind: 'feature',
    title: '카드1 / 카드2 — 예전 카드 디자인을 골라 쓸 수 있습니다',
    detail: [
      '상단의 카드1·카드2 스위치로 게임 안 모든 선수 카드가 함께 바뀝니다.',
      '카드2는 예전의 평평한 등급 색과 등급별 연출을 되살린 것입니다.',
    ],
  },
  {
    id: '2026-09-02-tactics-sliders',
    date: '2026-09-02',
    kind: 'feature',
    title: '전술 슬라이더 21개와 국면 분리',
    detail: [
      '템포·압박 강도·수비 라인 등 21개 값을 직접 조절합니다.',
      '공격·공격 전환·수비·수비 전환 네 상황마다 다르게 지시할 수 있습니다.',
    ],
  },
  {
    id: '2026-09-01-tactics-engine',
    date: '2026-09-01',
    kind: 'balance',
    title: '전술 엔진 개편 — 전술이 행동을 바꾸고, 행동이 경기를 만듭니다',
    detail: [
      '전술이 승률에 직접 더해지지 않습니다. 팀이 서는 위치와 행동이 바뀌고 그 결과가 경기에서 나옵니다.',
      '강한 지시에는 반드시 대가가 따릅니다. 높은 라인은 뒷공간을, 강한 압박은 체력을 내줍니다.',
    ],
  },
  {
    id: '2026-09-01-save-repair',
    date: '2026-09-01',
    kind: 'fix',
    title: '깨진 저장 데이터로 화면이 비던 문제 수정',
  },
  {
    id: '2026-09-01-security',
    date: '2026-09-01',
    kind: 'internal',
    title: '보안 점검 반영 — 클라우드 세이브 검증, 용량 상한, 보안 헤더',
  },
  {
    id: '2026-09-01-upgrade-target',
    date: '2026-09-01',
    kind: 'feature',
    title: '선발 선수도 강화 대상으로 고를 수 있고, 강화 방식마다 설명이 붙습니다',
  },
  {
    id: '2026-09-01-out-of-position',
    date: '2026-09-01',
    kind: 'balance',
    title: '포지션이 달라도 배치됩니다 — 대신 능력치가 떨어집니다',
    detail: ['자리에 맞는 선수가 없어 경기를 시작하지 못하던 상황이 사라집니다.'],
  },
  {
    id: '2026-09-01-login-lockerroom',
    date: '2026-09-01',
    kind: 'feature',
    title: '로그인 필수화와 감독실 홈 화면',
  },
  {
    id: '2026-09-01-lineup-guard',
    date: '2026-09-01',
    kind: 'fix',
    title: '선발이 11명이 아니면 경기를 시작할 수 없게',
  },
  {
    id: '2026-09-01-minigame',
    date: '2026-09-01',
    kind: 'feature',
    title: '데일리 미니게임 — 순위와 무관한 친선 경기 하루 10판',
  },
  {
    id: '2026-09-01-accounts',
    date: '2026-09-01',
    kind: 'feature',
    title: '회원가입 · 로그인 · 클라우드 세이브와 게시판',
  },
  {
    id: '2026-09-01-live-stamina',
    date: '2026-09-01',
    kind: 'balance',
    title: '경기 중 체력이 닳고, 지친 선수는 자동으로 교체됩니다',
  },
  {
    id: '2026-08-31-mobile-controls',
    date: '2026-08-31',
    kind: 'feature',
    title: '모바일 우선 경기 조작 — 전술 프리셋과 하단 고정 지시 바',
  },
  {
    id: '2026-08-31-live-match',
    date: '2026-08-31',
    kind: 'feature',
    title: '관전 모드와 경기 중 개입',
    detail: ['지시는 언제든 내리고, 적용은 경기가 끊긴 순간에 이루어집니다.'],
  },
  {
    id: '2026-08-31-packs',
    date: '2026-08-31',
    kind: 'balance',
    title: '카드팩을 일반팩 · 프리미엄팩 두 종류로 개편',
  },
  {
    id: '2026-08-31-league',
    date: '2026-08-31',
    kind: 'feature',
    title: '풋볼데이식 육성 · 20팀 리그 · 통합 일정으로 전면 개편',
  },
  {
    id: '2026-08-31-gacha-depth',
    date: '2026-08-31',
    kind: 'feature',
    title: '갓챠 심화 — 천장 · 주간 픽업 · 팩 종류 · 조각 교환소',
  },
]

/** Newest first, which is also how the file is written. */
export function sortedPatchLog(log: PatchEntry[] = PATCH_LOG): PatchEntry[] {
  return [...log].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
}

export function patchEntry(id: string, log: PatchEntry[] = PATCH_LOG): PatchEntry | null {
  return log.find((item) => item.id === id) ?? null
}
