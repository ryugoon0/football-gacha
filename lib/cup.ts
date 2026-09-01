import { MY_TEAM_ID, divisionBaseRating, type LeagueTeam } from './league'
import { seededRandom } from './players'

export const CUP_ROUND_LABELS = ['16강', '8강', '4강', '결승']
export const CUP_ROUNDS = CUP_ROUND_LABELS.length
export const CUP_TEAMS = 16

export interface CupTie {
  round: number
  home: string
  away: string
  homeGoals: number | null
  awayGoals: number | null
  /** Filled in only when the tie went to penalties. */
  shootout: [number, number] | null
  winner: string | null
}

export interface CupState {
  index: number
  round: number
  teams: LeagueTeam[]
  ties: CupTie[]
  eliminated: boolean
  champion: string | null
}

const CUP_CLUBS: [name: string, badge: string][] = [
  ['전북 모터스', 'JB'],
  ['울산 호랑', 'US'],
  ['포항 스틸맨', 'PH'],
  ['서울 캐피탈', 'SL'],
  ['수원 블루버드', 'SW'],
  ['대구 스카이', 'DG'],
  ['백두 유나이티드', 'BD'],
  ['속초 하버라이트', 'SC'],
  ['안동 하회', 'AD'],
  ['원주 다이너스티', 'WJ'],
  ['강릉 코스트', 'GN'],
  ['김해 가야', 'GH'],
  ['평창 스노우', 'PC'],
  ['충주 시티', 'CJ'],
  ['진주 실크', 'JU'],
  ['군산 아일랜더', 'GS'],
  ['거제 조선', 'GJ'],
  ['영덕 크랩스', 'YD'],
]

function tie(round: number, home: string, away: string): CupTie {
  return { round, home, away, homeGoals: null, awayGoals: null, shootout: null, winner: null }
}

/** Cup opponents come from a division above, so the cup is a step harder. */
export function createCup(division: number, index: number, myName: string): CupState {
  const rng = seededRandom(division * 31337 + index * 7717 + 5)
  const base = divisionBaseRating(division) + 4

  const pool = [...CUP_CLUBS]
  const rivals: LeagueTeam[] = []
  for (let i = 0; i < CUP_TEAMS - 1; i++) {
    const [name, badge] = pool.splice(Math.floor(rng() * pool.length), 1)[0]
    rivals.push({ id: `cup${i}`, name, badge, rating: Math.round(base - 4 + rng() * 18) })
  }

  const teams: LeagueTeam[] = [
    { id: MY_TEAM_ID, name: myName, badge: 'ME', rating: base },
    ...rivals,
  ]
  // Shuffle the draw so the player does not always meet the same club.
  const draw = [...teams]
  for (let i = draw.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[draw[i], draw[j]] = [draw[j], draw[i]]
  }

  const ties: CupTie[] = []
  for (let i = 0; i < draw.length; i += 2) ties.push(tie(0, draw[i].id, draw[i + 1].id))

  return { index, round: 0, teams, ties, eliminated: false, champion: null }
}

export function tiesOfRound(cup: CupState, round: number): CupTie[] {
  return cup.ties.filter((item) => item.round === round)
}

export function myTie(cup: CupState): CupTie | null {
  return (
    tiesOfRound(cup, cup.round).find(
      (item) => item.home === MY_TEAM_ID || item.away === MY_TEAM_ID,
    ) ?? null
  )
}

export function cupTeamOf(cup: CupState, id: string): LeagueTeam {
  return cup.teams.find((team) => team.id === id) ?? cup.teams[0]
}

/** Penalties: the stronger side has a small edge, nothing more. */
function shootout(homeRating: number, awayRating: number, rng: () => number): [number, number] {
  const edge = 0.5 + Math.max(-0.15, Math.min(0.15, (homeRating - awayRating) / 300))
  let home = 0
  let away = 0
  for (let i = 0; i < 5; i++) {
    if (rng() < edge) home++
    if (rng() < 1 - edge) away++
  }
  while (home === away) {
    if (rng() < edge) home++
    if (rng() < 1 - edge) away++
  }
  return [home, away]
}

function settle(
  item: CupTie,
  homeGoals: number,
  awayGoals: number,
  homeRating: number,
  awayRating: number,
  rng: () => number,
): CupTie {
  if (homeGoals !== awayGoals) {
    return {
      ...item,
      homeGoals,
      awayGoals,
      winner: homeGoals > awayGoals ? item.home : item.away,
    }
  }
  const penalties = shootout(homeRating, awayRating, rng)
  return {
    ...item,
    homeGoals,
    awayGoals,
    shootout: penalties,
    winner: penalties[0] > penalties[1] ? item.home : item.away,
  }
}

export function cupReward(round: number, won: boolean): number {
  if (!won) return 100 + round * 150
  return [300, 600, 1200, 3000][round] ?? 300
}

export interface CupProgress {
  cup: CupState
  /** True when the player's team went through in this round. */
  advanced: boolean
}

/**
 * Records the player's tie, simulates the rest of the round and builds the next
 * one. Once the player is out the remaining rounds are played off screen so the
 * bracket still crowns a champion.
 */
export function resolveCupRound(
  cup: CupState,
  myGoals: number,
  opponentGoals: number,
  myRating: number,
  simulate: (home: LeagueTeam, away: LeagueTeam, rng: () => number) => [number, number],
  rng: () => number = Math.random,
): CupProgress {
  const mine = myTie(cup)
  if (!mine || cup.champion) return { cup, advanced: false }

  const iAmHome = mine.home === MY_TEAM_ID
  const opponent = cupTeamOf(cup, iAmHome ? mine.away : mine.home)

  const ties = cup.ties.map((item) => {
    if (item.round !== cup.round || item.winner) return item
    if (item === mine) {
      return settle(
        item,
        iAmHome ? myGoals : opponentGoals,
        iAmHome ? opponentGoals : myGoals,
        iAmHome ? myRating : opponent.rating,
        iAmHome ? opponent.rating : myRating,
        rng,
      )
    }
    const home = cupTeamOf(cup, item.home)
    const away = cupTeamOf(cup, item.away)
    const [homeGoals, awayGoals] = simulate(home, away, rng)
    return settle(item, homeGoals, awayGoals, home.rating, away.rating, rng)
  })

  const settled = ties.find(
    (item) =>
      item.round === cup.round && (item.home === MY_TEAM_ID || item.away === MY_TEAM_ID),
  )
  const advanced = settled?.winner === MY_TEAM_ID

  const next = buildNextRound(
    { ...cup, ties, eliminated: cup.eliminated || !advanced },
    simulate,
    rng,
  )
  return { cup: next, advanced }
}

function buildNextRound(
  cup: CupState,
  simulate: (home: LeagueTeam, away: LeagueTeam, rng: () => number) => [number, number],
  rng: () => number,
): CupState {
  let current = cup
  while (true) {
    const winners = tiesOfRound(current, current.round)
      .map((item) => item.winner)
      .filter((id): id is string => Boolean(id))

    if (winners.length !== tiesOfRound(current, current.round).length) return current

    if (winners.length === 1) {
      return { ...current, champion: winners[0] }
    }

    const ties = [...current.ties]
    for (let i = 0; i < winners.length; i += 2) {
      ties.push(tie(current.round + 1, winners[i], winners[i + 1]))
    }
    current = { ...current, ties, round: current.round + 1 }

    // The player only plays their own ties; everything else resolves itself.
    if (!current.eliminated && myTie(current)) return current

    const played = current.ties.map((item) => {
      if (item.round !== current.round || item.winner) return item
      const home = cupTeamOf(current, item.home)
      const away = cupTeamOf(current, item.away)
      const [homeGoals, awayGoals] = simulate(home, away, rng)
      return settle(item, homeGoals, awayGoals, home.rating, away.rating, rng)
    })
    current = { ...current, ties: played }
  }
}
