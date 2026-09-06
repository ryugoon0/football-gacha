import { getSupabase } from './supabase'

/**
 * 이용약관·개인정보처리방침 — the texts, their versions, and the consent
 * record. Bump a version when a text changes in a way people must re-agree
 * to; everyone signed in is then asked again once.
 *
 * The texts below are a working draft written for this game's actual shape
 * (email account, cloud save, gold and tickets, a board). Every [대괄호]
 * placeholder must be filled in before commercial launch, and the whole text
 * should be checked by a professional once.
 */

export const TERMS_VERSION = '2026-09-06'
export const PRIVACY_VERSION = '2026-09-06'

export const OPERATOR = {
  name: '플로우',
  representative: '유재혁',
  registration: '429-22-01537',
  mailOrder: '신고 준비 중',
  address: '인천광역시 검단구 이음1로 396',
  email: 'support@clubseason.kr',
  privacyOfficer: '유재혁 · support@clubseason.kr',
}

export interface LegalSection {
  title: string
  body: string[]
}

export const TERMS: LegalSection[] = [
  {
    title: '제1조 (목적)',
    body: [
      `이 약관은 ${OPERATOR.name}(이하 "회사")가 제공하는 축구 클럽 매니저 게임 「Club Season」(이하 "서비스")의 이용 조건과 절차, 회사와 이용자의 권리·의무를 정합니다.`,
    ],
  },
  {
    title: '제2조 (계정)',
    body: [
      '이용자는 이메일 주소로 계정을 만들고, 계정 정보를 스스로 관리합니다. 계정을 남에게 넘기거나 빌려줄 수 없습니다.',
      '만 14세 미만은 법정대리인의 동의가 있어야 가입할 수 있습니다.',
      '이용자는 언제든 계정 화면의 「계정 삭제(탈퇴)」로 계정과 서버에 저장된 데이터를 지울 수 있으며, 삭제된 데이터는 되돌릴 수 없습니다.',
    ],
  },
  {
    title: '제3조 (게임 재화와 아이템)',
    body: [
      '골드, 조각, 프리미엄 스카우트 티켓, 카드, 아이템은 서비스 안에서만 쓰이는 가상의 재화이며 현금이나 실물로 바꿀 수 없습니다.',
      '확률형 아이템(스카우트)의 등급별 확률, 보장, 천장은 서비스 안과 확률 안내 페이지(/odds)에 항상 공개하며, 뽑기는 그 확률대로 서버가 판정합니다.',
      '회사는 밸런스 조정을 위해 확률, 가격, 보상을 바꿀 수 있고, 바꾸면 공지합니다. 이미 지급된 재화는 회수하지 않습니다(부정 취득 제외).',
    ],
  },
  {
    title: '제4조 (유료 결제와 환불)',
    body: [
      '유료 상품의 가격과 내용은 결제 화면에 표시합니다. 미성년자의 결제는 법정대리인의 동의가 필요하며, 동의 없는 결제는 취소할 수 있습니다.',
      '구매한 재화를 쓰지 않았다면 구매일로부터 7일 안에 청약철회(환불)를 요청할 수 있습니다. 일부라도 사용한 재화, 이벤트·보상으로 받은 재화는 환불 대상이 아닙니다.',
      '환불 요청과 결제 문의는 support@clubseason.kr 로 받습니다. 앱 마켓을 통한 결제는 해당 마켓의 환불 정책을 따릅니다.',
    ],
  },
  {
    title: '제5조 (이용자의 의무와 제재)',
    body: [
      '다음 행위는 금지되며, 회사는 경고·게시물 삭제·이용 정지·계정 삭제로 제재할 수 있습니다: 세이브 데이터 조작이나 매크로 등 비정상 이용, 다른 이용자에 대한 욕설·비하·괴롭힘, 광고·도배, 타인의 개인정보 노출, 결제 사기.',
      '게시판의 글과 댓글은 신고할 수 있으며, 회사는 신고를 확인해 처리합니다.',
    ],
  },
  {
    title: '제6조 (지식재산과 이용자 콘텐츠)',
    body: [
      '서비스의 선수·클럽·리그 이름은 모두 창작된 가명입니다. 이용자가 자기 기기에만 저장해 쓰는 페이스팩·리네임팩 등 개인 설정은 이용자의 책임으로 만들고, 회사는 이를 배포하지 않습니다.',
      '이용자가 게시판에 올린 글의 권리는 이용자에게 있으며, 회사는 서비스 운영에 필요한 범위에서 이를 표시할 수 있습니다.',
    ],
  },
  {
    title: '제7조 (서비스 변경과 중단)',
    body: [
      '회사는 서비스의 내용을 바꾸거나, 점검·장애·사업상 이유로 서비스를 일시 중단할 수 있습니다. 서비스를 끝낼 때는 30일 전에 공지하고, 사용하지 않은 유료 재화는 관련 법에 따라 환불합니다.',
    ],
  },
  {
    title: '제8조 (책임의 한계)',
    body: [
      '회사는 천재지변, 통신 장애, 이용자의 귀책 사유로 생긴 손해에 책임지지 않습니다. 회사의 고의 또는 중대한 과실로 생긴 손해는 관련 법에 따라 책임집니다.',
    ],
  },
  {
    title: '제9조 (분쟁 해결)',
    body: ['이 약관은 대한민국 법을 따르며, 분쟁은 회사 소재지를 관할하는 법원에서 다룹니다. 이용자는 한국소비자원 등 분쟁조정기구에 조정을 신청할 수 있습니다.'],
  },
  {
    title: '부칙',
    body: [`이 약관은 ${TERMS_VERSION}부터 적용됩니다. 사업자: ${OPERATOR.name} · 대표 ${OPERATOR.representative} · 사업자등록번호 ${OPERATOR.registration} · 통신판매업 ${OPERATOR.mailOrder} · ${OPERATOR.address} · ${OPERATOR.email}`],
  },
]

export const PRIVACY: LegalSection[] = [
  {
    title: '1. 수집하는 개인정보와 목적',
    body: [
      '회원가입·로그인: 이메일 주소, 비밀번호(암호화 저장). 목적: 계정 식별, 비밀번호 재설정 메일 발송.',
      '서비스 이용: 게임 진행 데이터(클럽 이름, 카드, 재화, 라인업, 경기 기록), 게시판 글·댓글·신고·차단 기록, 접속 시각. 목적: 서비스 제공, 부정 이용 방지, 문의 처리.',
      '유료 결제 시: 결제 대행사가 처리하는 결제 정보(회사는 카드번호를 저장하지 않으며 주문 번호와 금액만 보관). 목적: 결제 처리, 환불, 세무 신고.',
    ],
  },
  {
    title: '2. 보유 기간',
    body: [
      '계정을 삭제(탈퇴)하면 위 정보를 즉시 지웁니다. 다만 전자상거래법 등 법령이 정한 기록(결제·환불 기록 5년, 소비자 불만·분쟁 처리 기록 3년)은 그 기간 동안 분리 보관합니다.',
      '1년 이상 접속하지 않은 계정은 사전 안내 후 분리 보관하거나 삭제할 수 있습니다.',
    ],
  },
  {
    title: '3. 처리 위탁과 국외 이전',
    body: [
      '서버·데이터베이스·인증: Supabase Inc.(미국) — 계정·게임 데이터 저장. 웹 호스팅: Vercel Inc.(미국). 이용자의 정보는 이 사업자들의 해외 서버에 저장·처리되며, 이는 서비스 제공을 위해 필요한 이전입니다. 이전을 원하지 않으면 서비스를 이용할 수 없습니다.',
      '결제 대행: [결제 대행사명] — 결제 처리. (유료 결제 도입 시 적용)',
    ],
  },
  {
    title: '4. 제3자 제공',
    body: ['법령에 따른 요청이 있는 경우를 제외하고 개인정보를 제3자에게 제공하지 않습니다. 게시판에 스스로 올린 글과 클럽 이름, 공개로 설정한 스쿼드는 다른 이용자에게 보입니다.'],
  },
  {
    title: '5. 이용자의 권리',
    body: [
      '이용자는 언제든 자기 개인정보를 열람·정정·삭제하거나 처리 정지를 요구할 수 있습니다. 계정 화면에서 직접 탈퇴할 수 있고, 그 밖의 요청은 아래 보호책임자에게 하면 10일 안에 처리합니다.',
      '만 14세 미만 아동의 개인정보는 법정대리인의 동의 아래 처리하며, 법정대리인이 위 권리를 행사할 수 있습니다.',
    ],
  },
  {
    title: '6. 안전 조치',
    body: ['비밀번호 암호화, 서버 접근 권한 통제, 데이터베이스 행 단위 접근 제어, 정기 백업을 적용합니다. 개인정보 유출 사고가 나면 지체 없이 이용자와 관계 기관에 알립니다.'],
  },
  {
    title: '7. 쿠키와 브라우저 저장소',
    body: ['로그인 유지와 게임 설정(비서 설정, 페이스팩, 리네임팩, 진행 상황 임시 저장)에 브라우저 저장소를 씁니다. 광고·추적 목적의 쿠키는 쓰지 않습니다. 브라우저에서 저장소를 지우면 설정이 초기화됩니다.'],
  },
  {
    title: '8. 개인정보 보호책임자',
    body: [`${OPERATOR.privacyOfficer}. 개인정보 침해 신고는 개인정보침해신고센터(privacy.kisa.or.kr, 118)에도 할 수 있습니다.`],
  },
  {
    title: '9. 고지',
    body: [`이 방침은 ${PRIVACY_VERSION}부터 적용되며, 바뀌면 시행 7일 전에 서비스 안에서 공지합니다.`],
  },
]

export const TERMS_PLACEHOLDERS_LEFT = /\[[^\]]+\]/.test([...TERMS, ...PRIVACY].flatMap((s) => s.body).join(' '))

export interface Consent {
  termsVersion: string
  privacyVersion: string
  agreedAt: string
}

export async function fetchMyConsent(): Promise<Consent | null> {
  const supabase = getSupabase()
  if (!supabase) return null
  const { data, error } = await supabase.from('consents').select('terms_version, privacy_version, agreed_at').maybeSingle()
  if (error || !data) return null
  const row = data as { terms_version: string; privacy_version: string; agreed_at: string }
  return { termsVersion: row.terms_version, privacyVersion: row.privacy_version, agreedAt: row.agreed_at }
}

export function consentCurrent(consent: Consent | null): boolean {
  return Boolean(consent) && consent!.termsVersion === TERMS_VERSION && consent!.privacyVersion === PRIVACY_VERSION
}

export async function agreeToTerms(): Promise<boolean> {
  const supabase = getSupabase()
  if (!supabase) return false
  const { data, error } = await supabase.rpc('agree_terms', { p_terms_version: TERMS_VERSION, p_privacy_version: PRIVACY_VERSION })
  if (error) return false
  return (data as { ok?: boolean } | null)?.ok === true
}
