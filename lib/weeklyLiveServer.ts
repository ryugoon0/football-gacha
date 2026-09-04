/**
 * The server-usable surface for judging weekly fixtures with the real match
 * engine, bundled by scripts/bundle-functions.mjs into
 * supabase/functions/weekly-fixture-live/shared.js.
 *
 * Same pattern as lib/serverMatch.ts: the Edge Function imports exactly this,
 * so the engine that settles a weekly fixture is provably the code the game
 * plays casual matches and Daily PvP with.
 */
export { ENGINE_VERSION, runToEnd, toResult } from './matchEngine'
export { buildWeeklyMatchSetup, kickoffSquadOf, starterAverageOf, weeklyAiAnchor, weeklyAiSquad } from './weeklyLeague/liveMatch'
export { TIERS } from './weeklyLeague/config'
export { rewardsForFixture } from './weeklyLeague/rewards'
export { TACTIC_CARDS, isTacticCardId } from './weeklyLeague/tacticCards'
export { evaluateSquad } from './squad'
export {
  LIVE_WINDOW_SECONDS,
  lineupViewOf,
  liveWindowEnded,
  matchMinuteAt,
  publicStateOf,
  replayFixture,
  scorersOf,
  disciplineOf,
} from './weeklyLeague/liveReplay'
export { getPlayer } from './players'
export { setTuning, KNOB_KEYS } from './tuning'
