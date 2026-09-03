/**
 * 컵 브래킷 진행기. 순수 함수 — 실제 경기 시뮬레이션은 하지 않는다. 경기
 * 엔진이 만든 스코어를 받아 다음 라운드로 넘길지, 연장전·승부차기가
 * 필요한지만 판정한다.
 *
 * 16강부터 시작(조별리그 없음), 16강·8강·4강은 2차전, 결승은 중립 단판.
 * 원정 다득점 규칙은 쓰지 않는다 — 합산이 같을 때만 연장전·승부차기.
 * 탈락한 구단은 다음 라운드 대진에 아예 나타나지 않는다(휴식이 곧 페널티).
 */
import { CUP_STAGE_ORDER, CUP_TEAMS, type CupStage } from './config'

export interface LegResult {
  /** 90분 스코어. leg의 실제 홈/원정 기준(대진의 "명목상 홈"과 다를 수 있음 — 2차전은 뒤바뀐다). */
  goals: { home: number; away: number }
  /** 이 leg 자체가(=결승, 또는 2차전 합산 동점) 연장전이 필요했을 때만 존재. */
  extraTime?: { home: number; away: number }
  /** 연장전 후에도 동점이었을 때만 존재. */
  penalties?: { home: number; away: number }
}

export interface CupTieState {
  id: string
  stage: CupStage
  /** 대진표상의 명목 홈·원정 — 2차전에서는 실제 홈/원정이 뒤바뀐다. */
  homeSeed: string
  awaySeed: string
  leg1: LegResult | null
  /** 결승(단판)에서는 계속 null. */
  leg2: LegResult | null
  winner: string | null
  decidedBy: 'REGULATION' | 'AGGREGATE' | 'EXTRA_TIME' | 'PENALTIES' | null
}

export interface CupBracket {
  stage: CupStage
  /** 현재 스테이지의, 아직 끝나지 않은(혹은 방금 끝난) 대진들. */
  ties: CupTieState[]
  /** 지나간 스테이지의 완료된 대진들 — Masters Final 선정 등에 쓰인다. */
  history: CupTieState[]
  champion: string | null
}

function tie(id: string, stage: CupStage, homeSeed: string, awaySeed: string): CupTieState {
  return { id, stage, homeSeed, awaySeed, leg1: null, leg2: null, winner: null, decidedBy: null }
}

/**
 * clubIds는 이미 시드 순서(1번 시드가 처음)로 정렬돼 들어온다 — Cup A는
 * 리그 순위, Cup B는 무작위 추첨으로 호출하는 쪽이 정해서 넘긴다. 이
 * 함수는 그 순서로 표준 대진(1대16, 2대15, ...)을 한 번 고정해서 만들 뿐,
 * 라운드마다 다시 시드하지 않는다.
 */
export function createCupBracket(clubIds: string[]): CupBracket {
  if (clubIds.length !== CUP_TEAMS) {
    throw new Error(`createCupBracket: expected ${CUP_TEAMS} club ids, got ${clubIds.length}`)
  }
  if (new Set(clubIds).size !== clubIds.length) {
    throw new Error('createCupBracket: club ids must be unique')
  }
  const half = clubIds.length / 2
  const ties = Array.from({ length: half }, (_, i) =>
    tie(`R16-${i}`, 'R16', clubIds[i], clubIds[clubIds.length - 1 - i]),
  )
  return { stage: 'R16', ties, history: [], champion: null }
}

export interface CupFixtureDef {
  tieId: string
  stage: CupStage
  /** null for the final. */
  leg: 1 | 2 | null
  home: string
  away: string
  neutral: boolean
}

/** 현재 스테이지에서 아직 안 끝난 대진들의 경기 목록 — 스케줄 배정에 씀. */
export function fixturesForCurrentStage(bracket: CupBracket): CupFixtureDef[] {
  const fixtures: CupFixtureDef[] = []
  for (const t of bracket.ties) {
    if (t.winner) continue
    if (bracket.stage === 'FINAL') {
      fixtures.push({ tieId: t.id, stage: t.stage, leg: null, home: t.homeSeed, away: t.awaySeed, neutral: true })
      continue
    }
    if (!t.leg1) {
      fixtures.push({ tieId: t.id, stage: t.stage, leg: 1, home: t.homeSeed, away: t.awaySeed, neutral: false })
    } else if (!t.leg2) {
      fixtures.push({ tieId: t.id, stage: t.stage, leg: 2, home: t.awaySeed, away: t.homeSeed, neutral: false })
    }
  }
  return fixtures
}

function aggregate(tie: CupTieState, leg1: LegResult, leg2: LegResult) {
  // leg1: home = tie.homeSeed. leg2: home = tie.awaySeed (뒤바뀜).
  return {
    home: leg1.goals.home + leg2.goals.away,
    away: leg1.goals.away + leg2.goals.home,
  }
}

function decideFromLevelScore(
  homeGoals: number,
  awayGoals: number,
  extraTime: { home: number; away: number } | undefined,
  penalties: { home: number; away: number } | undefined,
  homeId: string,
  awayId: string,
): { winner: string; decidedBy: CupTieState['decidedBy'] } {
  if (homeGoals !== awayGoals) {
    return { winner: homeGoals > awayGoals ? homeId : awayId, decidedBy: 'REGULATION' }
  }
  if (!extraTime) throw new Error('decideFromLevelScore: level after regulation but no extra time given')
  if (extraTime.home !== extraTime.away) {
    return { winner: extraTime.home > extraTime.away ? homeId : awayId, decidedBy: 'EXTRA_TIME' }
  }
  if (!penalties || penalties.home === penalties.away) {
    throw new Error('decideFromLevelScore: level after extra time but no decisive penalties given')
  }
  return { winner: penalties.home > penalties.away ? homeId : awayId, decidedBy: 'PENALTIES' }
}

/** 16강·8강·4강의 1차전을 기록한다. 1차전만으로는 승자를 정하지 않는다. */
export function recordFirstLeg(bracket: CupBracket, tieId: string, result: LegResult): CupBracket {
  if (result.extraTime || result.penalties) {
    throw new Error('recordFirstLeg: extra time/penalties only apply to the leg that decides the tie')
  }
  const ties = bracket.ties.map((t) => (t.id === tieId ? { ...t, leg1: result } : t))
  return { ...bracket, ties }
}

/** 16강·8강·4강의 2차전을 기록하고, 합산으로(필요하면 연장·승부차기까지) 승자를 정한다. */
export function recordSecondLeg(bracket: CupBracket, tieId: string, result: LegResult): CupBracket {
  const t = bracket.ties.find((item) => item.id === tieId)
  if (!t) throw new Error(`recordSecondLeg: no tie ${tieId}`)
  if (!t.leg1) throw new Error(`recordSecondLeg: leg1 not recorded yet for ${tieId}`)
  if (t.winner) throw new Error(`recordSecondLeg: ${tieId} already decided`)

  const agg = aggregate(t, t.leg1, result)
  if (agg.home !== agg.away && (result.extraTime || result.penalties)) {
    throw new Error('recordSecondLeg: aggregate was not level — extra time/penalties should not have been played')
  }
  const { winner, decidedBy } = decideFromLevelScore(
    agg.home,
    agg.away,
    result.extraTime,
    result.penalties,
    t.homeSeed,
    t.awaySeed,
  )
  const decided: CupTieState = {
    ...t,
    leg2: result,
    winner,
    decidedBy: decidedBy === 'REGULATION' ? 'AGGREGATE' : decidedBy,
  }
  const ties = bracket.ties.map((item) => (item.id === tieId ? decided : item))
  return { ...bracket, ties }
}

/** 결승(단판)을 기록한다. */
export function recordFinal(bracket: CupBracket, tieId: string, result: LegResult): CupBracket {
  if (bracket.stage !== 'FINAL') throw new Error('recordFinal: bracket is not at the final')
  const t = bracket.ties.find((item) => item.id === tieId)
  if (!t) throw new Error(`recordFinal: no tie ${tieId}`)
  if (t.winner) throw new Error(`recordFinal: ${tieId} already decided`)

  if (result.goals.home === result.goals.away && !result.extraTime) {
    throw new Error('recordFinal: level after 90 minutes but no extra time given')
  }
  if (result.goals.home !== result.goals.away && (result.extraTime || result.penalties)) {
    throw new Error('recordFinal: decided in 90 minutes — extra time/penalties should not have been played')
  }
  const { winner, decidedBy } = decideFromLevelScore(
    result.goals.home,
    result.goals.away,
    result.extraTime,
    result.penalties,
    t.homeSeed,
    t.awaySeed,
  )
  const decided: CupTieState = { ...t, leg1: result, winner, decidedBy }
  const ties = bracket.ties.map((item) => (item.id === tieId ? decided : item))
  return { ...bracket, ties }
}

/**
 * 현재 스테이지의 모든 대진이 끝났으면 다음 스테이지를 만든다. 아직 안
 * 끝났으면 그대로 돌려준다. 결승까지 끝났으면 champion을 채운다.
 */
export function advanceStageIfDone(bracket: CupBracket): CupBracket {
  const winners = bracket.ties.map((t) => t.winner)
  if (winners.some((w) => !w)) return bracket

  const history = [...bracket.history, ...bracket.ties]

  if (bracket.stage === 'FINAL') {
    return { ...bracket, history, champion: winners[0]! }
  }

  const nextStageIndex = CUP_STAGE_ORDER.indexOf(bracket.stage) + 1
  const nextStage = CUP_STAGE_ORDER[nextStageIndex]
  const advancing = winners as string[]
  const half = advancing.length / 2
  const nextTies = Array.from({ length: half }, (_, i) =>
    tie(`${nextStage}-${i}`, nextStage, advancing[i], advancing[advancing.length - 1 - i]),
  )
  return { stage: nextStage, ties: nextTies, history, champion: null }
}

/** 이 시점까지 각 구단이 이긴 토너먼트 라운드 수 — Masters Final 상대 선정에 씀. */
export function roundsWonByClub(bracket: CupBracket): Record<string, number> {
  const wins: Record<string, number> = {}
  for (const t of [...bracket.history, ...bracket.ties]) {
    if (t.winner) wins[t.winner] = (wins[t.winner] ?? 0) + 1
  }
  return wins
}

export interface ClubCupStats {
  gf: number
  ga: number
  roundsWon: number
}

/**
 * 구단별 이 컵에서의 득점·실점·승리 라운드 수. 연장전 골은 더하고
 * 승부차기는(골이 아니므로) 더하지 않는다 — Masters Final 상대 선정
 * (mastersFinal.ts)에 쓴다.
 */
export function clubMatchStats(ties: CupTieState[]): Record<string, ClubCupStats> {
  const stats: Record<string, ClubCupStats> = {}
  const bump = (club: string, gf: number, ga: number, won: boolean) => {
    const row = stats[club] ?? { gf: 0, ga: 0, roundsWon: 0 }
    row.gf += gf
    row.ga += ga
    if (won) row.roundsWon += 1
    stats[club] = row
  }
  const legGoals = (leg: LegResult | null, side: 'home' | 'away') =>
    leg ? leg.goals[side] + (leg.extraTime?.[side] ?? 0) : 0

  for (const t of ties) {
    if (!t.winner) continue
    // leg1: home=homeSeed. leg2(있으면): home=awaySeed(뒤바뀜). 결승은 leg1만 씀.
    const homeSeedGoals = legGoals(t.leg1, 'home') + legGoals(t.leg2, 'away')
    const awaySeedGoals = legGoals(t.leg1, 'away') + legGoals(t.leg2, 'home')
    bump(t.homeSeed, homeSeedGoals, awaySeedGoals, t.winner === t.homeSeed)
    bump(t.awaySeed, awaySeedGoals, homeSeedGoals, t.winner === t.awaySeed)
  }
  return stats
}
