/**
 * 작전카드 — a one-off card for a weekly fixture, chosen before kick-off,
 * that boosts the whole side's ability while a stated match condition holds.
 *
 * The original 풋볼데이 cards worked this way ("공은 둥글다: 능력치가 5 이상
 * 높은 팀을 상대할 때 능력치 +5"), and this game keeps the idea with its own
 * names and conditions: each card names a situation — underdog, home crowd,
 * chasing a goal, the last twenty minutes — and while that situation is true
 * every player on the pitch plays `boost` points better. Outside it the card
 * does nothing, so a card is a read on how the match will go, not a flat buff.
 *
 * "Plays better" means the six visible stats (pac/sho/pas/dri/def/phy) and the
 * slot rating, because that is what the tactical model actually reads —
 * scaling the headline att/def/mid alone barely moves a match (measured on
 * the first live group). One card per side per match, played in the
 * pre-match window only. Cards are items (lib/items.ts): bought with gold or
 * shards, or earned at the end of a league week and in cup finals.
 */
import type { SquadRating } from '../squad'
import type { Stats } from '../types'

export type TacticCardId =
  | 'cardUnderdog'
  | 'cardEvenMatch'
  | 'cardHomeCrowd'
  | 'cardAwayGrit'
  | 'cardBigStage'
  | 'cardHotTime'
  | 'cardChaser'
  | 'cardLockdown'
  | 'cardFastStart'
  | 'cardSecondHalf'
  | 'cardLateLegs'
  | 'cardGoalmouth'

/** What a card can look at to decide whether it is on, from the holder's point of view. */
export interface CardContext {
  minute: number
  myScore: number
  theirScore: number
  myShots: number
  theirShots: number
  venue: 'home' | 'away' | 'neutral'
  myOverall: number
  theirOverall: number
  /** Kick-off is a 핫타임 hour (15:00 / 21:00 KST). */
  hotTime: boolean
}

export interface TacticCardDef {
  id: TacticCardId
  name: string
  /** The condition, as the manager reads it. */
  when: string
  /** Stat points added to every player on the pitch while the condition holds. */
  boost: number
  icon: string
  /** Whether the card is on right now. Pure; called every minute. */
  triggers: (ctx: CardContext) => boolean
}

const define = (card: TacticCardDef) => card

export const TACTIC_CARDS: Record<TacticCardId, TacticCardDef> = {
  cardUnderdog: define({
    id: 'cardUnderdog',
    name: '공은 원래 둥글다',
    when: '상대 스쿼드 종합이 우리보다 5 이상 높을 때, 경기 내내',
    boost: 5,
    icon: '⚽',
    triggers: (ctx) => ctx.theirOverall - ctx.myOverall >= 5,
  }),
  cardEvenMatch: define({
    id: 'cardEvenMatch',
    name: '박빙 승부사',
    when: '두 팀 스쿼드 종합 차이가 5 미만일 때, 경기 내내',
    boost: 4,
    icon: '⚖️',
    triggers: (ctx) => Math.abs(ctx.theirOverall - ctx.myOverall) < 5,
  }),
  cardHomeCrowd: define({
    id: 'cardHomeCrowd',
    name: '열두 번째 선수',
    when: '홈 경기일 때, 경기 내내',
    boost: 4,
    icon: '📣',
    triggers: (ctx) => ctx.venue === 'home',
  }),
  cardAwayGrit: define({
    id: 'cardAwayGrit',
    name: '원정 투혼',
    when: '원정 경기일 때, 경기 내내',
    boost: 4,
    icon: '🚩',
    triggers: (ctx) => ctx.venue === 'away',
  }),
  cardBigStage: define({
    id: 'cardBigStage',
    name: '큰 경기에 강하다',
    when: '중립 구장 경기(컵 결승·Masters Final)일 때, 경기 내내',
    boost: 6,
    icon: '🏟️',
    triggers: (ctx) => ctx.venue === 'neutral',
  }),
  cardHotTime: define({
    id: 'cardHotTime',
    name: '핫타임 집중',
    when: '핫타임(15시·21시) 킥오프 경기일 때, 경기 내내',
    boost: 4,
    icon: '🔥',
    triggers: (ctx) => ctx.hotTime,
  }),
  cardChaser: define({
    id: 'cardChaser',
    name: '추격자 본능',
    when: '우리가 한 골 이상 뒤지고 있는 동안',
    boost: 6,
    icon: '🏃',
    triggers: (ctx) => ctx.myScore < ctx.theirScore,
  }),
  cardLockdown: define({
    id: 'cardLockdown',
    name: '리드는 지킨다',
    when: '우리가 앞서고 있는 동안',
    boost: 4,
    icon: '🔒',
    triggers: (ctx) => ctx.myScore > ctx.theirScore,
  }),
  cardFastStart: define({
    id: 'cardFastStart',
    name: '초반 러시',
    when: '킥오프부터 20분까지',
    boost: 6,
    icon: '🚀',
    triggers: (ctx) => ctx.minute <= 20,
  }),
  cardSecondHalf: define({
    id: 'cardSecondHalf',
    name: '후반의 사나이',
    when: '후반전(45분 이후) 내내',
    boost: 4,
    icon: '🌙',
    triggers: (ctx) => ctx.minute >= 45,
  }),
  cardLateLegs: define({
    id: 'cardLateLegs',
    name: '지지 않는 다리',
    when: '70분 이후 경기 끝까지',
    boost: 5,
    icon: '🦵',
    triggers: (ctx) => ctx.minute >= 70,
  }),
  cardGoalmouth: define({
    id: 'cardGoalmouth',
    name: '골문 앞 집중',
    when: '상대 슈팅이 8개를 넘은 뒤부터',
    boost: 5,
    icon: '🧤',
    triggers: (ctx) => ctx.theirShots >= 8,
  }),
}

export const TACTIC_CARD_IDS = Object.keys(TACTIC_CARDS) as TacticCardId[]

export function isTacticCardId(value: unknown): value is TacticCardId {
  return typeof value === 'string' && value in TACTIC_CARDS
}

const STAT_KEYS: (keyof Stats)[] = ['pac', 'sho', 'pas', 'dri', 'def', 'phy']

/**
 * The side playing `boost` points better: every fielded player's six stats
 * and slot rating go up (capped at 99), and the headline numbers follow.
 * Returns a new rating; the base is kept by the caller for when the card
 * switches off.
 */
export function boostRating(rating: SquadRating, boost: number): SquadRating {
  if (boost <= 0) return rating
  const lift = (value: number) => Math.min(99, value + boost)
  return {
    ...rating,
    att: rating.att + boost,
    mid: rating.mid + boost,
    def: rating.def + boost,
    overall: rating.overall + boost,
    evaluations: rating.evaluations.map((item) => {
      if (!item.player || !item.card) return item
      const stats = { ...item.player.stats } as Stats
      for (const key of STAT_KEYS) stats[key] = lift(stats[key])
      return { ...item, rating: lift(item.rating), player: { ...item.player, stats } }
    }),
  }
}
