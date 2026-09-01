'use client'

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

/**
 * The game works with no server at all — accounts, cloud saves and the board
 * only switch on once these two public keys are set. Everything that touches
 * Supabase must handle a null client.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(URL && ANON_KEY)
}

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
  ]
  for (const [test, text] of table) if (test.test(message)) return text
  return message
}
