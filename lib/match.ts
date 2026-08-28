import { POSITION_GROUP } from './players'
import type { SlotEvaluation, SquadRating } from './squad'
import type { MatchEvent, MatchResult } from './types'

export interface Opponent {
  id: string
  name: string
  rating: number
  /** Two-letter crest text. */
  badge: string
}

const OPPONENT_NAMES = [
  ['청담 클래식', 'CD'],
  ['성수 워리어스', 'SS'],
  ['망원 시티', 'MW'],
  ['해운대 웨이브', 'HD'],
  ['광안 브릿지', 'GA'],
  ['한라 화산', 'HL'],
  ['금정 타이거즈', 'GJ'],
  ['남산 타워스', 'NS'],
  ['여의도 캐피탈', 'YD'],
  ['영종 에어포트', 'YJ'],
  ['태백 마운틴', 'TB'],
  ['동해 크라켄', 'DH'],
]

const OPPONENT_PLAYERS = [
  '카를로스',
  '무리뉴',
  '반더스',
  '오카다',
  '실바',
  '뮐러',
  '두산',
  '페레즈',
  '리베로',
  '가브리엘',
]

/** Division 5 is the bottom tier, division 1 the top. */
export const TOP_DIVISION = 1
export const BOTTOM_DIVISION = 5
export const PROMOTION_POINTS = 15

export function divisionLabel(division: number): string {
  return division === 1 ? '1부 리그' : `${division}부 리그`
}

export function divisionBaseRating(division: number): number {
  return 52 + (BOTTOM_DIVISION - division) * 9
}

/** Three opponents to choose from, easiest first. */
export function opponentsFor(division: number, seed = 0): Opponent[] {
  const base = divisionBaseRating(division)
  return [0, 1, 2].map((index) => {
    const pick = OPPONENT_NAMES[(seed + index * 4 + division * 3) % OPPONENT_NAMES.length]
    return {
      id: `d${division}-${index}`,
      name: pick[0],
      badge: pick[1],
      rating: base + index * 5,
    }
  })
}

function pickScorer(evaluations: SlotEvaluation[], rng: () => number): string {
  const candidates = evaluations.filter(
    (item) => item.player && POSITION_GROUP[item.slotPosition] !== 'GK',
  )
  if (candidates.length === 0) return '유스 선수'
  const weights = candidates.map((item) => {
    const group = POSITION_GROUP[item.slotPosition]
    const bias = group === 'FW' ? 6 : group === 'MF' ? 3 : 1
    return bias * (item.player!.stats.sho / 50 + 0.4)
  })
  const total = weights.reduce((sum, weight) => sum + weight, 0)
  let roll = rng() * total
  for (let i = 0; i < candidates.length; i++) {
    roll -= weights[i]
    if (roll <= 0) return candidates[i].player!.name
  }
  return candidates[candidates.length - 1].player!.name
}

function keeperName(evaluations: SlotEvaluation[]): string {
  const keeper = evaluations.find((item) => item.slotPosition === 'GK')
  return keeper?.player?.name ?? '유스 골키퍼'
}

function opponentPlayer(rng: () => number): string {
  return OPPONENT_PLAYERS[Math.floor(rng() * OPPONENT_PLAYERS.length)]
}

export function matchReward(
  result: 'W' | 'D' | 'L',
  division: number,
  scoreFor: number,
): number {
  const base = result === 'W' ? 420 : result === 'D' ? 180 : 70
  const divisionBonus = (BOTTOM_DIVISION + 1 - division) * 60
  const share = result === 'W' ? divisionBonus : Math.round(divisionBonus / 3)
  return base + share + scoreFor * 30
}

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n))

export function simulateMatch(
  team: SquadRating,
  teamName: string,
  opponent: Opponent,
  division: number,
  rng: () => number = Math.random,
): MatchResult {
  const oppAtt = opponent.rating + (rng() * 6 - 3)
  const oppMid = opponent.rating + (rng() * 6 - 3)
  const oppDef = opponent.rating + (rng() * 6 - 3)

  const possessionShare = team.mid / (team.mid + oppMid)
  const events: MatchEvent[] = [
    { minute: 0, type: 'kickoff', side: 'home', text: `${teamName} 대 ${opponent.name}, 킥오프!` },
  ]

  let scoreFor = 0
  let scoreAgainst = 0
  let shotsFor = 0
  let shotsAgainst = 0

  for (let minute = 1; minute <= 90; minute++) {
    if (minute === 45) {
      events.push({
        minute,
        type: 'half',
        side: 'home',
        text: `전반 종료 — ${scoreFor} : ${scoreAgainst}`,
      })
    }
    if (rng() > 0.13) continue

    const homeAttacks = rng() < possessionShare
    const att = homeAttacks ? team.att : oppAtt
    const def = homeAttacks ? oppDef : team.def
    const side: 'home' | 'away' = homeAttacks ? 'home' : 'away'
    if (homeAttacks) shotsFor++
    else shotsAgainst++

    const goalChance = clamp(0.22 + (att - def) / 150, 0.06, 0.55)
    const shooter = homeAttacks
      ? pickScorer(team.evaluations, rng)
      : opponentPlayer(rng)

    if (rng() < goalChance) {
      if (homeAttacks) scoreFor++
      else scoreAgainst++
      events.push({
        minute,
        type: 'goal',
        side,
        text: `⚽ ${shooter} 골! ${scoreFor} : ${scoreAgainst}`,
      })
    } else if (rng() < 0.5) {
      const keeper = homeAttacks ? `${opponent.name} 골키퍼` : keeperName(team.evaluations)
      events.push({
        minute,
        type: 'save',
        side,
        text: `${shooter}의 슈팅, ${keeper}가 선방합니다.`,
      })
    } else {
      events.push({
        minute,
        type: 'chance',
        side,
        text: `${shooter}의 슈팅이 골대를 살짝 빗나갑니다.`,
      })
    }
  }

  const result: 'W' | 'D' | 'L' =
    scoreFor > scoreAgainst ? 'W' : scoreFor === scoreAgainst ? 'D' : 'L'

  events.push({
    minute: 90,
    type: 'full',
    side: 'home',
    text: `경기 종료 — ${teamName} ${scoreFor} : ${scoreAgainst} ${opponent.name}`,
  })

  return {
    opponent: opponent.name,
    opponentRating: opponent.rating,
    scoreFor,
    scoreAgainst,
    result,
    events,
    reward: matchReward(result, division, scoreFor),
    possession: Math.round(possessionShare * 100),
    shotsFor,
    shotsAgainst,
  }
}
