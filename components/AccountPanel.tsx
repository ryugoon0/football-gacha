'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { summarize } from '../lib/cloudSave'
import { publicLineupOf } from '../lib/publicClub'
import { evaluateSquad } from '../lib/squad'
import { BUILD_REF, checkConnection, configStatus, getSupabase } from '../lib/supabase'
import AssistantSettings from './AssistantSettings'
import FacepackSettings from './FacepackSettings'
import RenamePackSettings from './RenamePackSettings'
import { useGame } from './GameProvider'
import { fetchBlockedUsers, unblockUser } from '../lib/board'

/**
 * Sign up, sign in, and the one question worth asking: which save wins when a
 * browser and an account both hold real progress.
 */
export default function AccountPanel({ onClose }: { onClose: () => void }) {
  const { state, account } = useGame()
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [health, setHealth] = useState<{ ok: boolean; message: string } | null>(null)
  const [publicStatus, setPublicStatus] = useState<boolean | null>(null)
  const [publishing, setPublishing] = useState(false)
  const [publicMessage, setPublicMessage] = useState<string | null>(null)

  const userId = account.user?.id
  useEffect(() => {
    if (account.status !== 'signedIn' || !userId) {
      setPublicStatus(null)
      return
    }

    let active = true
    const client = getSupabase()
    if (!client) return
    void client
      .from('public_club_squads')
      .select('is_public')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return
        if (error) {
          setPublicMessage('공개 스쿼드 설정을 불러오지 못했습니다.')
          return
        }
        setPublicStatus(data?.is_public === true)
      })

    return () => {
      active = false
    }
  }, [account.status, userId])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    account.clearMessages()
    if (mode === 'signIn') await account.signIn(email.trim(), password)
    else await account.signUp(email.trim(), password)
  }

  const local = summarize(state)
  const cloud = account.conflict ? summarize(account.conflict.state) : null

  const changePassword = async () => {
    const next = window.prompt('새 비밀번호를 입력해 주세요 (6자 이상)')
    if (next === null) return
    if (next.length < 6) {
      window.alert('비밀번호는 6자 이상이어야 합니다.')
      return
    }
    await account.setNewPassword(next)
  }

  const setSquadVisibility = async (visible: boolean) => {
    const client = getSupabase()
    if (!client || !userId) return

    const lineup = publicLineupOf(state)
    const starters = lineup.filter((member) => member.role === 'starter')
    if (visible && starters.length < 11) {
      setPublicMessage('선발 11명을 모두 배치한 뒤 스쿼드를 공개해 주세요.')
      return
    }

    setPublishing(true)
    setPublicMessage(null)
    const rating = evaluateSquad(state.cards, state.squad, state.season.division).overall
    const { data, error } = await client.rpc('set_public_club_squad', {
      p_visible: visible,
      p_club_name: state.club,
      p_division: state.season.division,
      p_rating: rating,
      p_formation: state.squad.formation,
      p_lineup: lineup,
    })
    setPublishing(false)

    const result = data as { ok?: boolean; reason?: string } | null
    if (error || result?.ok !== true) {
      setPublicMessage(
        result?.reason === 'invalid_lineup'
          ? '공개할 수 없는 스쿼드 데이터입니다.'
          : '공개 설정을 저장하지 못했습니다. 서버 업데이트 상태를 확인해 주세요.',
      )
      return
    }

    setPublicStatus(visible)
    setPublicMessage(
      visible
        ? '현재 스쿼드가 공개되었습니다. 선수 변경 뒤에는 다시 갱신해 주세요.'
        : '스쿼드를 비공개로 전환했습니다.',
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center" onClick={onClose}>
      {/* The panel has grown past a phone screen (assistant, facepack, rename pack …), so it
          scrolls inside the viewport and the close button stays pinned at the top. */}
      <div
        className="rise-in flex max-h-[calc(100dvh-2rem)] w-full max-w-md flex-col panel-strong shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-6 py-3">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400">
            계정
          </span>
          <button
            onClick={onClose}
            aria-label="닫기"
            className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-black text-slate-200 hover:bg-white/20"
          >
            ✕ 닫기
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">


        {!account.configured ? (
          <div className="space-y-3">
            <h2 className="text-lg font-black text-white">아직 서버가 연결되지 않았습니다</h2>
            <p className="text-sm text-slate-400">
              지금은 진행 상황이 이 브라우저에만 저장됩니다. 계정과 게시판은 서버 설정(Supabase
              키 두 개)을 마치면 자동으로 켜집니다. 설정 방법은 README의 &ldquo;계정과 게시판
              켜기&rdquo;에 적어 두었습니다.
            </p>
            {configStatus().message && (
              <p className="rounded-lg bg-amber-400/15 px-3 py-2 text-xs font-bold text-amber-200">
                {configStatus().message}
              </p>
            )}
            <p className="text-[11px] text-slate-600">
              보고 계신 빌드: {BUILD_REF} · 주소 {configStatus().url ? '있음' : '없음'} · 키{' '}
              {configStatus().key ? '있음' : '없음'}
            </p>
          </div>
        ) : cloud ? (
          <div className="space-y-3">
            <h2 className="text-lg font-black text-white">어느 진행 상황을 쓸까요?</h2>
            <p className="text-xs text-slate-400">
              이 브라우저와 계정 양쪽에 진행 상황이 있습니다. 고르지 않은 쪽은 사라집니다.
            </p>
            <div className="grid gap-2">
              <SaveChoice
                title="이 브라우저"
                summary={local}
                onPick={() => account.resolveConflict('useLocal')}
              />
              <SaveChoice
                title="계정에 저장된 것"
                summary={cloud}
                stamp={account.conflict?.updatedAt}
                onPick={() => account.resolveConflict('useCloud')}
              />
            </div>
          </div>
        ) : account.status === 'signedIn' && account.user ? (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-black text-white">{account.user.email}</h2>
              <p className="mt-1 text-xs text-slate-400">
                진행 상황이 계정에 자동 저장됩니다{account.syncing ? ' · 저장 중...' : ''}. 다른
                기기에서 같은 계정으로 로그인하면 이어서 할 수 있습니다.
              </p>
            </div>
            <AssistantSettings />
            <FacepackSettings />
            <RenamePackSettings />
            <section className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black text-white">내 스쿼드 공개</h3>
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                    구단명, 디비전, 전력과 선수 명단만 공개됩니다. 세이브, 재화, 전술은 공개되지
                    않습니다.
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black ${
                    publicStatus
                      ? 'bg-emerald-400/15 text-emerald-300'
                      : 'bg-white/5 text-slate-500'
                  }`}
                >
                  {publicStatus ? '공개 중' : '비공개'}
                </span>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => void setSquadVisibility(true)}
                  disabled={publishing}
                  className="rounded-lg btn-primary py-2 text-xs font-black transition disabled:opacity-40"
                >
                  {publicStatus ? '최신 스쿼드로 갱신' : '스쿼드 공개'}
                </button>
                {publicStatus ? (
                  <button
                    type="button"
                    onClick={() => void setSquadVisibility(false)}
                    disabled={publishing}
                    className="rounded-lg btn-ghost py-2 text-xs font-bold disabled:opacity-40"
                  >
                    공개 해제
                  </button>
                ) : (
                  <Link
                    href="/clubs"
                    onClick={onClose}
                    className="rounded-lg bg-white/5 py-2 text-center text-xs font-bold text-slate-300 transition hover:bg-white/10"
                  >
                    다른 구단 보기
                  </Link>
                )}
              </div>
              {publicStatus && userId && (
                <Link
                  href={`/clubs/${userId}`}
                  onClick={onClose}
                  className="mt-2 block text-center text-[11px] font-bold text-emerald-300 hover:text-emerald-200"
                >
                  내 공개 페이지 열기
                </Link>
              )}
              {publicMessage && (
                <p className="mt-2 text-[11px] font-semibold text-amber-200">{publicMessage}</p>
              )}
            </section>
            <button
              onClick={() => void changePassword()}
              disabled={account.syncing}
              className="w-full rounded-xl bg-white/5 py-2.5 text-sm font-bold text-slate-200 transition hover:bg-white/10 disabled:opacity-40"
            >
              비밀번호 변경
            </button>
            <button
              onClick={() => account.signOut()}
              className="w-full rounded-xl bg-white/10 py-2.5 text-sm font-bold text-white transition hover:bg-white/20"
            >
              로그아웃
            </button>
            <BlockedUsers userId={account.user.id} />
            <DeleteAccount onDelete={account.deleteAccount} />
            <p className="text-center text-[11px] text-slate-500">
              <a href="/terms" target="_blank" rel="noreferrer" className="hover:text-slate-300">이용약관</a> · <a href="/privacy" target="_blank" rel="noreferrer" className="hover:text-slate-300">개인정보처리방침</a> · <a href="/odds" target="_blank" rel="noreferrer" className="hover:text-slate-300">확률 안내</a>
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <div className="flex gap-1.5">
              {(['signIn', 'signUp'] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setMode(key)
                    account.clearMessages()
                  }}
                  className={`flex-1 whitespace-nowrap rounded-lg py-2 text-sm font-bold transition ${
                    mode === key
                      ? 'btn-primary'
                      : 'btn-ghost'
                  }`}
                >
                  {key === 'signIn' ? '로그인' : '회원가입'}
                </button>
              ))}
            </div>

            <label className="block text-xs font-bold text-slate-400">
              이메일
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                className="mt-1 w-full rounded-lg input px-3 py-2 text-sm font-semibold"
              />
            </label>

            <label className="block text-xs font-bold text-slate-400">
              비밀번호 (6자 이상)
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
                className="mt-1 w-full rounded-lg input px-3 py-2 text-sm font-semibold"
              />
            </label>

            {mode === 'signUp' && (
              <div className="space-y-1.5 rounded-lg bg-white/5 p-2.5 text-[11px] text-slate-300">
                <label className="flex items-start gap-2">
                  <input type="checkbox" required className="mt-0.5" />
                  <span>
                    <a href="/terms" target="_blank" rel="noreferrer" className="font-bold text-emerald-300 underline-offset-2 hover:underline">이용약관</a>에 동의합니다 (필수)
                  </span>
                </label>
                <label className="flex items-start gap-2">
                  <input type="checkbox" required className="mt-0.5" />
                  <span>
                    <a href="/privacy" target="_blank" rel="noreferrer" className="font-bold text-emerald-300 underline-offset-2 hover:underline">개인정보처리방침</a>에 동의합니다 (필수)
                  </span>
                </label>
                <label className="flex items-start gap-2">
                  <input type="checkbox" required className="mt-0.5" />
                  <span>만 14세 이상이거나 법정대리인의 동의를 받았습니다 (필수)</span>
                </label>
              </div>
            )}
            <button
              type="submit"
              disabled={account.syncing}
              className="w-full rounded-xl btn-primary py-2.5 text-sm font-black transition disabled:opacity-50"
            >
              {mode === 'signIn' ? '로그인' : '가입하고 시작'}
            </button>

            <p className="text-[11px] text-slate-500">
              로그인하면 지금 이 브라우저의 진행 상황이 계정으로 올라갑니다. 로그인 없이도 게임은
              그대로 즐길 수 있습니다.
            </p>
          </form>
        )}

        {account.configured && (
          <div className="mt-4 border-t border-white/5 pt-3">
            <button
              onClick={async () => setHealth(await checkConnection())}
              className="whitespace-nowrap text-[11px] font-bold text-slate-500 hover:text-slate-300"
            >
              서버 연결 확인
            </button>
            {health && (
              <p
                className={`mt-1 break-all text-[11px] font-semibold ${
                  health.ok ? 'text-emerald-300' : 'text-amber-300'
                }`}
              >
                {health.ok ? '✓ ' : '! '}
                {health.message}
              </p>
            )}
          </div>
        )}

        {account.error && (
          <p className="mt-3 rounded-lg bg-rose-500/15 px-3 py-2 text-xs font-bold text-rose-200">
            {account.error}
          </p>
        )}
        {account.notice && (
          <p className="mt-3 rounded-lg bg-sky-500/15 px-3 py-2 text-xs font-bold text-sky-200">
            {account.notice}
          </p>
        )}
        </div>
      </div>
    </div>
  )
}

function SaveChoice({
  title,
  summary,
  stamp,
  onPick,
}: {
  title: string
  summary: ReturnType<typeof summarize>
  stamp?: string
  onPick: () => void
}) {
  return (
    <button
      onClick={onPick}
      className="rounded-xl bg-white/5 p-3 text-left transition hover:bg-white/10"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-black text-white">{title}</span>
        <span className="text-[10px] text-slate-500">
          {stamp ? new Date(stamp).toLocaleString('ko-KR') : '지금'}
        </span>
      </div>
      <div className="mt-1 text-[11px] text-slate-400">
        {summary.club} · {summary.division}부 · 시즌 {summary.season} · 카드 {summary.cards}장 ·{' '}
        {summary.gold.toLocaleString()}G · {summary.record}
      </div>
    </button>
  )
}

/** 탈퇴 — the account and every server record under it, confirmed by typing the word. */
function DeleteAccount({ onDelete }: { onDelete: () => Promise<{ ok: true } | { ok: false; reason: string }> }) {
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const armed = typed.trim() === '삭제'
  const run = async () => {
    if (!armed) return
    setBusy(true)
    const result = await onDelete()
    setBusy(false)
    if (!result.ok) {
      setMessage(
        result.reason === 'operator'
          ? '운영자 계정은 여기서 삭제할 수 없습니다. 운영자 명단에서 먼저 빼야 합니다.'
          : '삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.',
      )
      return
    }
    window.location.reload()
  }
  return (
    <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3">
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className="text-[11px] font-bold text-rose-300/80 hover:text-rose-200">
          계정 삭제(탈퇴)
        </button>
      ) : (
        <div className="space-y-2">
          <p className="text-[11px] leading-relaxed text-rose-100">
            계정과 서버에 저장된 모든 것(진행 상황, 카드, 골드, 티켓, 게시글, 경쟁 리그 기록)이 지워지고 되돌릴 수 없습니다. 이 브라우저의
            저장본도 함께 지웁니다. 진행하려면 아래에 <b>삭제</b>라고 입력하세요.
          </p>
          <div className="flex gap-2">
            <input value={typed} onChange={(event) => setTyped(event.target.value)} placeholder="삭제" className="min-w-0 flex-1 rounded-lg bg-white/5 px-3 py-2 text-sm text-white outline-none" />
            <button type="button" onClick={() => void run()} disabled={!armed || busy} className="rounded-lg bg-rose-500/80 px-3 py-2 text-xs font-black text-white disabled:opacity-40">
              {busy ? '삭제 중…' : '영구 삭제'}
            </button>
            <button type="button" onClick={() => { setOpen(false); setTyped(''); setMessage(null) }} className="rounded-lg btn-ghost px-3 py-2 text-xs font-bold">
              취소
            </button>
          </div>
          {message && <p className="text-[11px] font-semibold text-amber-300">{message}</p>}
        </div>
      )}
    </div>
  )
}

/** 차단 목록 — who this account has blocked on the board, with a way back. */
function BlockedUsers({ userId }: { userId: string }) {
  const [ids, setIds] = useState<string[] | null>(null)
  const load = async () => setIds([...(await fetchBlockedUsers())])
  useEffect(() => {
    void load()
  }, [])
  if (!ids || ids.length === 0) return null
  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <h3 className="text-sm font-black text-white">차단한 사람 {ids.length}명</h3>
      <p className="mt-1 text-[11px] text-slate-400">차단한 사람의 글과 댓글은 게시판에서 보이지 않습니다. 해제하면 다시 보입니다.</p>
      <ul className="mt-2 space-y-1">
        {ids.map((id) => (
          <li key={id} className="flex items-center justify-between gap-2 rounded-lg bg-white/5 px-2.5 py-1.5 text-[11px]">
            <span className="truncate font-mono text-slate-400">{id.slice(0, 8)}…</span>
            <button type="button" onClick={() => void unblockUser(userId, id).then(load)} className="rounded btn-ghost px-2 py-1 text-[11px] font-bold">
              차단 해제
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
