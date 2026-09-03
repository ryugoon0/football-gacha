/**
 * The server-usable surface of the match engine, bundled by
 * scripts/bundle-functions.mjs into supabase/functions/simulate-match/shared.js.
 *
 * Kept as one small file, the same pattern lib/gacha.ts already set for
 * draw-pack: the Edge Function imports exactly this, nothing more, so what
 * runs on the server and what runs in the browser are provably the same
 * code — no second implementation to drift out of sync.
 */
export { ENGINE_VERSION, runToEnd, toResult, type MatchSetup } from './matchEngine'
export { evaluateSquad, missingSlots, lineupCapOf, type SquadRating } from './squad'
export { matchReward, MINI_GAME_REWARD } from './match'
export { DEFAULT_TACTIC } from './tactics'
export { setTuning, tune, KNOB_KEYS } from './tuning'
