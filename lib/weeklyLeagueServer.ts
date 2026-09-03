/**
 * The server-usable surface of the weekly tournament system, bundled by
 * scripts/bundle-functions.mjs into
 * supabase/functions/generate-placement-league/shared.js.
 *
 * Same pattern as lib/serverMatch.ts: the Edge Function imports exactly this,
 * so the schedule the server writes to the database is provably the same
 * code that lib/weeklyLeague's own tests already verify.
 */
export { CLUB_POOL } from './league'
export {
  CLUB_COUNT,
  TRANSITION_SCHEDULE,
  PLACEMENT_ROUNDS,
  type TransitionSchedule,
} from './weeklyLeague/config'
export { buildPlacementSlots, generatePlacementFixtures, type PlacementFixtureDef } from './weeklyLeague/placement'
export {
  toPlacementFixtureRows,
  toPlacementScheduleSlotRows,
  type LeagueFixtureRow,
  type MemberInput,
  type ScheduleSlotRow,
} from './weeklyLeague/persistence'
