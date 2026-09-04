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
export { buildWeeklyMatchSetup, weeklyAiSquad } from './weeklyLeague/liveMatch'
export { setTuning, KNOB_KEYS } from './tuning'
