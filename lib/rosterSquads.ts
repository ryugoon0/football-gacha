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
    ['셰이 레이스', 'RW', 66, '맨체스 레즈', '잉글랜드', {"unreleased":true}],
    ['잭 플레쳐', 'CM', 65, '맨체스 레즈', '잉글랜드', {"unreleased":true}],
    ['타일러 플레쳐', 'CM', 63, '맨체스 레즈', '스코틀랜드', {"unreleased":true}],
    ['더못 미이', 'GK', 58, '맨체스 레즈', '북아일랜드', {"unreleased":true}],
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
    ['칼 다를로', 'GK', 72, '맨체스 레즈', '웨일스', {"unreleased":true}],
    ['톰 히튼', 'GK', 68, '맨체스 레즈', '잉글랜드', {"unreleased":true}],
    ['에이든 헤번', 'CB', 72, '맨체스 레즈', '잉글랜드', {"unreleased":true}],
    ['해리 아마즈', 'LB', 68, '맨체스 레즈', '잉글랜드', {"unreleased":true}],
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
    ['세네 라멘츠', 'GK', 79, '맨체스 레즈', '벨기에', {"unreleased":true}],
    ['디오고 달로', 'RB', 80, '맨체스 레즈', '포르투갈', {"unreleased":true}],
    ['누사이르 마즈라우', 'RB', 81, '맨체스 레즈', '모로코', {"unreleased":true}],
    ['해리 맥과이', 'CB', 79, '맨체스 레즈', '잉글랜드', {"unreleased":true}],
    ['메이슨 마운드', 'CM', 79, '맨체스 레즈', '잉글랜드', {"unreleased":true}],
    ['조슈아 지르크', 'ST', 78, '맨체스 레즈', '네덜란드', {"unreleased":true}],
    ['패트릭 도르그', 'LB', 77, '맨체스 레즈', '덴마크', {"unreleased":true}],
    ['레니 요루', 'CB', 80, '맨체스 레즈', '프랑스', {"unreleased":true}],
    ['안드레이 산토', 'CM', 78, '맨체스 레즈', '브라질', {"unreleased":true}],
    ['유리 틸레망', 'CM', 81, '맨체스 레즈', '벨기에', {"unreleased":true}],
    ['카를로스 발레브', 'CDM', 80, '맨체스 레즈', '카메룬', {"unreleased":true}],
    ['루크 쇼어', 'LB', 79, '맨체스 레즈', '잉글랜드', {"unreleased":true}],
    ['마누엘 우가르타', 'CDM', 79, '맨체스 레즈', '우루과이', {"unreleased":true}],
    ['코비 마이노', 'CM', 79, '맨체스 레즈', '잉글랜드', {"unreleased":true}],
  ],
  Live: [
    ['조현운', 'GK', 84, '울산 호랑', '대한민국', {"unreleased":true}],
    ['마테이스 데 리트', 'CB', 83, '맨체스 레즈', '네덜란드', {"unreleased":true}],
    ['리산드로 마르티노', 'CB', 84, '맨체스 레즈', '아르헨티나', {"unreleased":true}],
    ['마커스 래시포', 'LW', 82, '맨체스 레즈', '잉글랜드', {"unreleased":true}],
    ['마테우스 쿠뉴', 'CAM', 84, '맨체스 레즈', '브라질', {"unreleased":true}],
    ['아마드 디알', 'RW', 82, '맨체스 레즈', '코트디부아르', {"unreleased":true}],
    ['브라이언 음보모', 'RW', 84, '맨체스 레즈', '카메룬', {"unreleased":true}],
    ['벤야민 셰스코', 'ST', 82, '맨체스 레즈', '슬로베니아', {"unreleased":true}],
  ],
  World: [
    ['브루노 페르난도', 'CAM', 88, '맨체스 레즈', '포르투갈', {"unreleased":true}],
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
  "야고 카리엘": "야고 카리엘로 (울산 HD FC #99)",
  "세네 라멘츠": "세너 라멘스 (맨체스터 유나이티드 #1)",
  "디오고 달로": "디오구 달롯 (맨체스터 유나이티드 #2)",
  "누사이르 마즈라우": "누사이르 마즈라위 (맨체스터 유나이티드 #3)",
  "마테이스 데 리트": "마테이스 더 리흐트 (맨체스터 유나이티드 #4)",
  "해리 맥과이": "해리 매과이어 (맨체스터 유나이티드 #5)",
  "리산드로 마르티노": "리산드로 마르티네스 (맨체스터 유나이티드 #6)",
  "메이슨 마운드": "메이슨 마운트 (맨체스터 유나이티드 #7)",
  "브루노 페르난도": "브루노 페르난데스 (맨체스터 유나이티드 #8)",
  "마커스 래시포": "마커스 래시퍼드 (맨체스터 유나이티드 #9)",
  "마테우스 쿠뉴": "마테우스 쿠냐 (맨체스터 유나이티드 #10)",
  "조슈아 지르크": "조슈아 지르크지 (맨체스터 유나이티드 #11)",
  "칼 다를로": "칼 달로 (맨체스터 유나이티드 #12)",
  "패트릭 도르그": "패트릭 도르구 (맨체스터 유나이티드 #13)",
  "레니 요루": "레니 요로 (맨체스터 유나이티드 #15)",
  "아마드 디알": "아마드 디알로 (맨체스터 유나이티드 #16)",
  "안드레이 산토": "안드레이 산투스 (맨체스터 유나이티드 #17)",
  "유리 틸레망": "유리 틸레만스 (맨체스터 유나이티드 #18)",
  "브라이언 음보모": "브라이언 음뵈모 (맨체스터 유나이티드 #19)",
  "카를로스 발레브": "카를로스 발레바 (맨체스터 유나이티드 #20)",
  "톰 히튼": "톰 히턴 (맨체스터 유나이티드 #22)",
  "루크 쇼어": "루크 쇼 (맨체스터 유나이티드 #23)",
  "마누엘 우가르타": "마누엘 우가르테 (맨체스터 유나이티드 #25)",
  "에이든 헤번": "에이든 헤븐 (맨체스터 유나이티드 #26)",
  "벤야민 셰스코": "벤야민 셰슈코 (맨체스터 유나이티드 #30)",
  "셰이 레이스": "셰이 레이시 (맨체스터 유나이티드 #31)",
  "코비 마이노": "코비 마이누 (맨체스터 유나이티드 #37)",
  "잭 플레쳐": "잭 플레처 (맨체스터 유나이티드 #38)",
  "타일러 플레쳐": "타일러 플레처 (맨체스터 유나이티드 #39)",
  "해리 아마즈": "해리 아마스 (맨체스터 유나이티드 #41)",
  "더못 미이": "더못 미 (맨체스터 유나이티드 #45)"
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
  "야고 카리엘": "ulsan-99",
  "세네 라멘츠": "manred-01",
  "디오고 달로": "manred-02",
  "누사이르 마즈라우": "manred-03",
  "마테이스 데 리트": "manred-04",
  "해리 맥과이": "manred-05",
  "리산드로 마르티노": "manred-06",
  "메이슨 마운드": "manred-07",
  "브루노 페르난도": "manred-08",
  "마커스 래시포": "manred-09",
  "마테우스 쿠뉴": "manred-10",
  "조슈아 지르크": "manred-11",
  "칼 다를로": "manred-12",
  "패트릭 도르그": "manred-13",
  "레니 요루": "manred-15",
  "아마드 디알": "manred-16",
  "안드레이 산토": "manred-17",
  "유리 틸레망": "manred-18",
  "브라이언 음보모": "manred-19",
  "카를로스 발레브": "manred-20",
  "톰 히튼": "manred-22",
  "루크 쇼어": "manred-23",
  "마누엘 우가르타": "manred-25",
  "에이든 헤번": "manred-26",
  "벤야민 셰스코": "manred-30",
  "셰이 레이스": "manred-31",
  "코비 마이노": "manred-37",
  "잭 플레쳐": "manred-38",
  "타일러 플레쳐": "manred-39",
  "해리 아마즈": "manred-41",
  "더못 미이": "manred-45"
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
  },
  "manred-01": {
    "name": "세네 라멘츠",
    "nation": "벨기에",
    "birthYear": 2002,
    "pos": "GK",
    "club": "맨체스 레즈"
  },
  "manred-02": {
    "name": "디오고 달로",
    "nation": "포르투갈",
    "birthYear": 1999,
    "pos": "RB",
    "club": "맨체스 레즈"
  },
  "manred-03": {
    "name": "누사이르 마즈라우",
    "nation": "모로코",
    "birthYear": 1997,
    "pos": "RB",
    "club": "맨체스 레즈"
  },
  "manred-04": {
    "name": "마테이스 데 리트",
    "nation": "네덜란드",
    "birthYear": 1999,
    "pos": "CB",
    "club": "맨체스 레즈"
  },
  "manred-05": {
    "name": "해리 맥과이",
    "nation": "잉글랜드",
    "birthYear": 1993,
    "pos": "CB",
    "club": "맨체스 레즈"
  },
  "manred-06": {
    "name": "리산드로 마르티노",
    "nation": "아르헨티나",
    "birthYear": 1998,
    "pos": "CB",
    "club": "맨체스 레즈"
  },
  "manred-07": {
    "name": "메이슨 마운드",
    "nation": "잉글랜드",
    "birthYear": 1999,
    "pos": "CM",
    "club": "맨체스 레즈"
  },
  "manred-08": {
    "name": "브루노 페르난도",
    "nation": "포르투갈",
    "birthYear": 1994,
    "pos": "CAM",
    "club": "맨체스 레즈"
  },
  "manred-09": {
    "name": "마커스 래시포",
    "nation": "잉글랜드",
    "birthYear": 1997,
    "pos": "LW",
    "club": "맨체스 레즈"
  },
  "manred-10": {
    "name": "마테우스 쿠뉴",
    "nation": "브라질",
    "birthYear": 1999,
    "pos": "CAM",
    "club": "맨체스 레즈"
  },
  "manred-11": {
    "name": "조슈아 지르크",
    "nation": "네덜란드",
    "birthYear": 2001,
    "pos": "ST",
    "club": "맨체스 레즈"
  },
  "manred-12": {
    "name": "칼 다를로",
    "nation": "웨일스",
    "birthYear": 1990,
    "pos": "GK",
    "club": "맨체스 레즈"
  },
  "manred-13": {
    "name": "패트릭 도르그",
    "nation": "덴마크",
    "birthYear": 2004,
    "pos": "LB",
    "club": "맨체스 레즈"
  },
  "manred-15": {
    "name": "레니 요루",
    "nation": "프랑스",
    "birthYear": 2005,
    "pos": "CB",
    "club": "맨체스 레즈"
  },
  "manred-16": {
    "name": "아마드 디알",
    "nation": "코트디부아르",
    "birthYear": 2002,
    "pos": "RW",
    "club": "맨체스 레즈"
  },
  "manred-17": {
    "name": "안드레이 산토",
    "nation": "브라질",
    "birthYear": 2004,
    "pos": "CM",
    "club": "맨체스 레즈"
  },
  "manred-18": {
    "name": "유리 틸레망",
    "nation": "벨기에",
    "birthYear": 1997,
    "pos": "CM",
    "club": "맨체스 레즈"
  },
  "manred-19": {
    "name": "브라이언 음보모",
    "nation": "카메룬",
    "birthYear": 1999,
    "pos": "RW",
    "club": "맨체스 레즈"
  },
  "manred-20": {
    "name": "카를로스 발레브",
    "nation": "카메룬",
    "birthYear": 2004,
    "pos": "CDM",
    "club": "맨체스 레즈"
  },
  "manred-22": {
    "name": "톰 히튼",
    "nation": "잉글랜드",
    "birthYear": 1986,
    "pos": "GK",
    "club": "맨체스 레즈"
  },
  "manred-23": {
    "name": "루크 쇼어",
    "nation": "잉글랜드",
    "birthYear": 1995,
    "pos": "LB",
    "club": "맨체스 레즈"
  },
  "manred-25": {
    "name": "마누엘 우가르타",
    "nation": "우루과이",
    "birthYear": 2001,
    "pos": "CDM",
    "club": "맨체스 레즈"
  },
  "manred-26": {
    "name": "에이든 헤번",
    "nation": "잉글랜드",
    "birthYear": 2006,
    "pos": "CB",
    "club": "맨체스 레즈"
  },
  "manred-30": {
    "name": "벤야민 셰스코",
    "nation": "슬로베니아",
    "birthYear": 2003,
    "pos": "ST",
    "club": "맨체스 레즈"
  },
  "manred-31": {
    "name": "셰이 레이스",
    "nation": "잉글랜드",
    "birthYear": 2007,
    "pos": "RW",
    "club": "맨체스 레즈"
  },
  "manred-37": {
    "name": "코비 마이노",
    "nation": "잉글랜드",
    "birthYear": 2005,
    "pos": "CM",
    "club": "맨체스 레즈"
  },
  "manred-38": {
    "name": "잭 플레쳐",
    "nation": "잉글랜드",
    "birthYear": 2007,
    "pos": "CM",
    "club": "맨체스 레즈"
  },
  "manred-39": {
    "name": "타일러 플레쳐",
    "nation": "스코틀랜드",
    "birthYear": 2007,
    "pos": "CM",
    "club": "맨체스 레즈"
  },
  "manred-41": {
    "name": "해리 아마즈",
    "nation": "잉글랜드",
    "birthYear": 2007,
    "pos": "LB",
    "club": "맨체스 레즈"
  },
  "manred-45": {
    "name": "더못 미이",
    "nation": "북아일랜드",
    "birthYear": 2005,
    "pos": "GK",
    "club": "맨체스 레즈"
  }
}
