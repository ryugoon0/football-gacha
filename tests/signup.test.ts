import { describe, expect, it } from 'vitest'
import { SIGN_UP_MESSAGE, signUpOutcome } from '../lib/signup'
import { friendlyError } from '../lib/supabase'

describe('reading a sign-up answer', () => {
  it('is signed in already when confirmation is switched off', () => {
    expect(signUpOutcome({ session: { access_token: 'x' }, user: {} })).toEqual({ kind: 'signedIn' })
  })

  it('tells the truth about an address that already has an account', () => {
    // Supabase answers as if it worked, to avoid revealing who is registered,
    // but leaves identities empty. Without this the person waits for a mail
    // that will never arrive.
    expect(signUpOutcome({ session: null, user: { identities: [] } })).toEqual({
      kind: 'alreadyRegistered',
    })
    expect(SIGN_UP_MESSAGE.alreadyRegistered).toContain('이미 가입된')
  })

  it('says a mail is coming for a genuinely new address', () => {
    expect(signUpOutcome({ session: null, user: { identities: [{ id: 'a' }] } })).toEqual({
      kind: 'checkMail',
    })
    // The first mail is often filtered, so say where to look.
    expect(SIGN_UP_MESSAGE.checkMail).toContain('스팸함')
  })

  it('does not guess when Supabase sends no identities field at all', () => {
    expect(signUpOutcome({ session: null, user: {} })).toEqual({ kind: 'checkMail' })
    expect(signUpOutcome({ session: null, user: null })).toEqual({ kind: 'checkMail' })
  })
})

describe('sign-up errors a tester will actually hit', () => {
  it('explains the built-in mail limit rather than showing it raw', () => {
    expect(friendlyError('Email rate limit exceeded')).toContain('잠시 후')
  })

  it('explains a duplicate address reported as an error', () => {
    expect(friendlyError('User already registered')).toContain('이미 가입된')
  })

  it('explains a password the server refused', () => {
    expect(friendlyError('Password should be at least 6 characters')).toContain('6자')
  })
})
