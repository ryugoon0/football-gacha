'use client'

import { clearSave } from '../lib/storage'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  isSaveTooBig,
  planSync,
  progressScore,
  readCloudSave,
  type CloudSave,
} from '../lib/cloudSave'
import { SUPABASE_REST, friendlyError, getSupabase, isSupabaseConfigured, rejectionMessage } from '../lib/supabase'
import { seedEconomy } from '../lib/serverDraw'
import { SIGN_UP_MESSAGE, signUpOutcome } from '../lib/signup'
import { reducer } from '../lib/gameReducer'
import { DEFAULT_CLUB } from '../lib/storage'
import type { GameState } from '../lib/types'

/** The club name a sign-up put in the auth metadata, if it is a usable string. */
function metaClub(user: { user_metadata?: Record<string, unknown> | null }): string | undefined {
  const club = user.user_metadata?.club
  return typeof club === 'string' && club.trim().length > 0 ? club.trim() : undefined
}

export type AccountStatus = 'off' | 'loading' | 'signedOut' | 'signedIn'

export interface AccountUser {
  id: string
  email: string
  /** The club name chosen at sign-up (auth metadata), if any. */
  club?: string
}

export interface AccountApi {
  /** False until the Supabase keys are set, and the game stays local only. */
  configured: boolean
  status: AccountStatus
  user: AccountUser | null
  error: string | null
  notice: string | null
  /** A cloud save that clashes with real progress in this browser. */
  conflict: CloudSave | null
  syncing: boolean
  signUp: (email: string, password: string, club?: string) => Promise<void>
  /** Sends the confirmation mail again. */
  resendConfirmation: (email: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  /** Sends a link that lets someone set a new password. */
  resetPassword: (email: string) => Promise<void>
  /**
   * True after arriving from a reset link. The game stays hidden until a new
   * password is set, so nobody is left signed in on a link they cannot repeat.
   */
  recovering: boolean
  setNewPassword: (password: string) => Promise<void>
  signOut: () => Promise<void>
  /** Deletes the account and everything stored under it on the server, then signs out. */
  deleteAccount: () => Promise<{ ok: true } | { ok: false; reason: string }>
  resolveConflict: (choice: 'useLocal' | 'useCloud') => Promise<void>
  clearMessages: () => void
  /**
   * Write the save to the cloud right now instead of after the usual pause —
   * for the moment gold or items the server already granted land in the save
   * (선물·보상 수령), so a refresh a second later cannot lose them.
   */
  saveNow: () => Promise<void>
}

/** Wait this long after the last change before writing the save to the cloud. */
const UPLOAD_DEBOUNCE_MS = 4000

export function useAccountSync(
  state: GameState,
  hydrate: (state: GameState) => void,
  ready: boolean,
): AccountApi {
  const configured = isSupabaseConfigured()
  const [status, setStatus] = useState<AccountStatus>(configured ? 'loading' : 'off')
  const [user, setUser] = useState<AccountUser | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [conflict, setConflict] = useState<CloudSave | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [recovering, setRecovering] = useState(false)

  const stateRef = useRef(state)
  stateRef.current = state
  const hydrateRef = useRef(hydrate)
  hydrateRef.current = hydrate
  // Uploads pause while a conflict is on screen, so nothing is overwritten.
  const holdRef = useRef(false)
  const signedInFor = useRef<string | null>(null)
  // The saves.revision this browser last confirmed as current — either by
  // fetching the cloud row or by a put_save that succeeded. Sent back as
  // p_base_revision so the server can tell whether another tab or device
  // wrote since. Null means "unknown", which skips the check server-side
  // (a brand-new account, or a browser that hasn't talked to put_save yet).
  const revisionRef = useRef<number | null>(null)

  const fetchCloud = useCallback(async (userId: string): Promise<CloudSave | null> => {
    const supabase = getSupabase()
    if (!supabase) return null
    const { data, error: queryError } = await supabase
      .from('saves')
      .select('data, updated_at, revision')
      .eq('user_id', userId)
      .maybeSingle()
    if (queryError || !data?.data) return null
    // Never hand a raw row to the game: validate and migrate it first.
    return readCloudSave(
      data.data,
      data.updated_at as string,
      (data as { revision?: number | null }).revision,
    )
  }, [])

  // Move an existing player onto the server ledger once. After this the ledger
  // is the truth for gold; before it, the save still is.
  useEffect(() => {
    if (status !== 'signedIn' || !user || !ready) return
    void seedEconomy(stateRef.current.gold, stateRef.current.pity)
    // Seeding is once per account; it must not re-run as the save changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, user, ready])

  const upload = useCallback(
    async (userId: string, value: GameState) => {
      const supabase = getSupabase()
      if (!supabase) return
      if (isSaveTooBig(value)) {
        setError('세이브가 너무 커서 계정에 저장하지 못했습니다. 보관함을 정리해 주세요.')
        return
      }
      setSyncing(true)
      // Saves go through put_save, never straight into the table: the server
      // judges the state, records the attempt either way, and only then writes.
      // p_base_revision lets it notice a tab uploading a state that was
      // already superseded by another tab or device before this write lands.
      const { data, error: writeError } = await supabase.rpc('put_save', {
        p_data: value,
        p_base_revision: revisionRef.current,
      })
      setSyncing(false)
      if (writeError) {
        setError(friendlyError(writeError.message))
        return
      }
      const result = data as { ok?: boolean; reason?: string; revision?: number } | null
      if (result && result.ok === false) {
        if (result.reason === 'stale_save_revision') {
          // Another tab or device saved first. This is not a rejection the
          // player did anything wrong to cause, so it is handled quietly:
          // pick up whatever is now on the server rather than show an error.
          const cloud = await fetchCloud(userId)
          if (cloud) {
            revisionRef.current = cloud.revision ?? revisionRef.current
            if (progressScore(cloud.state) >= progressScore(value)) {
              hydrateRef.current(cloud.state)
              setNotice('다른 탭이나 기기의 최신 진행 상황을 불러왔습니다.')
            } else {
              // The server is ahead in revision but behind in progress, which
              // put_save's own checks should prevent — surface it as a
              // conflict rather than silently pick a side.
              holdRef.current = true
              setConflict(cloud)
            }
          }
          return
        }
        setError(rejectionMessage(result.reason))
        return
      }
      if (typeof result?.revision === 'number') revisionRef.current = result.revision
    },
    [fetchCloud],
  )

  // Follow the Supabase session: sign in, sign out, token refresh.
  useEffect(() => {
    const supabase = getSupabase()
    if (!supabase) return

    let alive = true
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return
      const session = data.session
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email ?? '', club: metaClub(session.user) })
        setStatus('signedIn')
      } else {
        setStatus('signedOut')
      }
    })

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      // Arriving from a reset link signs the person in, but only so they can
      // choose a new password. Hold that state until they do.
      if (event === 'PASSWORD_RECOVERY') setRecovering(true)
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email ?? '', club: metaClub(session.user) })
        setStatus('signedIn')
      } else {
        setUser(null)
        setStatus('signedOut')
        signedInFor.current = null
      }
    })

    return () => {
      alive = false
      listener.subscription.unsubscribe()
    }
  }, [])

  // First moment after signing in: reconcile this browser with the cloud.
  useEffect(() => {
    if (!ready || status !== 'signedIn' || !user) return
    if (signedInFor.current === user.id) return
    signedInFor.current = user.id

    let alive = true
    ;(async () => {
      setSyncing(true)
      const cloud = await fetchCloud(user.id)
      if (!alive) return
      if (cloud) revisionRef.current = cloud.revision ?? revisionRef.current
      const plan = planSync(stateRef.current, cloud)
      if (plan.needsPrompt && cloud) {
        holdRef.current = true
        setConflict(cloud)
        setSyncing(false)
        return
      }
      if (plan.choice === 'useCloud' && cloud) {
        hydrateRef.current(cloud.state)
        setNotice('클라우드 세이브를 불러왔습니다.')
        setSyncing(false)
        return
      }
      // A first login on a device other than the one that signed up: the club
      // name from sign-up applies to the fresh save before it goes to the cloud.
      if (!cloud && user.club && stateRef.current.club === DEFAULT_CLUB) {
        const named = reducer(stateRef.current, { type: 'renameClub', club: user.club })
        hydrateRef.current(named)
        await upload(user.id, named)
      } else {
        await upload(user.id, stateRef.current)
      }
      setNotice('이 브라우저의 진행 상황을 계정에 저장했습니다.')
    })()

    return () => {
      alive = false
    }
  }, [ready, status, user, fetchCloud, upload])

  // Keep the cloud copy current, a few seconds after the last change.
  // `dirtyRef` remembers that a change is still waiting, so the page-hide
  // flush below knows whether there is anything to send.
  const dirtyRef = useRef(false)
  useEffect(() => {
    if (status !== 'signedIn' || !user || holdRef.current || !ready) return
    dirtyRef.current = true
    const timer = window.setTimeout(() => {
      dirtyRef.current = false
      void upload(user.id, stateRef.current)
    }, UPLOAD_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [state, status, user, ready, upload])

  const saveNow = useCallback(async () => {
    if (status !== 'signedIn' || !user || holdRef.current || !ready) return
    dirtyRef.current = false
    await upload(user.id, stateRef.current)
  }, [status, user, ready, upload])

  // A refresh or a closed tab inside the debounce window used to drop the last
  // change (a claimed gift, a finished match): the next sign-in read the older
  // cloud row. On page hide the pending save goes out with keepalive, which the
  // browser finishes even after the page is gone. Same RPC, same checks.
  useEffect(() => {
    if (status !== 'signedIn' || !user) return
    const flush = () => {
      const rest = SUPABASE_REST
      if (!dirtyRef.current || holdRef.current || !rest) return
      const supabase = getSupabase()
      if (!supabase) return
      dirtyRef.current = false
      const body = JSON.stringify({ p_data: stateRef.current, p_base_revision: revisionRef.current })
      void supabase.auth.getSession().then(({ data }) => {
        const token = data.session?.access_token
        if (!token) return
        void fetch(`${rest.url}/rest/v1/rpc/put_save`, {
          method: 'POST',
          keepalive: true,
          headers: { 'Content-Type': 'application/json', apikey: rest.anonKey, Authorization: `Bearer ${token}` },
          body,
        }).catch(() => {})
      })
    }
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush()
    }
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('pagehide', flush)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [status, user])

  const signUp = useCallback(async (email: string, password: string, club?: string) => {
    const supabase = getSupabase()
    if (!supabase) return
    setError(null)
    setSyncing(true)
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Without this the link in the mail points at the project's Site URL,
        // which is localhost until someone changes it — so the person clicks a
        // link that goes nowhere. Sending them back where they signed up works
        // from any deployment.
        emailRedirectTo: typeof window === 'undefined' ? undefined : window.location.origin,
        // The club name chosen at sign-up rides in the auth metadata so the
        // duplicate check can see it before the first save exists, and so a
        // first login on another device still gets the name.
        data: club ? { club } : undefined,
      },
    })
    setSyncing(false)
    if (signUpError) {
      setError(friendlyError(signUpError.message))
      return
    }
    const outcome = signUpOutcome(data)
    if (outcome.kind === 'signedIn') return
    if (outcome.kind === 'alreadyRegistered') setError(SIGN_UP_MESSAGE.alreadyRegistered)
    else setNotice(SIGN_UP_MESSAGE.checkMail)
  }, [])

  /** Sends the confirmation mail again. The first one is often lost or filtered. */
  const resendConfirmation = useCallback(async (email: string) => {
    const supabase = getSupabase()
    if (!supabase) return
    setError(null)
    setSyncing(true)
    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: typeof window === 'undefined' ? undefined : window.location.origin,
      },
    })
    setSyncing(false)
    if (resendError) {
      setError(friendlyError(resendError.message))
      return
    }
    setNotice('확인 메일을 다시 보냈습니다. 스팸함도 확인해 주세요.')
  }, [])

  const resetPassword = useCallback(async (email: string) => {
    const supabase = getSupabase()
    if (!supabase) return
    setError(null)
    setSyncing(true)
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      // Back to wherever they asked from, so the link works on any deployment.
      redirectTo: typeof window === 'undefined' ? undefined : window.location.origin,
    })
    setSyncing(false)
    if (resetError) {
      setError(friendlyError(resetError.message))
      return
    }
    // Said the same way whether or not the address has an account: telling a
    // stranger which emails are registered is not ours to give away.
    setNotice(
      '비밀번호 재설정 메일을 보냈습니다. 가입된 주소라면 곧 도착합니다. 스팸함도 확인해 주세요.',
    )
  }, [])

  const setNewPassword = useCallback(async (password: string) => {
    const supabase = getSupabase()
    if (!supabase) return
    setError(null)
    setSyncing(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setSyncing(false)
    if (updateError) {
      setError(friendlyError(updateError.message))
      return
    }
    setRecovering(false)
    setNotice('새 비밀번호로 바뀌었습니다.')
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const supabase = getSupabase()
    if (!supabase) return
    setError(null)
    setSyncing(true)
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    setSyncing(false)
    if (signInError) setError(friendlyError(signInError.message))
  }, [])

  const signOut = useCallback(async () => {
    const supabase = getSupabase()
    if (!supabase) return
    await supabase.auth.signOut()
    setNotice('로그아웃했습니다. 진행 상황은 이 브라우저에 그대로 남아 있습니다.')
  }, [])

  const deleteAccount = useCallback(async () => {
    const supabase = getSupabase()
    if (!supabase) return { ok: false as const, reason: 'offline' }
    const { data, error } = await supabase.rpc('delete_my_account')
    if (error) return { ok: false as const, reason: 'unavailable' }
    const body = data as { ok?: boolean; reason?: string } | null
    if (!body?.ok) return { ok: false as const, reason: body?.reason ?? 'unavailable' }
    // The server side is gone; this browser's copy goes too, so nothing is left behind.
    clearSave()
    await supabase.auth.signOut()
    setNotice('계정과 저장 데이터를 삭제했습니다.')
    return { ok: true as const }
  }, [])

  const resolveConflict = useCallback(
    async (choice: 'useLocal' | 'useCloud') => {
      if (!user) return
      const cloud = conflict
      setConflict(null)
      holdRef.current = false
      if (choice === 'useCloud' && cloud) {
        hydrateRef.current(cloud.state)
        revisionRef.current = cloud.revision ?? revisionRef.current
        setNotice('계정에 저장된 진행 상황을 불러왔습니다.')
        return
      }
      await upload(user.id, stateRef.current)
      setNotice('이 브라우저의 진행 상황으로 계정을 덮어썼습니다.')
    },
    [conflict, upload, user],
  )

  const clearMessages = useCallback(() => {
    setError(null)
    setNotice(null)
  }, [])

  return {
    configured,
    status,
    user,
    error,
    notice,
    conflict,
    syncing,
    signUp,
    resendConfirmation,
    resetPassword,
    recovering,
    setNewPassword,
    signIn,
    signOut,
    deleteAccount,
    resolveConflict,
    clearMessages,
    saveNow,
  }
}
