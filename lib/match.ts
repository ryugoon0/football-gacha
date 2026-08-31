import { BOTTOM_DIVISION, type LeagueTeam } from './league'
import { POSITION_GROUP } from './players'
import type { SlotEvaluation, SquadRating } from './squad'
import { TACTICS, type TacticKey } from './tactics'
import type { MatchEvent, MatchResult } from './types'

const OPPONENT_PLAYERS = [
  '카를로스',
  '반더스',
  '오카다',
  '실바',
  '뮐러',
  '두산',
  '페레즈',
  '리베로',
  '가브리엘',
  '노바크',
]

/** Rating bump for playing at home. */
export const HOME_ADVANTAGE = 3

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

export function matchReward(result: 'W' | 'D' | 'L', division: number, scoreFor: number): number {
  const base = result === 'W' ? 420 : result === 'D' ? 180 : 70
  const divisionBonus = (BOTTOM_DIVISION + 1 - division) * 60
  const share = result === 'W' ? divisionBonus : Math.round(divisionBonus / 3)
  return base + share + scoreFor * 30
}

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n))

export type Venue = 'home' | 'away' | 'neutral'

export interface MatchOptions {
  team: SquadRating
  teamName: string
  opponent: LeagueTeam
  division: number
  venue: Venue
  tactic: TacticKey
  rng?: () => number
}

export function simulateMatch({
  team,
  teamName,
  opponent,
  division,
  venue,
  tactic,
  rng = Math.random,
}: MatchOptions): MatchResult {
  const plan = TACTICS[tactic] ?? TACTICS.balanced
  const homeBonus = venue === 'home' ? HOME_ADVANTAGE : 0
  const awayBonus = venue === 'away' ? HOME_ADVANTAGE : 0

  const myAtt = team.att * plan.att + homeBonus
  const myDef = team.def * plan.def + homeBonus
  const myMid = team.mid + homeBonus

  const oppAtt = opponent.rating + awayBonus + (rng() * 6 - 3)
  const oppMid = opponent.rating + awayBonus + (rng() * 6 - 3)
  const oppDef = opponent.rating + awayBonus + (rng() * 6 - 3)

  const possessionShare = myMid / (myMid + oppMid)
  const venueLabel = venue === 'home' ? '홈' : venue === 'away' ? '원정' : '중립'
  const events: MatchEvent[] = [
    {
      minute: 0,
      type: 'kickoff',
      side: 'home',
      text: `${teamName} 대 ${opponent.name} (${venueLabel}), 킥오프!`,
    },
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
    if (rng() > 0.13 * plan.tempo) continue

    const weAttack = rng() < possessionShare
    const att = weAttack ? myAtt : oppAtt
    const def = weAttack ? oppDef : myDef
    const side: 'home' | 'away' = weAttack ? 'home' : 'away'
    if (weAttack) shotsFor++
    else shotsAgainst++

    const goalChance = clamp(0.22 + (att - def) / 150, 0.06, 0.55)
    const shooter = weAttack
      ? pickScorer(team.evaluations, rng)
      : OPPONENT_PLAYERS[Math.floor(rng() * OPPONENT_PLAYERS.length)]

    if (rng() < goalChance) {
      if (weAttack) scoreFor++
      else scoreAgainst++
      events.push({
        minute,
        type: 'goal',
        side,
        text: `⚽ ${shooter} 골! ${scoreFor} : ${scoreAgainst}`,
      })
    } else if (rng() < 0.5) {
      const keeper = weAttack ? `${opponent.name} 골키퍼` : keeperName(team.evaluations)
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
