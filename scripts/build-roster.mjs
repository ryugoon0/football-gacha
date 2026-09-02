import { writeFileSync } from 'fs'

/**
 * Builds the bulk of the roster.
 *
 * The hand written cards in lib/players.ts stay exactly where they are — a
 * card's id is its position in that list, so inserting anything before them
 * would turn everyone's collection into different players. This file is
 * appended after them.
 *
 * Every name, club and league here is invented. They are shaped to hint at a
 * real side without being one, the same as the cards already in the game.
 */

// 7 leagues, 20 clubs each. The wink is in the shape of the name, never the name.
const LEAGUES = {
  '킹덤 리그': {
    nation: '잉글랜드',
    clubs: [
      '맨체스 레즈', '맨체스 블루', '리버 머지', '런던 블루스', '북런던 건너스',
      '북런던 화이트', '뉴캐슬 매파이', '아스톤 라이온', '브라이턴 걸스', '웨스트햄 아이언',
      '에버턴 토피', '울버 늑대', '풀럼 코티지', '크리스탈 이글', '노팅엄 포레스터',
      '본머스 체리', '브렌트 벌', '레스터 폭스', '사우스 세인트', '리즈 화이트',
    ],
  },
  '이베리아 리가': {
    nation: '스페인',
    clubs: [
      '마드리드 블랑코', '카탈루냐 블라우', '마드리드 로히', '바스크 아슬레', '세비야 로호',
      '발렌시아 무르시엘', '비고 셀레스테', '빌바오 레온', '헤타페 아술', '베티스 베르데',
      '오사수나 로하', '마요르카 베르멜', '지로나 로히블랑', '알라베스 아술', '라스팔마스 옐로',
      '라요 프랑코', '에스파뇰 페리케', '셀타 오세아니', '레가네스 페피네로', '바야돌리드 블랑키',
    ],
  },
  '게르만 리가': {
    nation: '독일',
    clubs: [
      '바이언 뮌히', '도르트 옐로', '레버 아스피린', '라이프 불스', '슈투트 벤츠',
      '프랑크 이글', '호펜 마을', '브레멘 그린', '프라이 검은숲', '아우크스 푸거',
      '묀헨 망아지', '볼프스 늑대', '마인츠 카니발', '우니온 철강', '보훔 광부',
      '하이덴 나이트', '킬 상어', '장크트 해적', '뒤셀 라인', '함부르크 로테',
    ],
  },
  '아주로 세리에': {
    nation: '이탈리아',
    clubs: [
      '토리노 비앙코네로', '밀라노 로소네로', '밀라노 네라주로', '나폴리 파르테노',
      '로마 잘로로소', '로마 비앙코셀레스테', '피오렌 비올라', '아탈란 베르가모',
      '볼로냐 로소블루', '토리노 그라나타', '우디네 제브레', '제노아 그리포네',
      '레체 살렌토', '엠폴리 아주로', '베로나 마스티노', '칼리아리 로소블루',
      '파르마 크로치아', '코모 라리아니', '베네치아 아란치오', '몬차 비앙코로소',
    ],
  },
  '코리아 리그': {
    nation: '대한민국',
    clubs: [
      '전북 모터스', '울산 호랑', '포항 스틸맨', '서울 캐피탈', '수원 블루버드',
      '인천 유나이트', '대구 스카이', '광주 라이트', '강원 알파인', '제주 오렌지',
      '김천 상록', '수원FC 나이트', '대전 시티즌', '성남 마그마', '부산 아이콘',
      '경남 드래곤', '충남 아산', '안양 퍼플', '부천 레드', '전남 드래건',
    ],
  },
  '루소 프리메라': {
    nation: '포르투갈',
    clubs: [
      '리스본 아길라', '포르투 드라강', '리스본 레앙', '브라가 게레이루',
      '기마랑 비토리', '보아비 자이브라', '히우아베 베르데', '파렌세 알가르비',
      '아루카 몬타냐', '카사피아 리스보', '모레이렌 코네고', '에스토릴 카나리',
      '파말리캉 파마', '산타클라라 아소르', '지우비센트 갈로', '나시오날 알비',
      '아베스 파즈', '토렌스 발레', '샤베스 플라비엔', '펜아피엘 두로',
    ],
  },
  '트리콜로 리그': {
    nation: '프랑스',
    clubs: [
      '파리 캐피탈', '마르세유 올림피', '리옹 골드', '모나코 루즈', '릴 도그',
      '렌 루즈누아', '니스 애글롱', '랑스 상글리에', '스트라스 알자스', '낭트 카나리',
      '툴루즈 비올레', '몽펠 파이앙스', '브레스트 피라트', '르아브르 시엘', '오세르 부르고',
      '앙제 SCO', '생테티엔 베르', '랭스 샹파뉴', '메스 그르나', '로리앙 메를뤼',
    ],
  },
  '오라녜 에레디': {
    nation: '네덜란드',
    clubs: [
      '암스텔 아약', '에인트 라이트', '로테르 페예', '알크마르 치즈',
      '트벤테 토카', '위트레흐 돔', '헤렌벤 프리즈', '스파르타 로테르',
      '즈볼레 블루', '님메헌 니메', '고어헤드 이글', '엑셀시오 크루',
      '포르투나 시타르', '빌럼 틸뷔르흐', '헤라클 알멜로', '발베이크 RKC',
      '아약스 유스', '흐로닝언 그린', '엠멘 드렌테', '카임브레 블랙',
    ],
  },
}

// A club's squad, one entry per shirt. Every club fields a full-back and a
// winger on each side — the reason this file exists is that the roster had
// almost none, and a 4-3-3 cannot be filled without them.
const SQUAD_SHAPE = [
  'GK', 'GK',
  'LB', 'RB', 'CB', 'CB', 'CB',
  'CDM', 'CM', 'CM', 'CAM', 'LM', 'RM',
  'LW', 'RW', 'ST', 'ST',
]

/** Fictional names, built from pools so the whole league is not one joke. */
const NAMES = {
  잉글랜드: {
    first: ['해리', '잭', '메이슨', '리스', '데클란', '올리', '카일', '조던', '루크', '토비',
            '벤', '코너', '이든', '핀', '조지', '샘', '아치', '레오', '노아', '테오'],
    last: ['워커', '스톤스', '라이스', '벨링', '케인즈', '포든', '사카르', '그릴리', '트리피',
           '헨더', '매과이', '쇼우', '스털링', '토마스', '가나초', '메이누', '와튼', '앤더', '팔머', '고든'],
  },
  스페인: {
    first: ['파블로', '알바로', '세르히', '다니', '이케르', '마르코', '호세', '루카스', '가비',
            '페드로', '니코', '아이토', '유리', '브라힘', '페란', '아벨', '라울', '디에고', '하비', '이반'],
    last: ['모라타스', '카르바할', '로드리고', '가르시', '올모스', '토레스', '나바로', '루이스',
           '산체스', '페르난', '카스트로', '히메네', '바스케', '아세니오', '메리노', '오야르', '수비멘', '알론소', '캄포스', '레길론'],
  },
  독일: {
    first: ['플로리안', '요주아', '레온', '카이', '얀', '토마스', '니클라스', '유수파', '마르코',
            '팀', '루카스', '막스', '다비트', '펠릭스', '요나스', '파스칼', '슈테판', '카림', '엘리아스', '노아'],
    last: ['비르츠', '무시알', '킴미히', '고레츠', '자네르', '하베르', '륄리', '슐로터',
           '노이어스', '뤼디거', '슐츠', '바그너', '베커', '뮐러스', '클로제', '바이글', '푈러', '자비처', '운다프', '슈타흐'],
  },
  이탈리아: {
    first: ['니콜로', '산드로', '조르지', '마테오', '페데리', '알레산', '다비데', '리카르',
            '지안루', '로렌초', '안드레아', '마르코', '시모네', '파비오', '루카', '엔초', '피에트로', '토마소', '마누엘', '스테파노'],
    last: ['바렐라스', '토날리', '키에자', '바스토니', '디마르코', '스칼비니', '라스파도',
           '로카텔', '칼라피오', '프라테시', '자니올로', '베라르디', '피롤라', '가티스', '캄비아소', '오르솔리', '루가니', '만치니', '스피나졸', '콜롬보'],
  },
  대한민국: {
    first: ['민', '준', '현', '재', '성', '태', '동', '우', '진', '호',
            '규', '찬', '석', '범', '수', '건', '영', '기', '경', '훈'],
    last: ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임',
           '한', '오', '서', '신', '권', '황', '안', '송', '홍', '류'],
    korean: true,
  },
  포르투갈: {
    first: ['주앙', '히카르', '브루누', '디오구', '누누', '하파엘', '페드루', '곤살루',
            '티아구', '안드레', '파비우', '비토르', '카를루', '마테우', '레오', '지오구', '후벤', '다니', '베르나', '조타'],
    last: ['실바스', '페레이', '산투스', '코스타', '올리베', '멘데스', '히베이', '카르발',
           '고메스', '마르팅', '피녜이', '알메이', '테이셰', '모라이', '핀투스', '바르보', '누네스', '레이탕', '지에구', '파레데'],
  },
  프랑스: {
    first: ['킬리안', '위스만', '오렐리', '테오', '뤼카', '이브라', '마르퀴', '주앙',
            '랑달', '아드리', '엔조', '브래들', '워런', '마티스', '자멜', '유수프',
            '알렉시', '클레망', '노르디', '레니'],
    last: ['음바페르', '추아메', '코망드', '에르난', '뎀벨레', '뤼카즈', '카마빙', '살리바',
           '콘데스', '방자맹', '지루도', '파비앙', '메뉴에', '자이르', '올리즈르', '바르콜',
           '통갈리', '샤를레', '기랑시', '아카데'],
  },
  네덜란드: {
    first: ['프렌키', '코디', '마테이스', '유리엔', '스벤', '바우트', '티스', '루크',
            '얀', '다니', '요스트', '켄', '브라이', '스테번', '람민', '핀', '미키', '노아', '퀸텐', '요른'],
    last: ['데용흐', '학포', '데리흐', '팀버르', '베르만', '베그호르', '말런', '반다이크',
           '흐라벤', '프림퐁', '베인달', '스텐헤스', '덤프리', '카위퍼', '바우터', '람메르', '판헤케', '보스만', '헤이팅', '스미츠'],
  },
}

/** Deterministic: the same build always makes the same roster. */
function makeRng(seed) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

/**
 * A club's standing decides how good its squad is and how rare its best card
 * is. The first clubs listed in a league are its bigger sides.
 */
function clubTier(index) {
  if (index < 3) return 0
  if (index < 8) return 1
  if (index < 14) return 2
  return 3
}

const TIER_OVR = [
  [72, 88],
  [66, 82],
  [60, 76],
  [55, 70],
]

/** The rarity a card lands in, from its overall. Aces reach the top tiers. */
function rarityFor(ovr) {
  if (ovr >= 86) return 'World'
  if (ovr >= 82) return 'Live'
  if (ovr >= 76) return 'Legend'
  if (ovr >= 68) return 'Rare'
  return 'Normal'
}

const rows = { Normal: [], Rare: [], Legend: [], Live: [], World: [] }
const used = new Set()

let seed = 20260902
for (const [league, { nation, clubs }] of Object.entries(LEAGUES)) {
  clubs.forEach((club, clubIndex) => {
    const tier = clubTier(clubIndex)
    const [low, high] = TIER_OVR[tier]
    const rng = makeRng((seed += 7919) + clubIndex * 131)
    const pool = NAMES[nation]

    // Two shirts in the squad are the club's aces. Which two is drawn, not
    // fixed — pinning it to the first shirts made every ace a goalkeeper, and
    // then no full-back or winger ever reached the top rarities.
    const aces = new Set()
    while (aces.size < 2) aces.add(Math.floor(rng() * SQUAD_SHAPE.length))

    SQUAD_SHAPE.forEach((position, shirt) => {
      const ace = aces.has(shirt)
      const span = high - low
      const ovr = ace
        ? Math.min(99, Math.round(high - rng() * (span * 0.15)))
        : Math.round(low + rng() * span * 0.9)

      let name = ''
      for (let attempt = 0; attempt < 60 && !name; attempt++) {
        const first = pool.first[Math.floor(rng() * pool.first.length)]
        const last = pool.last[Math.floor(rng() * pool.last.length)]
        const candidate = pool.korean ? `${last}${first}${pool.first[Math.floor(rng() * pool.first.length)]}` : `${first} ${last}`
        if (!used.has(candidate) && candidate.length <= 12) name = candidate
      }
      if (!name) return

      used.add(name)
      rows[rarityFor(ovr)].push([name, position, ovr, club, nation])
    })
  })
}

const clubLines = Object.entries(LEAGUES)
  .flatMap(([league, { clubs }]) => clubs.map((club) => `  { name: '${club}', league: '${league}' },`))
  .join('\n')

const rosterLines = Object.entries(rows)
  .map(([rarity, list]) => {
    const body = list
      .map(([n, p, o, c, na]) => `    ['${n}', '${p}', ${o}, '${c}', '${na}'],`)
      .join('\n')
    return `  ${rarity}: [\n${body}\n  ],`
  })
  .join('\n')

const out = `// 자동 생성 파일입니다. 고치지 마세요.
// scripts/build-roster.mjs에서 만들어집니다: npm run build:roster
//
// 이름·클럽·리그는 전부 가상입니다. 어느 실제 팀을 빗댄 것인지 알아볼 수는
// 있게 지었지만, 실제 선수나 구단의 이름은 하나도 쓰지 않습니다.
import type { ClubDef, RosterRow } from './players'
import type { Rarity } from './types'

export const GENERATED_CLUBS: ClubDef[] = [
${clubLines}
]

export const GENERATED_ROSTER: Record<Rarity, RosterRow[]> = {
${rosterLines}
}
`

writeFileSync('lib/rosterData.ts', out)

const total = Object.values(rows).reduce((sum, list) => sum + list.length, 0)
console.log(`클럽 ${Object.values(LEAGUES).reduce((n, l) => n + l.clubs.length, 0)}개 · 선수 ${total}명`)
for (const [rarity, list] of Object.entries(rows)) {
  const byPos = {}
  for (const [, p] of list) byPos[p] = (byPos[p] ?? 0) + 1
  const missing = ['GK','LB','RB','CB','CDM','CM','CAM','LM','RM','LW','RW','ST'].filter((p) => !byPos[p])
  console.log(`  ${rarity.padEnd(7)} ${String(list.length).padStart(4)}명` + (missing.length ? ` · 빠진 포지션: ${missing.join(',')}` : ' · 전 포지션 있음'))
}
