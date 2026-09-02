'use client'

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
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

export interface AdminState {
  isAdmin: boolean
  checked: boolean
}

/**
 * The answer, shared.
 *
 * Five screens ask whether the account is an operator, and each of them used to
 * ask the database itself — five round trips for one boolean, repeated every
 * time a tab mounted. Worse, a screen that forgot to ask simply showed operator
 * content to everybody. Asking once at the top and reading it from context
 * fixes both.
 */
const AdminContext = createContext<AdminState>({ isAdmin: false, checked: false })

export function AdminProvider({ value, children }: { value: AdminState; children: ReactNode }) {
  const { isAdmin, checked } = value
  const stable = useMemo(() => ({ isAdmin, checked }), [isAdmin, checked])
  return <AdminContext.Provider value={stable}>{children}</AdminContext.Provider>
}

/** False until the check comes back, so nothing operator-only flashes on load. */
export function useIsAdmin(): AdminState {
  return useContext(AdminContext)
}
