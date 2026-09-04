/**
 * The three AI assistants — who speaks on which screen, and what they say.
 *
 * docs/AI_ASSISTANT_CANDIDATES.md: 한아름 owns the home/casual/PvP screens,
 * 서지안 the squad and match-analysis screens, 백소연 the weekly league and
 * the money screens. One voice per screen, never two. Lines are picked from
 * what the save actually says (a locked casual mode, an empty slot, a hot
 * time kick-off coming up) so the assistant reads as someone looking at the
 * same screen, not a greeting loop. Names and people are fictional; the art
 * is generated (no real likeness).
 *
 * Images live in public/assistants/<mode>/<id>.webp (full) and
 * <id>-bust.webp (square crop), two modes: 'safe' and 'open'.
 */
import { casualModeLocked, miniGamesLeft, pvpMatchesLeft, type DailyState } from './daily'
import type { GameState } from './types'

export type AssistantId = 'hanareum' | 'seojian' | 'baeksoyeon'
export type AssistantMode = 'safe' | 'open'

export interface AssistantDef {
  id: AssistantId
  name: string
  role: string
  /** Text colour accent for the name plate. */
  accent: string
}

export const ASSISTANTS: Record<AssistantId, AssistantDef> = {
  hanareum: { id: 'hanareum', name: '한아름', role: '신입 코치 · 매니저', accent: 'text-orange-300' },
  seojian: { id: 'seojian', name: '서지안', role: '수석 데이터 분석관', accent: 'text-sky-300' },
  baeksoyeon: { id: 'baeksoyeon', name: '백소연', role: '구단 사무국장', accent: 'text-rose-300' },
}

/** Which assistant owns a game tab; null where the screen's own UI is enough. */
export function assistantForTab(tab: string): AssistantId | null {
  switch (tab) {
    case 'home':
    case 'match':
    case 'pvp':
      return 'hanareum'
    case 'squad':
    case 'club':
      return 'seojian'
    case 'weekly':
    case 'market':
    case 'items':
      return 'baeksoyeon'
    default:
      return null
  }
}

/**
 * Expressions each assistant has art for (public/assistants/<mode>/<id>-<expression>*.webp);
 * 'base' is the plain portrait. A line names one and the card shows it.
 */
export const EXPRESSIONS: Record<AssistantId, readonly string[]> = {
  hanareum: ['base', 'surprised', 'sad', 'determined', 'soft'],
  seojian: ['base', 'smile', 'frown'],
  baeksoyeon: ['base', 'surprised', 'serious'],
}

/**
 * 'bust' — square face crop for the card; 'full' — the 3:4 portrait;
 * 'body' — head-to-toe standing figure (<id>-full.webp), no expression variants.
 */
export function assistantImage(
  id: AssistantId,
  mode: AssistantMode,
  crop: 'full' | 'bust' | 'body' = 'bust',
  expression = 'base',
): string {
  if (crop === 'body') return `/assistants/${mode}/${id}-full.webp`
  const face = expression !== 'base' && EXPRESSIONS[id].includes(expression) ? `-${expression}` : ''
  return `/assistants/${mode}/${id}${face}${crop === 'bust' ? '-bust' : ''}.webp`
}

/** Who greets at the door today — rotates daily so each of the three gets her turn. */
export function assistantOfTheDay(nowMs = Date.now()): AssistantId {
  const ids: AssistantId[] = ['hanareum', 'seojian', 'baeksoyeon']
  const day = Math.floor((nowMs + KST_OFFSET_MS) / 86_400_000)
  return ids[day % ids.length]
}
const KST_OFFSET_MS = 9 * 60 * 60_000

/** The door line each assistant says on the login screen. */
export const WELCOME_LINES: Record<AssistantId, string> = {
  hanareum: '감독님! 라커룸 문 열어 뒀어요. 오늘도 같이 이겨 봐요!',
  seojian: '감독님, 오늘 상대 분석은 끝내 두었습니다. 들어오시죠.',
  baeksoyeon: '어서 오세요, 감독님. 오늘 보상 정산은 제가 챙겨 두었어요.',
}

export interface AssistantSpeech {
  text: string
  expression: string
}

const MODE_KEY = 'cs.assistantMode'
const QUIET_KEY = 'cs.assistantQuiet'

/** The art mode the player chose; 'open' until they pick otherwise (설정에서 바꿀 수 있음). */
export function loadAssistantMode(): AssistantMode {
  try {
    const raw = window.localStorage.getItem(MODE_KEY)
    return raw === 'safe' ? 'safe' : 'open'
  } catch {
    return 'open'
  }
}

export function saveAssistantMode(mode: AssistantMode): void {
  try {
    window.localStorage.setItem(MODE_KEY, mode)
  } catch {
    // Storage unavailable — the choice just does not persist.
  }
}

export function loadAssistantQuiet(): boolean {
  try {
    return window.localStorage.getItem(QUIET_KEY) === '1'
  } catch {
    return false
  }
}

export function saveAssistantQuiet(quiet: boolean): void {
  try {
    window.localStorage.setItem(QUIET_KEY, quiet ? '1' : '0')
  } catch {
    // ignore
  }
}

/** What the assistant can look at when choosing a line. */
export interface AssistantContext {
  tab: string
  state: GameState
  /** Empty or injured starting slots, from the squad screen's own check. */
  squadGaps?: { empty: number; injured: number }
  /** KST hour, for greetings and the 핫타임 nudge. */
  hourKst: number
  /** Whether the next weekly kick-off (top of the hour) is a 핫타임 one. */
  nextKickoffHotTime?: boolean
  /** Unclaimed weekly rewards, if known. */
  unclaimedRewards?: number
  /** KST minute of the hour, for the "N분 뒤 킥오프" nudge. */
  minuteKst?: number
  /** Wall clock, so a just-finished match is briefed only while it is fresh. */
  nowMs?: number
}

/** How long a finished match stays "just now" for the assistant's briefing. */
export const BRIEFING_WINDOW_MS = 10 * 60_000
/** Weekly slots kick off every hour on the hour, 09:00–23:00 KST. */
const WEEKLY_KICKOFF_HOURS_KST = { first: 9, last: 23 }

/** Minutes until the next weekly kick-off if one is within the nudge window, else null. */
export function minutesToNextKickoff(hourKst: number, minuteKst: number | undefined): number | null {
  if (minuteKst === undefined || minuteKst < 50) return null
  const nextHour = hourKst + 1
  if (nextHour < WEEKLY_KICKOFF_HOURS_KST.first || nextHour > WEEKLY_KICKOFF_HOURS_KST.last) return null
  return 60 - minuteKst
}

/** The latest match if it ended within the briefing window. */
export function freshResult(state: GameState, nowMs: number | undefined): GameState['history'][number] | null {
  const latest = state.history[0]
  if (!latest || nowMs === undefined) return null
  return nowMs - latest.at <= BRIEFING_WINDOW_MS ? latest : null
}

const COMPETITION_LABEL: Record<GameState['history'][number]['competition'], string> = {
  league: '리그',
  cup: '컵',
  friendly: '친선',
  pvp: 'PvP',
}

function briefing(state: GameState, nowMs: number | undefined): AssistantSpeech | null {
  const match = freshResult(state, nowMs)
  if (!match) return null
  const score = `${match.scoreFor}:${match.scoreAgainst}`
  const label = COMPETITION_LABEL[match.competition]
  if (match.result === 'W') {
    const big = match.scoreFor - match.scoreAgainst >= 3
    return {
      text: big
        ? `${label} ${match.opponent}전 ${score} 대승이에요! 이런 날은 저도 신나요. 보상 ${match.reward.toLocaleString('ko-KR')}G 챙겼어요.`
        : `${label} ${match.opponent}전 ${score} 승리! 봤어요 감독님, 딱 필요한 만큼 이겼어요. +${match.reward.toLocaleString('ko-KR')}G.`,
      expression: 'determined',
    }
  }
  if (match.result === 'D') {
    return { text: `${label} ${match.opponent}전은 ${score} 무승부… 아쉽지만 지진 않았어요. 다음 경기에서 갚아 줘요!`, expression: 'soft' }
  }
  return {
    text:
      match.scoreAgainst - match.scoreFor >= 3
        ? `${label} ${match.opponent}전 ${score}… 오늘은 상대가 강했어요. 스쿼드 컨디션부터 같이 볼까요?`
        : `${label} ${match.opponent}전 ${score}로 졌어요. 한 골 차예요, 다음엔 뒤집을 수 있어요.`,
    expression: 'sad',
  }
}

function timeGreeting(hour: number): string {
  if (hour < 5) return '이 시간까지 클럽을 지키시네요.'
  if (hour < 11) return '좋은 아침이에요!'
  if (hour < 14) return '점심은 드셨어요?'
  if (hour < 18) return '오후도 힘내요!'
  return '오늘도 수고하셨어요.'
}

function dailyOf(state: GameState): DailyState {
  return state.daily
}

/** Deterministic pick so the line does not flicker between renders in the same hour. */
function pick<T>(items: T[], seed: number): T {
  return items[Math.abs(seed) % items.length]
}

function hanareum(ctx: AssistantContext): AssistantSpeech {
  const daily = dailyOf(ctx.state)
  const seed = ctx.hourKst + ctx.state.record.w
  // A match that just ended is the one thing worth talking about, on any of her screens.
  const brief = briefing(ctx.state, ctx.nowMs)
  if (brief) return brief
  if (ctx.tab === 'match') {
    if (casualModeLocked(daily)) {
      return { text: '감독님, 오늘 캐주얼 시즌은 끝났어요! 골드는 경쟁 리그에서 벌어 볼까요? 저도 볼게요.', expression: 'soft' }
    }
    if (ctx.state.season.finished) return { text: '시즌이 끝났어요! 새 시즌 시작 버튼 눌러 주세요, 다음 시즌은 더 잘할 거예요.', expression: 'determined' }
    return {
      text: pick(
        [
          `리그 ${ctx.state.season.round + 1}라운드예요. 오늘도 이겨 봐요!`,
          '경기 전에 스쿼드 한 번만 봐 주세요 — 지친 선수가 있으면 제가 알려 드릴게요.',
          '전술 바꾸실 거면 경기가 멈출 때 눌러야 바로 들어가요. 제가 옆에서 볼게요!',
        ],
        seed,
      ),
      expression: 'base',
    }
  }
  if (ctx.tab === 'pvp') {
    const left = pvpMatchesLeft(daily)
    if (left <= 0) return { text: '오늘 PvP는 다 썼어요! 내일 또 도전해요. 상대는 제가 미리 찾아 둘게요.', expression: 'soft' }
    return { text: `데일리 PvP ${left}회 남았어요! 진짜 감독님이랑 붙는 거라 두근두근해요.`, expression: 'determined' }
  }
  // home
  const friendlies = miniGamesLeft(daily)
  const parts = [timeGreeting(ctx.hourKst)]
  let expression = 'base'
  if (ctx.squadGaps && (ctx.squadGaps.empty > 0 || ctx.squadGaps.injured > 0)) {
    expression = ctx.squadGaps.empty > 0 ? 'surprised' : 'sad'
    parts.push(
      ctx.squadGaps.empty > 0
        ? `앗, 선발에 빈 자리가 ${ctx.squadGaps.empty}개 있어요… 스쿼드 탭에서 자동 배치 한 번 눌러 볼까요?`
        : `선발에 부상 선수가 ${ctx.squadGaps.injured}명 있어요. 치료하거나 바꿔 주세요!`,
    )
  } else if (minutesToNextKickoff(ctx.hourKst, ctx.minuteKst) !== null) {
    const left = minutesToNextKickoff(ctx.hourKst, ctx.minuteKst)
    parts.push(
      ctx.nextKickoffHotTime
        ? `${left}분 뒤 🔥 핫타임 킥오프예요! 경쟁 리그 탭에서 입장하면 보너스 골드까지 챙겨요.`
        : `${left}분 뒤 경쟁 리그 킥오프예요. 3분 전부터 입장할 수 있어요!`,
    )
    expression = 'determined'
  } else if (ctx.nextKickoffHotTime) {
    parts.push('다음 정각은 🔥 핫타임 경기예요! 3분 전에 입장해서 지시 하나만 내려도 보너스 골드예요.')
    expression = 'determined'
  } else if (friendlies > 0) {
    parts.push(`친선 경기 ${friendlies}판 남았어요. 가볍게 한 판 어때요?`)
  } else {
    parts.push('오늘 할 일은 다 했네요! 경쟁 리그 다음 경기 시간 확인해 볼까요?')
    expression = 'soft'
  }
  return { text: parts.join(' '), expression }
}

function seojian(ctx: AssistantContext): AssistantSpeech {
  const seed = ctx.hourKst + ctx.state.cards.length
  if (ctx.squadGaps && ctx.squadGaps.empty > 0) {
    return { text: `선발 ${ctx.squadGaps.empty}자리가 비어 있습니다. 이대로는 경기가 시작되지 않습니다.`, expression: 'frown' }
  }
  if (ctx.squadGaps && ctx.squadGaps.injured > 0) {
    return { text: `선발에 부상 ${ctx.squadGaps.injured}명. 컨디션 수치가 아니라 결장입니다 — 교체하십시오.`, expression: 'frown' }
  }
  if (ctx.tab === 'club') {
    return {
      text: pick(
        [
          `보유 카드 ${ctx.state.cards.length}장. 같은 클럽·리그로 정렬하면 팀컬러 조건이 한눈에 보입니다.`,
          '강화는 선발 11명에 집중하는 편이 효율적입니다. 벤치는 나중입니다.',
          '히든 능력치는 카드 앞면에 없습니다. 같은 종합이라도 경기에서는 다른 선수입니다.',
        ],
        seed,
      ),
      expression: seed % 3 === 0 ? 'smile' : 'base',
    }
  }
  return {
    text: pick(
      [
        '포메이션 슬롯 밖의 포지션에 선 선수는 평점이 크게 깎입니다. 위치를 확인하십시오.',
        '팀컬러 보너스는 같은 클럽 3명부터 붙습니다. 지금 배치에서 확인해 보십시오.',
        '자동 배치는 종합만 봅니다. 팀컬러까지 맞추려면 직접 배치가 낫습니다.',
      ],
      seed,
    ),
    expression: 'base',
  }
}

function baeksoyeon(ctx: AssistantContext): AssistantSpeech {
  const seed = ctx.hourKst + Math.floor(ctx.state.gold / 1000)
  if (ctx.tab === 'weekly') {
    if ((ctx.unclaimedRewards ?? 0) > 0) {
      return { text: `받지 않은 보상이 ${ctx.unclaimedRewards!.toLocaleString('ko-KR')}G 있어요. 챙겨 두세요 — 안 받는다고 늘진 않아요.`, expression: 'surprised' }
    }
    const left = minutesToNextKickoff(ctx.hourKst, ctx.minuteKst)
    if (left !== null && left <= 3) return { text: `${left}분 뒤 킥오프. 지금 입장하면 라인업과 히든 카드를 낼 수 있어요.`, expression: 'serious' }
    if (ctx.nextKickoffHotTime) return { text: '다음 정각이 핫타임이에요. 3분 전에 들어가서 라인업만 잘 내도 반은 한 겁니다.', expression: 'serious' }
    return {
      text: pick(
        [
          '경쟁 리그 첫 경기는 원래 다 떨려요. 라인업만 제대로 냈으면 반은 한 겁니다.',
          '히든 카드는 킥오프 전에만 씁니다. 조건 맞는 경기에 아껴 두세요.',
          '한 주 끝나면 순위 보상으로 히든 카드가 옵니다. 컵 결승도요.',
        ],
        seed,
      ),
      expression: 'base',
    }
  }
  if (ctx.tab === 'market') {
    return ctx.state.gold < 2000
      ? { text: '골드가 좀 헐렁하네요. 이적시장은 내일 봐도 안 늦어요.', expression: 'serious' }
      : {
          text: pick(['매물은 매일 바뀝니다. 오늘 없는 선수는 내일 있을 수도 있어요.', '갱신권 남발하면 금방 빈털터리예요. 하루 한 번이면 충분해요.'], seed),
          expression: 'base',
        }
  }
  // items
  return {
    text: pick(
      [
        '히든 카드는 상점에서도 삽니다. 조건 맞는 경기 하나 정해 두고 사세요.',
        '치료 키트는 결장 경기 수와 상관없이 낫게 해요. 주력 선수에게만 쓰세요.',
        `골드 ${ctx.state.gold.toLocaleString('ko-KR')}. 오늘은 여기까지가 좋겠네요.`,
      ],
      seed,
    ),
    expression: 'base',
  }
}

export function assistantSpeech(id: AssistantId, ctx: AssistantContext): AssistantSpeech {
  if (id === 'hanareum') return hanareum(ctx)
  if (id === 'seojian') return seojian(ctx)
  return baeksoyeon(ctx)
}

/** The line alone — for callers that do not show a face. */
export function assistantLine(id: AssistantId, ctx: AssistantContext): string {
  return assistantSpeech(id, ctx).text
}
