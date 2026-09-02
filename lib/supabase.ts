'use client'

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * The dashboard shows several forms of the same address — the project URL, the
 * REST endpoint, sometimes with a trailing slash. supabase-js wants the bare
 * project URL, so trim the rest instead of failing on a copy-paste.
 */
export function normalizeSupabaseUrl(value: string | undefined): string {
  if (!value) return ''
  const trimmed = value.trim().replace(/\/+$/, '')
  if (!trimmed) return ''
  const withScheme = /^https?:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`
  return withScheme.replace(/\/(rest|auth|storage|realtime)\/v\d+$/, '')
}

const URL = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL)
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

/**
 * The game works with no server at all — accounts, cloud saves and the board
 * only switch on once these two public keys are set. Everything that touches
 * Supabase must handle a null client.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(URL && ANON_KEY)
}

/**
 * Which half of the setup is missing. Both values are inlined at build time and
 * are set per environment, so a Preview build can easily end up with one of them.
 */
export function configStatus(): { url: boolean; key: boolean; message: string | null } {
  const url = Boolean(URL)
  const key = Boolean(ANON_KEY)
  if (url && key) return { url, key, message: null }
  if (url && !key) {
    return {
      url,
      key,
      message:
        'NEXT_PUBLIC_SUPABASE_URL은 있는데 NEXT_PUBLIC_SUPABASE_ANON_KEY가 없습니다. Vercel 환경 변수에서 키를 이 환경(Preview 포함)에도 추가하고 재배포해 주세요.',
    }
  }
  if (!url && key) {
    return {
      url,
      key,
      message:
        'NEXT_PUBLIC_SUPABASE_ANON_KEY는 있는데 NEXT_PUBLIC_SUPABASE_URL이 없습니다. Vercel 환경 변수에서 주소를 이 환경(Preview 포함)에도 추가하고 재배포해 주세요.',
    }
  }
  return {
    url,
    key,
    message:
      '이 빌드에는 NEXT_PUBLIC_SUPABASE_URL과 NEXT_PUBLIC_SUPABASE_ANON_KEY가 둘 다 없습니다. 두 변수를 이 환경(브랜치 미리보기는 Preview)에 추가한 뒤 새로 배포해야 합니다 — 값은 빌드할 때 페이지에 박히므로, 이미 만들어진 배포는 변수를 추가해도 바뀌지 않습니다.',
  }
}

export { BUILD_REF, BUILD_TIME, buildLabel, buildStamp } from './build'

let client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient | null {
  if (!URL || !ANON_KEY) return null
  if (!client) {
    client = createClient(URL, ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  }
  return client
}

/** Turns a Supabase error into something worth showing a player. */
export function friendlyError(message: string): string {
  const table: [test: RegExp, text: string][] = [
    [/Invalid login credentials/i, '이메일 또는 비밀번호가 맞지 않습니다.'],
    [/User already registered/i, '이미 가입된 이메일입니다. 로그인해 주세요.'],
    [/Password should be at least/i, '비밀번호는 6자 이상이어야 합니다.'],
    [/Unable to validate email/i, '이메일 형식을 확인해 주세요.'],
    [/Email rate limit|rate limit/i, '요청이 너무 잦습니다. 잠시 후 다시 시도해 주세요.'],
    [/Failed to fetch|NetworkError/i, '서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.'],
    [
      /put_save|permission denied for table saves/i,
      '계정 저장 설정이 최신이 아닙니다. supabase/schema.sql을 다시 실행해 주세요.',
    ],
  ]
  for (const [test, text] of table) if (test.test(message)) return text
  return message
}

/**
 * A one-shot check a player can run when something is not working: does the
 * browser reach the project, and are the tables and permissions in place.
 */
export async function checkConnection(): Promise<{ ok: boolean; message: string }> {
  const supabase = getSupabase()
  if (!supabase) {
    return { ok: false, message: '키가 설정되지 않았습니다 (NEXT_PUBLIC_SUPABASE_URL / ANON_KEY).' }
  }
  try {
    const { error } = await supabase.from('posts').select('id').limit(1)
    if (!error) return { ok: true, message: `서버 연결 정상 · ${URL}` }
    if (/relation .* does not exist|schema cache/i.test(error.message)) {
      return { ok: false, message: 'posts 테이블이 없습니다. supabase/schema.sql을 실행해 주세요.' }
    }
    if (/JWT|api key|Invalid/i.test(error.message)) {
      return { ok: false, message: '키가 올바르지 않습니다. anon(publishable) 키를 확인해 주세요.' }
    }
    return { ok: false, message: friendlyError(error.message) }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { ok: false, message: friendlyError(message) }
  }
}

/**
 * put_save refused the upload. The reason it returns is written for an
 * operator reading the audit, not for the person holding the phone, so it is
 * translated here and the raw text is kept out of the screen.
 */
export function rejectionMessage(reason?: string): string {
  if (reason === 'not signed in') return '로그인이 풀렸습니다. 다시 로그인해 주세요.'
  if (reason === 'save too large') {
    return '세이브가 너무 커서 계정에 저장하지 못했습니다. 보관함을 정리해 주세요.'
  }
  return '이 진행 상황은 정상적인 플레이로 만들 수 없는 값이어서 계정에 저장하지 않았습니다. 문의해 주세요.'
}
