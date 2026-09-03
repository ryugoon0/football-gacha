/**
 * 개막 배치 리그 — 정규 주간 시스템이 월요일부터 시작하는데 지금은 그렇지
 * 않아서, 금·토·일 사흘만 한 번 도는 다리 역할의 리그. 순수 함수만 있다.
 *
 * 정규 시즌(schedule.ts)의 더블 라운드로빈은 "사이클 A + 반전 사이클 B"를
 * 정확히 짝지어 쓰는 덕에 singleRoundRobin의 고정 기준점 편향(첫 팀이 항상
 * 홈)이 저절로 상쇄된다. 배치 리그는 3번째 사이클이 반전이 아니라 "8팀은
 * 23홈, 8팀은 22홈"이 되는 독립 배정이라 그 편향이 그대로 드러나므로,
 * 3번째 사이클 전용 밸런서(balanceThirdCycle)를 따로 둔다.
 */
import {
  DAYS_OF_WEEK,
  PLACEMENT_CYCLES,
  PLACEMENT_DAYS,
  PLACEMENT_REWARD_MULTIPLIER,
  PLACEMENT_ROUNDS,
  ROUNDS_PER_SINGLE_CYCLE,
  type CompetitionType,
} from './config'
import { singleRoundRobin, type RawFixture } from './schedule'
import type { GlobalSlot } from './schedule'

const HOURS_09_23 = Array.from({ length: 15 }, (_, i) => i + 9)

/** 45개 슬롯 — 금·토·일, 09~23시 1시간 간격. 정규 주간 슬롯(schedule.ts)과는 별개. */
export function buildPlacementSlots(): GlobalSlot[] {
  const slots: GlobalSlot[] = []
  for (const day of PLACEMENT_DAYS) {
    for (const hour of HOURS_09_23) {
      slots.push({ index: slots.length, day, hour, type: 'OPENING_PLACEMENT' as CompetitionType })
    }
  }
  return slots
}

/**
 * 이미 두 팀이 나온 순서(cycle1의 원본 대진)를 그대로 재사용해 3번째로
 * 다시 맞붙이되, 홈/원정만 새로 정한다.
 *
 * 1차로 누적 홈 횟수가 더 적은 쪽에 홈을 주는 그리디를 돌린 뒤(동률이면
 * 원래 홈 유지), 그것만으로는 편차가 1을 넘는 경우가 실제로 생긴다 —
 * cycle1의 원의 방법(circle method)이 첫 팀을 매 라운드 고정 홈으로 두는
 * 편향을 그대로 물려받기 때문이다(schedule.ts의 singleRoundRobin 주석
 * 참고). 그래서 2차로 "홈 쪽이 원정 쪽보다 2 이상 많은" 경기를 더는 없을
 * 때까지 뒤집는다 — 이 교정이 끝나면 모든 팀의 홈 횟수 차이가 1 이내로
 * 좁혀지고, 총 120자리를 16팀에 나누면 그 상태는 반드시 8팀 8회·8팀
 * 7회가 된다(모두 7~8 사이인 정수 16개의 합이 120이 되는 유일한 모양).
 * tests/weeklyLeaguePlacement.test.ts가 이 결과를 직접 확인한다.
 */
function balanceThirdCycle(pairing: RawFixture[], clubIds: string[]): RawFixture[] {
  const homeCount = new Map(clubIds.map((id) => [id, 0]))
  const fixtures: RawFixture[] = pairing.map((f) => {
    const countHome = homeCount.get(f.home)!
    const countAway = homeCount.get(f.away)!
    const [home, away] = countAway < countHome ? [f.away, f.home] : [f.home, f.away]
    homeCount.set(home, homeCount.get(home)! + 1)
    return { round: f.round, home, away }
  })

  let changed = true
  while (changed) {
    changed = false
    for (let i = 0; i < fixtures.length; i++) {
      const f = fixtures[i]
      const homeCnt = homeCount.get(f.home)!
      const awayCnt = homeCount.get(f.away)!
      if (homeCnt > awayCnt + 1) {
        homeCount.set(f.home, homeCnt - 1)
        homeCount.set(f.away, awayCnt + 1)
        fixtures[i] = { round: f.round, home: f.away, away: f.home }
        changed = true
      }
    }
  }
  return fixtures
}

export interface PlacementFixtureDef {
  /** 0~44, 배치 리그 전체에서 이 경기가 속한 라운드. */
  round: number
  slot: GlobalSlot
  home: string
  away: string
}

/**
 * 16개 구단으로 360경기(상대별 3경기)를 만들어 45개 배치 슬롯에 순서대로
 * 배정한다. 1번째 사이클은 그대로, 2번째는 완전 반전(상대당 1홈·1원정
 * 확정), 3번째는 balanceThirdCycle로 8팀 23홈·8팀 22홈을 만든다.
 */
export function generatePlacementFixtures(
  clubIds: string[],
  slots: GlobalSlot[] = buildPlacementSlots(),
): PlacementFixtureDef[] {
  if (clubIds.length !== 16) {
    throw new Error(`generatePlacementFixtures: expected 16 club ids, got ${clubIds.length}`)
  }
  if (new Set(clubIds).size !== clubIds.length) {
    throw new Error('generatePlacementFixtures: club ids must be unique')
  }
  const cycle1 = singleRoundRobin(clubIds)
  const cycle2 = cycle1.map((f) => ({ round: f.round, home: f.away, away: f.home }))
  const cycle3 = balanceThirdCycle(cycle1, clubIds)

  const rounds: RawFixture[][] = []
  for (const cycle of [cycle1, cycle2, cycle3]) {
    for (let round = 0; round < ROUNDS_PER_SINGLE_CYCLE; round++) {
      rounds.push(cycle.filter((f) => f.round === round))
    }
  }
  if (rounds.length !== PLACEMENT_ROUNDS) {
    throw new Error(`generatePlacementFixtures: expected ${PLACEMENT_ROUNDS} rounds, built ${rounds.length}`)
  }
  if (slots.length !== PLACEMENT_ROUNDS) {
    throw new Error(`generatePlacementFixtures: expected ${PLACEMENT_ROUNDS} placement slots, found ${slots.length}`)
  }

  const fixtures: PlacementFixtureDef[] = []
  rounds.forEach((roundFixtures, round) => {
    const slot = slots[round]
    for (const f of roundFixtures) fixtures.push({ round, slot, home: f.home, away: f.away })
  })
  return fixtures
}

/** 배치 리그 보상에는 정규 리그 보상의 절반이 적용된다. */
export function placementReward(regularReward: number): number {
  return Math.round(regularReward * PLACEMENT_REWARD_MULTIPLIER)
}

/**
 * 배치 리그 최종 순위(standings.ts의 결과, 1위부터)를 그대로 Cup A 시드
 * 순서로 쓴다 — 리그 순위 기반 시딩(config.ts의 CUP_SEEDING.CUP_A)이라는
 * 원칙은 그대로고, 이번 딱 한 번은 그 "리그 순위"가 배치 리그 결과다.
 */
export function cupASeedFromPlacementStandings(rankedClubIds: string[]): string[] {
  if (rankedClubIds.length !== 16) {
    throw new Error(`cupASeedFromPlacementStandings: expected 16 clubs, got ${rankedClubIds.length}`)
  }
  return [...rankedClubIds]
}

export { PLACEMENT_CYCLES, DAYS_OF_WEEK }
