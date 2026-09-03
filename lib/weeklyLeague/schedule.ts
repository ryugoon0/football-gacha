/**
 * 전역 시간 슬롯 조립과 리그 라운드로빈 대진 생성.
 *
 * 순수 함수만 있다 — DB도, 난수도 없다. 같은 clubIds를 넣으면 항상 같은
 * 대진이 나온다(요구사항 20의 멱등성은 여기서는 "같은 입력 → 같은 출력"으로
 * 만족되고, DB에 실제로 중복 insert를 막는 건 다음 단계의 몫이다).
 */
import { CLUB_COUNT, DAYS_OF_WEEK, DOUBLE_ROUND_ROBIN_REPEATS, LEAGUE_ROUNDS, ROUNDS_PER_SINGLE_CYCLE, WEEKLY_SLOTS, type ScheduleSlotDef } from './config'

export interface GlobalSlot extends ScheduleSlotDef {
  /** 0~104, 월요일 09시부터 일요일 23시까지 시간 순서. */
  index: number
}

/** 105개 전역 슬롯. WEEKLY_SLOTS는 이미 요일·시각 순으로 적혀 있어 재정렬하지 않는다. */
export function buildWeeklySlots(): GlobalSlot[] {
  return WEEKLY_SLOTS.map((def, index) => ({ ...def, index }))
}

export function leagueSlots(slots: GlobalSlot[] = buildWeeklySlots()): GlobalSlot[] {
  return slots.filter((slot) => slot.type === 'LEAGUE')
}

export function cupSlots(slots: GlobalSlot[] = buildWeeklySlots()): GlobalSlot[] {
  return slots.filter((slot) => slot.type === 'CUP_A' || slot.type === 'CUP_B')
}

export interface RawFixture {
  round: number
  home: string
  away: string
}

/**
 * 원의 방법(circle method): 한 팀을 고정하고 나머지를 매 라운드 한 칸씩
 * 돌린다. n-1라운드에서 모든 팀이 서로 정확히 한 번씩 만난다. 홈/원정은
 * 위치로 정해지고 입력이 같으면 항상 같은 결과가 나온다(난수 없음).
 *
 * 주의: 입력 배열의 첫 번째 팀(rotation[0])은 절대 자리를 옮기지 않아서
 * 모든 라운드에서 항상 "홈" 자리(i=0)를 차지한다 — 이 함수 하나만 쓰면
 * 그 팀만 매번 홈이라는 뜻. 더블 라운드로빈(A+반전 B)처럼 정확히 짝을
 * 지어 쓰면 상쇄되어 문제가 없고, generateLeagueFixtures가 그렇게 쓴다.
 * 짝짓지 않고 이 함수 하나만 다시 쓰면(placement.ts의 3번째 사이클처럼)
 * 이 편향이 그대로 드러나므로, 그런 경우는 별도 밸런서가 필요하다.
 */
export function singleRoundRobin(ids: string[]): RawFixture[] {
  const n = ids.length
  const half = n / 2
  const rotation = [...ids]
  const fixtures: RawFixture[] = []

  for (let round = 0; round < n - 1; round++) {
    for (let i = 0; i < half; i++) {
      fixtures.push({ round, home: rotation[i], away: rotation[n - 1 - i] })
    }
    const [fixed, ...rest] = rotation
    rest.unshift(rest.pop()!)
    rotation.splice(0, rotation.length, fixed, ...rest)
  }
  return fixtures
}

export interface LeagueFixtureDef {
  /** 0~89, 시즌(=한 주) 전체에서 이 경기가 속한 라운드. */
  round: number
  slot: GlobalSlot
  home: string
  away: string
}

/**
 * 16개 구단 id로 90경기(상대별 6경기, 3홈·3원정)를 만들어 90개 리그
 * 슬롯에 순서대로 배정한다. clubIds의 순서 자체가 대진에 영향을 주므로,
 * 시즌마다 다른 대진을 원하면 호출하는 쪽에서 순서를 섞어 넘기면 된다.
 */
export function generateLeagueFixtures(clubIds: string[], slots: GlobalSlot[] = buildWeeklySlots()): LeagueFixtureDef[] {
  if (clubIds.length !== CLUB_COUNT) {
    throw new Error(`generateLeagueFixtures: expected ${CLUB_COUNT} club ids, got ${clubIds.length}`)
  }
  if (new Set(clubIds).size !== clubIds.length) {
    throw new Error('generateLeagueFixtures: club ids must be unique')
  }

  const cycleA = singleRoundRobin(clubIds)
  const cycleB = cycleA.map((f) => ({ round: f.round, home: f.away, away: f.home }))
  const cycles = Array.from({ length: DOUBLE_ROUND_ROBIN_REPEATS }, () => [cycleA, cycleB]).flat()

  const rounds: RawFixture[][] = []
  for (const cycle of cycles) {
    for (let round = 0; round < ROUNDS_PER_SINGLE_CYCLE; round++) {
      rounds.push(cycle.filter((f) => f.round === round))
    }
  }
  if (rounds.length !== LEAGUE_ROUNDS) {
    throw new Error(`generateLeagueFixtures: expected ${LEAGUE_ROUNDS} rounds, built ${rounds.length}`)
  }

  const slotsForLeague = leagueSlots(slots)
  if (slotsForLeague.length !== LEAGUE_ROUNDS) {
    throw new Error(`generateLeagueFixtures: expected ${LEAGUE_ROUNDS} league slots, found ${slotsForLeague.length}`)
  }

  const fixtures: LeagueFixtureDef[] = []
  rounds.forEach((roundFixtures, round) => {
    const slot = slotsForLeague[round]
    for (const f of roundFixtures) fixtures.push({ round, slot, home: f.home, away: f.away })
  })
  return fixtures
}

export { DAYS_OF_WEEK }
