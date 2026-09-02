'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  BODY_MAX,
  COMMENT_MAX,
  PAGE_SIZE,
  TITLE_MAX,
  nicknameFrom,
  sortPosts,
  timeAgo,
  validateComment,
  validatePost,
  type Comment,
  type Post,
} from '../../lib/board'
import { configStatus, friendlyError, getSupabase } from '../../lib/supabase'
import { buildLabel } from '../../lib/build'
import { useGame } from '../GameProvider'

interface PostRow {
  id: string
  user_id: string
  nickname: string
  title: string
  body: string
  created_at: string
  notice?: boolean
  patch_ids?: string[]
}

interface CommentRow {
  id: string
  post_id: string
  user_id: string
  nickname: string
  body: string
  created_at: string
}

const toPost = (row: PostRow): Post => ({
  id: row.id,
  userId: row.user_id,
  nickname: row.nickname,
  title: row.title,
  body: row.body,
  createdAt: row.created_at,
  notice: Boolean(row.notice),
  patchIds: row.patch_ids ?? [],
})

const toComment = (row: CommentRow): Comment => ({
  id: row.id,
  postId: row.post_id,
  userId: row.user_id,
  nickname: row.nickname,
  body: row.body,
  createdAt: row.created_at,
})

export default function BoardTab() {
  const { state, account } = useGame()
  const [posts, setPosts] = useState<Post[]>([])
  const [open, setOpen] = useState<Post | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [writing, setWriting] = useState(false)

  const load = useCallback(async () => {
    const supabase = getSupabase()
    if (!supabase) {
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error: queryError } = await supabase
      .from('posts')
      .select('id, user_id, nickname, title, body, created_at, notice, patch_ids')
      .order('notice', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE)
    setLoading(false)
    if (queryError) {
      setError(friendlyError(queryError.message))
      return
    }
    setError(null)
    setPosts(sortPosts((data ?? []).map((row) => toPost(row as PostRow))))
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  if (!account.configured) {
    return (
      <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 text-center">
        <h2 className="text-lg font-black text-white">게시판은 서버가 연결되면 열립니다</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
          글과 댓글은 모두가 함께 보는 것이라 저장할 서버가 필요합니다. Supabase 키 두 개를
          등록하면 이 탭이 바로 켜집니다. 설정 방법은 README의 &ldquo;계정과 게시판 켜기&rdquo;에
          적어 두었습니다.
        </p>
        {configStatus().message && (
          <p className="mx-auto mt-3 max-w-md rounded-lg bg-amber-400/15 px-3 py-2 text-xs font-bold text-amber-200">
            {configStatus().message}
          </p>
        )}
        <p className="mt-2 text-[11px] text-slate-600">
          보고 계신 빌드: {buildLabel()} · 주소 {configStatus().url ? '있음' : '없음'} · 키{' '}
          {configStatus().key ? '있음' : '없음'}
        </p>
      </section>
    )
  }

  if (open) {
    return <PostView post={open} onBack={() => setOpen(null)} onDeleted={() => {
      setOpen(null)
      void load()
    }} />
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold text-white">게시판</h2>
          <p className="text-sm text-slate-400">공략과 자랑, 버그 제보를 남겨보세요.</p>
        </div>
        <button
          onClick={() => setWriting((value) => !value)}
          disabled={account.status !== 'signedIn'}
          className="whitespace-nowrap rounded-xl bg-emerald-400 px-4 py-2 text-sm font-black text-slate-900 transition hover:bg-emerald-300 disabled:bg-white/10 disabled:text-slate-500"
        >
          {writing ? '취소' : '글쓰기'}
        </button>
      </div>

      {account.status !== 'signedIn' && (
        <p className="mb-4 rounded-lg bg-white/5 px-3 py-2 text-xs font-semibold text-slate-400">
          글과 댓글은 로그인해야 쓸 수 있습니다. 읽는 것은 로그인 없이도 됩니다.
        </p>
      )}

      {writing && account.status === 'signedIn' && (
        <PostForm
          nickname={nicknameFrom(state.club, account.user?.email ?? '')}
          userId={account.user?.id ?? ''}
          onDone={() => {
            setWriting(false)
            void load()
          }}
        />
      )}

      {error && (
        <p className="mb-3 rounded-lg bg-rose-500/15 px-3 py-2 text-xs font-bold text-rose-200">
          {error}
        </p>
      )}

      {loading ? (
        <p className="py-14 text-center text-sm text-slate-500">불러오는 중...</p>
      ) : posts.length === 0 ? (
        <p className="py-14 text-center text-sm text-slate-500">
          아직 글이 없습니다. 첫 글을 남겨보세요.
        </p>
      ) : (
        <ul className="divide-y divide-white/5">
          {posts.map((post) => (
            <li key={post.id}>
              <button
                onClick={() => setOpen(post)}
                className="w-full py-3 text-left transition hover:bg-white/5"
              >
                <div className="flex min-w-0 items-center gap-1.5">
                  {post.notice && (
                    <span className="shrink-0 whitespace-nowrap rounded bg-emerald-400 px-1.5 py-0.5 text-[10px] font-black text-slate-900">
                      공지
                    </span>
                  )}
                  <div className="truncate text-sm font-bold text-white">{post.title}</div>
                </div>
                <div className="mt-0.5 text-[11px] text-slate-500">
                  {post.nickname} · {timeAgo(post.createdAt)}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function PostForm({
  nickname,
  userId,
  onDone,
}: {
  nickname: string
  userId: string
  onDone: () => void
}) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const problem = validatePost({ title, body })
    if (problem) {
      setError(problem)
      return
    }
    const supabase = getSupabase()
    if (!supabase) return
    setSaving(true)
    const { error: writeError } = await supabase.from('posts').insert({
      user_id: userId,
      nickname,
      title: title.trim(),
      body: body.trim(),
    })
    setSaving(false)
    if (writeError) {
      setError(friendlyError(writeError.message))
      return
    }
    setTitle('')
    setBody('')
    onDone()
  }

  return (
    <form onSubmit={submit} className="mb-4 space-y-2 rounded-xl bg-slate-950/70 p-3">
      <input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="제목"
        maxLength={TITLE_MAX}
        className="w-full rounded-lg bg-white/10 px-3 py-2 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-emerald-400"
      />
      <textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder="내용"
        rows={5}
        maxLength={BODY_MAX}
        className="w-full rounded-lg bg-white/10 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-emerald-400"
      />
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] text-slate-500">{nickname} 이름으로 올라갑니다</span>
        <button
          type="submit"
          disabled={saving}
          className="whitespace-nowrap rounded-lg bg-emerald-400 px-4 py-2 text-sm font-black text-slate-900 disabled:opacity-50"
        >
          등록
        </button>
      </div>
      {error && <p className="text-xs font-bold text-rose-300">{error}</p>}
    </form>
  )
}

function PostView({
  post,
  onBack,
  onDeleted,
}: {
  post: Post
  onBack: () => void
  onDeleted: () => void
}) {
  const { state, account } = useGame()
  const [comments, setComments] = useState<Comment[]>([])
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const supabase = getSupabase()
    if (!supabase) return
    const { data, error: queryError } = await supabase
      .from('comments')
      .select('id, post_id, user_id, nickname, body, created_at')
      .eq('post_id', post.id)
      .order('created_at', { ascending: true })
    if (queryError) {
      setError(friendlyError(queryError.message))
      return
    }
    setComments((data ?? []).map((row) => toComment(row as CommentRow)))
  }, [post.id])

  useEffect(() => {
    void load()
  }, [load])

  const addComment = async (event: React.FormEvent) => {
    event.preventDefault()
    const problem = validateComment(body)
    if (problem) {
      setError(problem)
      return
    }
    const supabase = getSupabase()
    if (!supabase || !account.user) return
    setBusy(true)
    const { error: writeError } = await supabase.from('comments').insert({
      post_id: post.id,
      user_id: account.user.id,
      nickname: nicknameFrom(state.club, account.user.email),
      body: body.trim(),
    })
    setBusy(false)
    if (writeError) {
      setError(friendlyError(writeError.message))
      return
    }
    setBody('')
    setError(null)
    void load()
  }

  const remove = async () => {
    const supabase = getSupabase()
    if (!supabase) return
    if (!window.confirm('이 글을 지울까요?')) return
    setBusy(true)
    const { error: deleteError } = await supabase.from('posts').delete().eq('id', post.id)
    setBusy(false)
    if (deleteError) {
      setError(friendlyError(deleteError.message))
      return
    }
    onDeleted()
  }

  const mine = account.user?.id === post.userId

  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <button
          onClick={onBack}
          className="whitespace-nowrap rounded-lg bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-300 hover:bg-white/10"
        >
          목록으로
        </button>
        {mine && (
          <button
            onClick={remove}
            disabled={busy}
            className="whitespace-nowrap rounded-lg bg-rose-500/20 px-3 py-1.5 text-xs font-bold text-rose-200 hover:bg-rose-500/30 disabled:opacity-50"
          >
            삭제
          </button>
        )}
      </div>

      {post.notice && (
        <span className="mb-1 inline-block whitespace-nowrap rounded bg-emerald-400 px-1.5 py-0.5 text-[10px] font-black text-slate-900">
          공지
        </span>
      )}
      <h2 className="text-lg font-black text-white">{post.title}</h2>
      <p className="mt-1 text-[11px] text-slate-500">
        {post.nickname} · {timeAgo(post.createdAt)}
      </p>
      <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-slate-200">{post.body}</p>

      <h3 className="mt-6 text-xs font-bold uppercase tracking-wide text-slate-400">
        댓글 {comments.length}
      </h3>
      <ul className="mt-2 space-y-2">
        {comments.map((comment) => (
          <li key={comment.id} className="rounded-lg bg-white/5 px-3 py-2">
            <div className="text-[11px] font-bold text-slate-400">
              {comment.nickname} · {timeAgo(comment.createdAt)}
            </div>
            <p className="mt-0.5 whitespace-pre-wrap text-sm text-slate-200">{comment.body}</p>
          </li>
        ))}
        {comments.length === 0 && <li className="text-xs text-slate-500">첫 댓글을 남겨보세요.</li>}
      </ul>

      {account.status === 'signedIn' ? (
        <form onSubmit={addComment} className="mt-3 flex gap-2">
          <input
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="댓글"
            maxLength={COMMENT_MAX}
            className="min-w-0 flex-1 rounded-lg bg-white/10 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-emerald-400"
          />
          <button
            type="submit"
            disabled={busy}
            className="whitespace-nowrap rounded-lg bg-emerald-400 px-4 text-sm font-black text-slate-900 disabled:opacity-50"
          >
            등록
          </button>
        </form>
      ) : (
        <p className="mt-3 text-xs text-slate-500">댓글은 로그인 후에 쓸 수 있습니다.</p>
      )}

      {error && <p className="mt-2 text-xs font-bold text-rose-300">{error}</p>}
    </section>
  )
}
