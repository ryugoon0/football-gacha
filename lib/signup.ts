/**
 * Reading what Supabase says after a sign-up attempt.
 *
 * The awkward case is an email that is already registered. With email
 * confirmation on, Supabase deliberately answers as if the sign-up worked —
 * that is how it avoids telling a stranger which addresses have accounts — but
 * it leaves `identities` empty. Without that check the person is told a mail is
 * on the way and then waits for one that will never come.
 */

export interface SignUpAnswer {
  session: unknown | null
  user: { identities?: unknown[] | null } | null
}

export type SignUpOutcome =
  /** Confirmation is off: the account exists and is already signed in. */
  | { kind: 'signedIn' }
  /** A confirmation mail went out. */
  | { kind: 'checkMail' }
  /** The address already has an account. */
  | { kind: 'alreadyRegistered' }

export function signUpOutcome(answer: SignUpAnswer): SignUpOutcome {
  if (answer.session) return { kind: 'signedIn' }
  const identities = answer.user?.identities
  if (Array.isArray(identities) && identities.length === 0) {
    return { kind: 'alreadyRegistered' }
  }
  return { kind: 'checkMail' }
}

export const SIGN_UP_MESSAGE: Record<Exclude<SignUpOutcome['kind'], 'signedIn'>, string> = {
  checkMail:
    '가입 확인 메일을 보냈습니다. 메일의 링크를 누른 뒤 로그인해 주세요. 몇 분 안에 오지 않으면 스팸함도 확인해 보세요.',
  alreadyRegistered:
    '이미 가입된 이메일입니다. 로그인 탭에서 로그인해 주세요. 확인 메일을 못 받으셨다면 아래 다시 보내기를 눌러 주세요.',
}
