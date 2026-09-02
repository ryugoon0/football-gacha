'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { isSaveTooBig, planSync, readCloudSave, type CloudSave } from '../lib/cloudSave'
import { friendlyError, getSupabase, isSupabaseConfigured, rejectionMessage } from '../lib/supabase'
import { seedEconomy } from '../lib/serverDraw'
import { SIGN_UP_MESSAGE, signUpOutcome } from '../lib/signup'
import type { GameState } from '../lib/types'

export type AccountStatus = 'off' | 'loading' | 'signedOut' | 'signedIn'

export interface AccountUser {
  id: string
  email: string
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
  signUp: (email: string, password: string) => Promise<void>
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
  resolveConflict: (choice: 'useLocal' | 'useCloud') => Promise<void>
  clearMessages: () => void
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

  const fetchCloud = useCallback(async (userId: string): Promise<CloudSave | null> => {
    const supabase = getSupabase()
    if (!supabase) return null
    const { data, error: queryError } = await supabase
      .from('saves')
      .select('data, updated_at')
      .eq('user_id', userId)
      .maybeSingle()
    if (queryError || !data?.data) return null
    // Never hand a raw row to the game: validate and migrate it first.
    return readCloudSave(data.data, data.updated_at as string)
  }, [])

  // Move an existing player onto the server ledger once. After this the ledger
  // is the truth for gold; before it, the save still is.
  useEffect(() => {
    if (status !== 'signedIn' || !user || !ready) return
    void seedEconomy(stateRef.current.gold, stateRef.current.pity)
    // Seeding is once per account; it must not re-run as the save changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, user, ready])

  const upload = useCallback(async (userId: string, value: GameState) => {
    const supabase = getSupabase()
    if (!supabase) return
    if (isSaveTooBig(value)) {
      setError('세이브가 너무 커서 계정에 저장하지 못했습니다. 보관함을 정리해 주세요.')
      return
    }
    setSyncing(true)
    // Saves go through put_save, never straight into the table: the server
    // judges the state, records the attempt either way, and only then writes.
    const { data, error: writeError } = await supabase.rpc('put_save', { p_data: value })
    setSyncing(false)
    if (writeError) {
      setError(friendlyError(writeError.message))
      return
    }
    const result = data as { ok?: boolean; reason?: string } | null
    if (result && result.ok === false) {
      setError(rejectionMessage(result.reason))
    }
  }, [])

  // Follow the Supabase session: sign in, sign out, token refresh.
  useEffect(() => {
    const supabase = getSupabase()
    if (!supabase) return

    let alive = true
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return
      const session = data.session
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email ?? '' })
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
        setUser({ id: session.user.id, email: session.user.email ?? '' })
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
      await upload(user.id, stateRef.current)
      setNotice('이 브라우저의 진행 상황을 계정에 저장했습니다.')
    })()

    return () => {
      alive = false
    }
  }, [ready, status, user, fetchCloud, upload])

  // Keep the cloud copy current, a few seconds after the last change.
  useEffect(() => {
    if (status !== 'signedIn' || !user || holdRef.current || !ready) return
    const timer = window.setTimeout(() => {
      void upload(user.id, stateRef.current)
    }, UPLOAD_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [state, status, user, ready, upload])

  const signUp = useCallback(async (email: string, password: string) => {
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

  const resolveConflict = useCallback(
    async (choice: 'useLocal' | 'useCloud') => {
      if (!user) return
      const cloud = conflict
      setConflict(null)
      holdRef.current = false
      if (choice === 'useCloud' && cloud) {
        hydrateRef.current(cloud.state)
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
    resolveConflict,
    clearMessages,
  }
}
