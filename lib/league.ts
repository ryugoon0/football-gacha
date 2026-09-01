import { seededRandom } from './players'

export const TEAMS_PER_LEAGUE = 20
export const ROUNDS_PER_SEASON = TEAMS_PER_LEAGUE - 1
export const MY_TEAM_ID = 'me'
export const TOP_DIVISION = 1
export const BOTTOM_DIVISION = 5
/** Finishing this high or better goes up a division. */
export const PROMOTION_RANK = 2
/** Finishing this low or worse goes down a division. */
export const RELEGATION_RANK = 18

export interface LeagueTeam {
  id: string
  name: string
  badge: string
  rating: number
}

export interface TableRow {
  played: number
  w: number
  d: number
  l: number
  gf: number
  ga: number
  points: number
}

export interface Fixture {
  round: number
  home: string
  away: string
}

export interface Season {
  division: number
  index: number
  /** Round about to be played, 0 based. */
  round: number
  teams: LeagueTeam[]
  table: Record<string, TableRow>
  fixtures: Fixture[]
  finished: boolean
}

export interface StandingRow extends TableRow {
  team: LeagueTeam
  rank: number
  gd: number
}

const CLUB_POOL: [name: string, badge: string][] = [
  ['인천 유나이트', 'IC'],
  ['대전 시티즌스', 'DJ'],
  ['광주 라이트', 'GJ'],
  ['강원 알펜', 'GW'],
  ['제주 오름', 'JJ'],
  ['성남 마그마', 'SN'],
  ['김천 밀리터리', 'GC'],
  ['수원 시티', 'SW'],
  ['부산 하버', 'BS'],
  ['안양 퓨마', 'AY'],
  ['부천 그린', 'BC'],
  ['전남 드래건', 'JN'],
  ['경남 다이너모', 'GN'],
  ['아산 무궁', 'AS'],
  ['서울 이스트', 'SE'],
  ['안산 그리너', 'AN'],
  ['천안 흥타령', 'CA'],
  ['청주 코어', 'CJ'],
  ['김포 필드', 'GP'],
  ['화성 스타즈', 'HS'],
  ['평택 포트', 'PT'],
  ['목포 세일러', 'MP'],
  ['통영 씨걸스', 'TY'],
  ['여수 오션스', 'YS'],
]

/**
 * A one-off opponent for a friendly: drawn from the same pool as the league,
 * at roughly the strength of the division you are in.
 */
export function friendlyOpponent(division: number, index: number): LeagueTeam {
  const [name, badge] = CLUB_POOL[index % CLUB_POOL.length]
  const swing = ((index * 7) % 9) - 4
  return {
    id: `friendly-${index}`,
    name,
    badge,
    rating: Math.max(35, divisionBaseRating(division) + swing),
  }
}

export function divisionLabel(division: number): string {
  return `${division}부 리그`
}

/** Average strength of the clubs in a division. */
export function divisionBaseRating(division: number): number {
  return 52 + (BOTTOM_DIVISION - division) * 9
}

function emptyRow(): TableRow {
  return { played: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, points: 0 }
}

/** Circle method: every team meets every other team exactly once. */
function roundRobin(ids: string[]): Fixture[] {
  const rotation = [...ids]
  const fixtures: Fixture[] = []
  const half = rotation.length / 2

  for (let round = 0; round < rotation.length - 1; round++) {
    for (let i = 0; i < half; i++) {
      const home = rotation[i]
      const away = rotation[rotation.length - 1 - i]
      // Alternate home and away so nobody plays every game at home.
      fixtures.push(round % 2 === 0 ? { round, home, away } : { round, home: away, away: home })
    }
    const [fixed, ...rest] = rotation
    rest.unshift(rest.pop()!)
    rotation.splice(0, rotation.length, fixed, ...rest)
  }
  return fixtures
}

export function createSeason(division: number, index: number, myName: string): Season {
  const rng = seededRandom(division * 7919 + index * 104729 + 17)
  const base = divisionBaseRating(division)

  const pool = [...CLUB_POOL]
  const rivals: LeagueTeam[] = []
  for (let i = 0; i < TEAMS_PER_LEAGUE - 1; i++) {
    const [name, badge] = pool.splice(Math.floor(rng() * pool.length), 1)[0]
    rivals.push({
      id: `ai${i}`,
      name,
      badge,
      rating: Math.round(base - 6 + rng() * 16),
    })
  }

  const teams: LeagueTeam[] = [
    { id: MY_TEAM_ID, name: myName, badge: 'ME', rating: base },
    ...rivals,
  ]
  const table: Record<string, TableRow> = {}
  for (const team of teams) table[team.id] = emptyRow()

  return {
    division,
    index,
    round: 0,
    teams,
    table,
    fixtures: roundRobin(teams.map((team) => team.id)),
    finished: false,
  }
}

export function fixturesOfRound(season: Season, round: number): Fixture[] {
  return season.fixtures.filter((fixture) => fixture.round === round)
}

export function myFixture(season: Season): Fixture | null {
  return (
    fixturesOfRound(season, season.round).find(
      (fixture) => fixture.home === MY_TEAM_ID || fixture.away === MY_TEAM_ID,
    ) ?? null
  )
}

export function teamOf(season: Season, id: string): LeagueTeam {
  return season.teams.find((team) => team.id === id) ?? season.teams[0]
}

function poisson(lambda: number, rng: () => number): number {
  const limit = Math.exp(-lambda)
  let goals = 0
  let product = rng()
  while (product > limit && goals < 9) {
    goals++
    product *= rng()
  }
  return goals
}

/** Quick model for matches the player is not involved in. */
export function simulateAiMatch(
  home: LeagueTeam,
  away: LeagueTeam,
  rng: () => number = Math.random,
): [number, number] {
  const diff = home.rating + 3 - away.rating
  const homeGoals = poisson(Math.max(0.25, Math.min(4.5, 1.3 + diff / 22)), rng)
  const awayGoals = poisson(Math.max(0.25, Math.min(4.5, 1.3 - diff / 22)), rng)
  return [homeGoals, awayGoals]
}

export function recordResult(
  season: Season,
  homeId: string,
  awayId: string,
  homeGoals: number,
  awayGoals: number,
): Season {
  const table = { ...season.table }
  const home = { ...(table[homeId] ?? emptyRow()) }
  const away = { ...(table[awayId] ?? emptyRow()) }

  home.played++
  away.played++
  home.gf += homeGoals
  home.ga += awayGoals
  away.gf += awayGoals
  away.ga += homeGoals

  if (homeGoals > awayGoals) {
    home.w++
    away.l++
    home.points += 3
  } else if (homeGoals < awayGoals) {
    away.w++
    home.l++
    away.points += 3
  } else {
    home.d++
    away.d++
    home.points++
    away.points++
  }

  table[homeId] = home
  table[awayId] = away
  return { ...season, table }
}

export function standings(season: Season): StandingRow[] {
  return season.teams
    .map((team) => {
      const row = season.table[team.id] ?? emptyRow()
      return { ...row, team, gd: row.gf - row.ga, rank: 0 }
    })
    .sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf || a.team.name.localeCompare(b.team.name))
    .map((row, index) => ({ ...row, rank: index + 1 }))
}

export function myRank(season: Season): number {
  return standings(season).findIndex((row) => row.team.id === MY_TEAM_ID) + 1
}

export interface SeasonOutcome {
  rank: number
  nextDivision: number
  promoted: boolean
  relegated: boolean
  reward: number
}

export function seasonOutcome(season: Season): SeasonOutcome {
  const rank = myRank(season)
  const promoted = rank <= PROMOTION_RANK && season.division > TOP_DIVISION
  const relegated = rank >= RELEGATION_RANK && season.division < BOTTOM_DIVISION
  const nextDivision = promoted
    ? season.division - 1
    : relegated
      ? season.division + 1
      : season.division

  const rankReward = rank === 1 ? 3000 : rank === 2 ? 2000 : rank === 3 ? 1200 : rank <= 6 ? 600 : 300
  const reward = Math.round(rankReward * (1 + (BOTTOM_DIVISION - season.division) * 0.4))

  return { rank, nextDivision, promoted, relegated, reward }
}
