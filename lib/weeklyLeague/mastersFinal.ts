/**
 * Masters Final 대진 선정.
 *
 * 보통은 Cup A 우승 구단과 Cup B 우승 구단이 맞붙는다. 같은 구단이 두 컵을
 * 모두 우승했으면 경기를 취소하지 않고, 나머지 15개 구단 중 두 컵 합산
 * 성적이 가장 좋은 구단을 상대로 고른다(스펙 5절). 선정 순서: 승리한
 * 토너먼트 라운드 수 → 두 컵 전체 골득실 → 두 컵 전체 득점 → 페어플레이 →
 * 고정 시드.
 */
import { clubMatchStats, type CupBracket } from './cup'

export interface MastersFinalCandidate {
  club: string
  roundsWon: number
  combinedGd: number
  combinedGf: number
  fairPlay: number
}

export interface MastersFinalSelection {
  home: string
  away: string
  reason: 'DIFFERENT_CHAMPIONS' | 'SAME_CLUB_DOUBLE_WIN'
  /** SAME_CLUB_DOUBLE_WIN일 때만 존재 — 선정 근거를 그대로 남긴다. */
  runnerUpRanking?: MastersFinalCandidate[]
}

export interface MastersFinalOptions {
  fairPlay?: Record<string, number>
  fixedSeedOrder?: string[]
}

export function selectMastersFinalists(
  cupA: CupBracket,
  cupB: CupBracket,
  allClubIds: string[],
  options: MastersFinalOptions = {},
): MastersFinalSelection {
  if (!cupA.champion || !cupB.champion) {
    throw new Error('selectMastersFinalists: both cups need a champion first')
  }
  if (cupA.champion !== cupB.champion) {
    return { home: cupA.champion, away: cupB.champion, reason: 'DIFFERENT_CHAMPIONS' }
  }

  const doubleWinner = cupA.champion
  const statsA = clubMatchStats([...cupA.history, ...cupA.ties])
  const statsB = clubMatchStats([...cupB.history, ...cupB.ties])
  const fairPlay = options.fairPlay ?? {}
  const seedOrder = options.fixedSeedOrder ?? allClubIds
  const seedRank = new Map(seedOrder.map((club, index) => [club, index]))

  const ranking: MastersFinalCandidate[] = allClubIds
    .filter((club) => club !== doubleWinner)
    .map((club) => {
      const a = statsA[club] ?? { gf: 0, ga: 0, roundsWon: 0 }
      const b = statsB[club] ?? { gf: 0, ga: 0, roundsWon: 0 }
      return {
        club,
        roundsWon: a.roundsWon + b.roundsWon,
        combinedGd: a.gf - a.ga + (b.gf - b.ga),
        combinedGf: a.gf + b.gf,
        fairPlay: fairPlay[club] ?? 0,
      }
    })
    .sort((x, y) => {
      if (x.roundsWon !== y.roundsWon) return y.roundsWon - x.roundsWon
      if (x.combinedGd !== y.combinedGd) return y.combinedGd - x.combinedGd
      if (x.combinedGf !== y.combinedGf) return y.combinedGf - x.combinedGf
      if (x.fairPlay !== y.fairPlay) return y.fairPlay - x.fairPlay
      return (seedRank.get(x.club) ?? 0) - (seedRank.get(y.club) ?? 0)
    })

  return { home: doubleWinner, away: ranking[0].club, reason: 'SAME_CLUB_DOUBLE_WIN', runnerUpRanking: ranking }
}
