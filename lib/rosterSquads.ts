// scripts/build-squad-cards.mjs가 data/squads/*.json에서 만든다. 손으로 고치지 않는다.
import type { Rarity } from './types'
import type { RosterRow } from './players'

/** 실제 스쿼드 기반 카드 — ROSTER에서 LATE_ADDITIONS 뒤에 붙는다. */
export const SQUAD_ROSTER: Record<Rarity, RosterRow[]> = {
  Normal: [
    ['최주헌', 'GK', 60, '울산 호랑', '대한민국', {"unreleased":true}],
    ['류승민', 'GK', 64, '울산 호랑', '대한민국', {"unreleased":true}],
    ['황병건', 'GK', 67, '울산 호랑', '대한민국', {"unreleased":true}],
    ['조민석', 'CM', 65, '울산 호랑', '대한민국', {"unreleased":true}],
    ['백인유', 'CM', 66, '울산 호랑', '대한민국', {"unreleased":true}],
    ['최석헌', 'CB', 66, '울산 호랑', '대한민국', {"unreleased":true}],
  ],
  Rare: [
    ['윤중규', 'RB', 71, '울산 호랑', '대한민국', {"unreleased":true}],
    ['정선빈', 'CB', 68, '울산 호랑', '대한민국', {"unreleased":true}],
    ['서명권', 'CB', 72, '울산 호랑', '대한민국', {"unreleased":true}],
    ['이희근', 'RW', 74, '울산 호랑', '대한민국', {"unreleased":true}],
    ['이진헌', 'CM', 74, '울산 호랑', '대한민국', {"unreleased":true}],
    ['박우재', 'CM', 69, '울산 호랑', '대한민국', {"unreleased":true}],
    ['강상유', 'LB', 74, '울산 호랑', '대한민국', {"unreleased":true}],
    ['정재삼', 'ST', 71, '울산 호랑', '대한민국', {"unreleased":true}],
    ['문정일', 'GK', 68, '울산 호랑', '대한민국', {"unreleased":true}],
    ['이규선', 'CDM', 75, '울산 호랑', '대한민국', {"unreleased":true}],
    ['조현탁', 'LB', 73, '울산 호랑', '대한민국', {"unreleased":true}],
    ['페드리노', 'RW', 75, '울산 호랑', '브라질', {"unreleased":true}],
    ['이재억', 'CB', 71, '울산 호랑', '대한민국', {"unreleased":true}],
    ['장시연', 'RM', 70, '울산 호랑', '대한민국', {"unreleased":true}],
    ['토마스 오데코트', 'CB', 72, '울산 호랑', '네덜란드', {"unreleased":true}],
    ['밀로시 트로약', 'CB', 73, '울산 호랑', '폴란드', {"unreleased":true}],
    ['심상만', 'LB', 70, '울산 호랑', '대한민국', {"unreleased":true}],
    ['벤지 미셀', 'LM', 72, '울산 호랑', '미국', {"unreleased":true}],
  ],
  Legend: [
    ['다리안 보야닉', 'CM', 78, '울산 호랑', '스웨덴', {"unreleased":true}],
    ['마르카노', 'ST', 78, '울산 호랑', '브라질', {"unreleased":true}],
    ['이동겸', 'CAM', 79, '울산 호랑', '대한민국', {"unreleased":true}],
    ['에릭 파리스', 'LW', 77, '울산 호랑', '브라질', {"unreleased":true}],
    ['정승헌', 'CB', 77, '울산 호랑', '대한민국', {"unreleased":true}],
    ['김영궁', 'CB', 80, '울산 호랑', '대한민국', {"unreleased":true}],
    ['박용유', 'CDM', 76, '울산 호랑', '대한민국', {"unreleased":true}],
    ['야고 카리엘', 'ST', 76, '울산 호랑', '브라질', {"unreleased":true}],
  ],
  Live: [
    ['조현운', 'GK', 84, '울산 호랑', '대한민국', {"unreleased":true}],
  ],
  World: [

  ],
}

/** 운영자 전용 — 가명 → 실명 (실제 클럽 #등번호). 정확한 1:1 매핑. */
export const SQUAD_REAL_HINTS: Record<string, string> = {
  "최주헌": "최주호 (울산 HD FC #1)",
  "윤중규": "윤종규 (울산 HD FC #2)",
  "정선빈": "정성빈 (울산 HD FC #3)",
  "서명권": "서명관 (울산 HD FC #4)",
  "다리안 보야닉": "다리얀 보야니치 (울산 HD FC #6)",
  "이희근": "이희균 (울산 HD FC #8)",
  "마르카노": "마르캉 (울산 HD FC #9)",
  "이동겸": "이동경 (울산 HD FC #10)",
  "에릭 파리스": "에릭 파리아스 (울산 HD FC #11)",
  "류승민": "류성민 (울산 HD FC #13)",
  "이진헌": "이진현 (울산 HD FC #14)",
  "정승헌": "정승현 (울산 HD FC #15)",
  "박우재": "박우진 (울산 HD FC #16)",
  "강상유": "강상우 (울산 HD FC #17)",
  "김영궁": "김영권 (울산 HD FC #19)",
  "정재삼": "정재상 (울산 HD FC #20)",
  "조현운": "조현우 (울산 HD FC #21)",
  "문정일": "문정인 (울산 HD FC #23)",
  "이규선": "이규성 (울산 HD FC #24)",
  "조현탁": "조현택 (울산 HD FC #26)",
  "페드리노": "페드리뉴 (울산 HD FC #27)",
  "이재억": "이재익 (울산 HD FC #28)",
  "황병건": "황병근 (울산 HD FC #31)",
  "장시연": "장시영 (울산 HD FC #33)",
  "박용유": "박용우 (울산 HD FC #38)",
  "조민석": "조민서 (울산 HD FC #43)",
  "토마스 오데코트": "토마스 아우더 코터 (울산 HD FC #55)",
  "밀로시 트로약": "미워시 트로야크 (울산 HD FC #66)",
  "백인유": "백인우 (울산 HD FC #72)",
  "심상만": "심상민 (울산 HD FC #77)",
  "벤지 미셀": "벤지 미셸 (울산 HD FC #91)",
  "최석헌": "최석현 (울산 HD FC #96)",
  "야고 카리엘": "야고 카리엘로 (울산 HD FC #99)"
}

/** 가명 → 초상 파일 키 (public/players/<key>.webp). */
export const SQUAD_PORTRAITS: Record<string, string> = {
  "최주헌": "ulsan-01",
  "윤중규": "ulsan-02",
  "정선빈": "ulsan-03",
  "서명권": "ulsan-04",
  "다리안 보야닉": "ulsan-06",
  "이희근": "ulsan-08",
  "마르카노": "ulsan-09",
  "이동겸": "ulsan-10",
  "에릭 파리스": "ulsan-11",
  "류승민": "ulsan-13",
  "이진헌": "ulsan-14",
  "정승헌": "ulsan-15",
  "박우재": "ulsan-16",
  "강상유": "ulsan-17",
  "김영궁": "ulsan-19",
  "정재삼": "ulsan-20",
  "조현운": "ulsan-21",
  "문정일": "ulsan-23",
  "이규선": "ulsan-24",
  "조현탁": "ulsan-26",
  "페드리노": "ulsan-27",
  "이재억": "ulsan-28",
  "황병건": "ulsan-31",
  "장시연": "ulsan-33",
  "박용유": "ulsan-38",
  "조민석": "ulsan-43",
  "토마스 오데코트": "ulsan-55",
  "밀로시 트로약": "ulsan-66",
  "백인유": "ulsan-72",
  "심상만": "ulsan-77",
  "벤지 미셀": "ulsan-91",
  "최석헌": "ulsan-96",
  "야고 카리엘": "ulsan-99"
}

/** 초상 생성 프롬프트용 속성. */
export const SQUAD_PORTRAIT_META: Record<string, { name: string; nation: string; birthYear: number; pos: string; club: string }> = {
  "ulsan-01": {
    "name": "최주헌",
    "nation": "대한민국",
    "birthYear": 2002,
    "pos": "GK",
    "club": "울산 호랑"
  },
  "ulsan-02": {
    "name": "윤중규",
    "nation": "대한민국",
    "birthYear": 1998,
    "pos": "RB",
    "club": "울산 호랑"
  },
  "ulsan-03": {
    "name": "정선빈",
    "nation": "대한민국",
    "birthYear": 2000,
    "pos": "CB",
    "club": "울산 호랑"
  },
  "ulsan-04": {
    "name": "서명권",
    "nation": "대한민국",
    "birthYear": 2002,
    "pos": "CB",
    "club": "울산 호랑"
  },
  "ulsan-06": {
    "name": "다리안 보야닉",
    "nation": "스웨덴",
    "birthYear": 1994,
    "pos": "CM",
    "club": "울산 호랑"
  },
  "ulsan-08": {
    "name": "이희근",
    "nation": "대한민국",
    "birthYear": 1998,
    "pos": "RW",
    "club": "울산 호랑"
  },
  "ulsan-09": {
    "name": "마르카노",
    "nation": "브라질",
    "birthYear": 1996,
    "pos": "ST",
    "club": "울산 호랑"
  },
  "ulsan-10": {
    "name": "이동겸",
    "nation": "대한민국",
    "birthYear": 1997,
    "pos": "CAM",
    "club": "울산 호랑"
  },
  "ulsan-11": {
    "name": "에릭 파리스",
    "nation": "브라질",
    "birthYear": 1999,
    "pos": "LW",
    "club": "울산 호랑"
  },
  "ulsan-13": {
    "name": "류승민",
    "nation": "대한민국",
    "birthYear": 2003,
    "pos": "GK",
    "club": "울산 호랑"
  },
  "ulsan-14": {
    "name": "이진헌",
    "nation": "대한민국",
    "birthYear": 1997,
    "pos": "CM",
    "club": "울산 호랑"
  },
  "ulsan-15": {
    "name": "정승헌",
    "nation": "대한민국",
    "birthYear": 1994,
    "pos": "CB",
    "club": "울산 호랑"
  },
  "ulsan-16": {
    "name": "박우재",
    "nation": "대한민국",
    "birthYear": 1999,
    "pos": "CM",
    "club": "울산 호랑"
  },
  "ulsan-17": {
    "name": "강상유",
    "nation": "대한민국",
    "birthYear": 1993,
    "pos": "LB",
    "club": "울산 호랑"
  },
  "ulsan-19": {
    "name": "김영궁",
    "nation": "대한민국",
    "birthYear": 1990,
    "pos": "CB",
    "club": "울산 호랑"
  },
  "ulsan-20": {
    "name": "정재삼",
    "nation": "대한민국",
    "birthYear": 2004,
    "pos": "ST",
    "club": "울산 호랑"
  },
  "ulsan-21": {
    "name": "조현운",
    "nation": "대한민국",
    "birthYear": 1991,
    "pos": "GK",
    "club": "울산 호랑"
  },
  "ulsan-23": {
    "name": "문정일",
    "nation": "대한민국",
    "birthYear": 1998,
    "pos": "GK",
    "club": "울산 호랑"
  },
  "ulsan-24": {
    "name": "이규선",
    "nation": "대한민국",
    "birthYear": 1994,
    "pos": "CDM",
    "club": "울산 호랑"
  },
  "ulsan-26": {
    "name": "조현탁",
    "nation": "대한민국",
    "birthYear": 2001,
    "pos": "LB",
    "club": "울산 호랑"
  },
  "ulsan-27": {
    "name": "페드리노",
    "nation": "브라질",
    "birthYear": 1996,
    "pos": "RW",
    "club": "울산 호랑"
  },
  "ulsan-28": {
    "name": "이재억",
    "nation": "대한민국",
    "birthYear": 1999,
    "pos": "CB",
    "club": "울산 호랑"
  },
  "ulsan-31": {
    "name": "황병건",
    "nation": "대한민국",
    "birthYear": 1994,
    "pos": "GK",
    "club": "울산 호랑"
  },
  "ulsan-33": {
    "name": "장시연",
    "nation": "대한민국",
    "birthYear": 2002,
    "pos": "RM",
    "club": "울산 호랑"
  },
  "ulsan-38": {
    "name": "박용유",
    "nation": "대한민국",
    "birthYear": 1993,
    "pos": "CDM",
    "club": "울산 호랑"
  },
  "ulsan-43": {
    "name": "조민석",
    "nation": "대한민국",
    "birthYear": 2005,
    "pos": "CM",
    "club": "울산 호랑"
  },
  "ulsan-55": {
    "name": "토마스 오데코트",
    "nation": "네덜란드",
    "birthYear": 1997,
    "pos": "CB",
    "club": "울산 호랑"
  },
  "ulsan-66": {
    "name": "밀로시 트로약",
    "nation": "폴란드",
    "birthYear": 1997,
    "pos": "CB",
    "club": "울산 호랑"
  },
  "ulsan-72": {
    "name": "백인유",
    "nation": "대한민국",
    "birthYear": 2004,
    "pos": "CM",
    "club": "울산 호랑"
  },
  "ulsan-77": {
    "name": "심상만",
    "nation": "대한민국",
    "birthYear": 1993,
    "pos": "LB",
    "club": "울산 호랑"
  },
  "ulsan-91": {
    "name": "벤지 미셀",
    "nation": "미국",
    "birthYear": 1997,
    "pos": "LM",
    "club": "울산 호랑"
  },
  "ulsan-96": {
    "name": "최석헌",
    "nation": "대한민국",
    "birthYear": 2004,
    "pos": "CB",
    "club": "울산 호랑"
  },
  "ulsan-99": {
    "name": "야고 카리엘",
    "nation": "브라질",
    "birthYear": 1999,
    "pos": "ST",
    "club": "울산 호랑"
  }
}
