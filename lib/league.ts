import { seededRandom } from './players'

export const TEAMS_PER_LEAGUE = 8
export const ROUNDS_PER_SEASON = TEAMS_PER_LEAGUE - 1
export const MY_TEAM_ID = 'me'
export const TOP_DIVISION = 1
export const BOTTOM_DIVISION = 5
/** Finishing this high or better goes up a division. */
export const PROMOTION_RANK = 2
/** Finishing this low or worse goes down a division. */
export const RELEGATION_RANK = 7

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
  ['소백 레인저스', 'SB'],
  ['월미 시걸스', 'WM'],
]

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
