import { getSupabase } from './supabase'

/**
 * Asks the server to settle any of this group's fixtures whose kick-off time
 * has passed but that are still pending, with the real match engine —
 * docs/WEEKLY_LIVE_MATCH_DESIGN.md, 대안 B. Called when the weekly screen
 * opens, before the fixture list is read, so what the manager sees is
 * already settled. Failure is quiet: the 5-minute safety-net cron and the
 * next visitor will get to it.
 */
export async function catchUpWeeklyGroup(groupId: number): Promise<number> {
  const supabase = getSupabase()
  if (!supabase) return 0
  try {
    const { data, error } = await supabase.functions.invoke('weekly-fixture-live', {
      body: { action: 'catch_up_group', groupId },
    })
    if (error) return 0
    const body = data as { ok?: boolean; settled?: number } | null
    return body?.ok ? body.settled ?? 0 : 0
  } catch {
    return 0
  }
}
