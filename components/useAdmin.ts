'use client'

import { useEffect, useState } from 'react'
import { getSupabase } from '../lib/supabase'
import type { AccountApi } from './useAccountSync'

/**
 * Whether the signed-in account is an operator.
 *
 * The answer comes from the `admins` table, which nobody can insert into from
 * the app. This hook only decides what the screen shows — every operator
 * action is checked again by row level security on the server, so hiding or
 * revealing the tab is never what keeps the door shut.
 */
export function useAdmin(account: AccountApi): { isAdmin: boolean; checked: boolean } {
  const [isAdmin, setIsAdmin] = useState(false)
  const [checked, setChecked] = useState(false)
  const userId = account.user?.id ?? null

  useEffect(() => {
    const supabase = getSupabase()
    if (!supabase || !userId) {
      setIsAdmin(false)
      setChecked(true)
      return
    }
    let live = true
    setChecked(false)
    supabase
      .from('admins')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (!live) return
        setIsAdmin(Boolean(data))
        setChecked(true)
      })
    return () => {
      live = false
    }
  }, [userId])

  return { isAdmin, checked }
}
