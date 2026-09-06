-- 계정 삭제와 게시판 운영(신고·차단·운영자 삭제).
--
-- 1) delete_my_account(): 본인 계정을 지운다. auth.users 행을 지우면 saves·posts·
--    comments·gold_ledger·gift_inbox 등 on delete cascade 로 딸려 지워진다(개인정보
--    보호법·앱스토어 심사 요구: 유저 스스로 탈퇴·삭제).
-- 2) post_reports: 글·댓글 신고. 운영자만 읽고, 신고자는 RPC 로만 넣는다.
-- 3) user_blocks: 내가 차단한 사람. 차단한 사람의 글·댓글은 클라이언트가 숨긴다.
-- 4) 운영자는 어떤 글·댓글이든 지울 수 있다(RLS).

create or replace function public.delete_my_account()
  returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    return jsonb_build_object('ok', false, 'reason', 'not signed in');
  end if;
  -- 운영자 계정은 실수로 지우지 못하게 막는다 — 운영자 명단에서 먼저 빼야 한다.
  if exists (select 1 from public.admins where user_id = v_user) then
    return jsonb_build_object('ok', false, 'reason', 'operator');
  end if;
  delete from auth.users where id = v_user;
  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;

-- ---------------------------------------------------------------------------
create table if not exists public.post_reports (
  id          bigserial primary key,
  post_id     uuid references public.posts(id) on delete cascade,
  comment_id  uuid references public.comments(id) on delete cascade,
  reporter    uuid not null references auth.users on delete cascade,
  reason      text not null check (char_length(reason) between 1 and 300),
  created_at  timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users on delete set null,
  check (post_id is not null or comment_id is not null)
);
create unique index if not exists post_reports_once_idx
  on public.post_reports (reporter, coalesce(post_id, '00000000-0000-0000-0000-000000000000'::uuid), coalesce(comment_id, '00000000-0000-0000-0000-000000000000'::uuid));
create index if not exists post_reports_open_idx on public.post_reports (created_at desc) where resolved_at is null;

alter table public.post_reports enable row level security;
drop policy if exists "operators read reports" on public.post_reports;
create policy "operators read reports" on public.post_reports for select to authenticated using (public.is_admin());

create or replace function public.report_content(p_post_id uuid, p_comment_id uuid, p_reason text)
  returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then return jsonb_build_object('ok', false, 'reason', 'not signed in'); end if;
  if p_post_id is null and p_comment_id is null then return jsonb_build_object('ok', false, 'reason', 'nothing to report'); end if;
  if char_length(trim(coalesce(p_reason, ''))) = 0 then return jsonb_build_object('ok', false, 'reason', 'no reason'); end if;
  if p_post_id is not null and exists (select 1 from public.posts where id = p_post_id and user_id = v_user) then
    return jsonb_build_object('ok', false, 'reason', 'own content');
  end if;
  if p_comment_id is not null and exists (select 1 from public.comments where id = p_comment_id and user_id = v_user) then
    return jsonb_build_object('ok', false, 'reason', 'own content');
  end if;
  insert into public.post_reports (post_id, comment_id, reporter, reason)
  values (p_post_id, p_comment_id, v_user, left(trim(p_reason), 300))
  on conflict do nothing;
  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.report_content(uuid, uuid, text) from public;
grant execute on function public.report_content(uuid, uuid, text) to authenticated;

-- 운영자용 목록: 미해결 먼저, 대상 글·댓글의 내용과 작성자 이메일까지.
create or replace function public.reports_for_admin()
  returns jsonb
  language sql
  stable
  security definer
  set search_path = public
as $$
  select case when not public.is_admin() then '[]'::jsonb else coalesce(jsonb_agg(jsonb_build_object(
    'id', r.id,
    'postId', r.post_id,
    'commentId', r.comment_id,
    'reason', r.reason,
    'createdAt', r.created_at,
    'resolvedAt', r.resolved_at,
    'reporterEmail', ru.email,
    'targetTitle', p.title,
    'targetBody', coalesce(c.body, p.body),
    'targetNickname', coalesce(c.nickname, p.nickname),
    'targetUserId', coalesce(c.user_id, p.user_id),
    'targetEmail', tu.email,
    'reportsOnTarget', (select count(*) from public.post_reports x where (r.post_id is not null and x.post_id = r.post_id) or (r.comment_id is not null and x.comment_id = r.comment_id))
  ) order by (r.resolved_at is null) desc, r.id desc), '[]'::jsonb) end
  from public.post_reports r
  left join public.posts p on p.id = r.post_id
  left join public.comments c on c.id = r.comment_id
  left join auth.users ru on ru.id = r.reporter
  left join auth.users tu on tu.id = coalesce(c.user_id, p.user_id)
  where r.resolved_at is null or r.created_at > now() - interval '30 days';
$$;

revoke all on function public.reports_for_admin() from public;
grant execute on function public.reports_for_admin() to authenticated;

create or replace function public.admin_resolve_report(p_id bigint)
  returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  if not public.is_admin() then return jsonb_build_object('ok', false, 'reason', 'not an operator'); end if;
  update public.post_reports set resolved_at = now(), resolved_by = auth.uid() where id = p_id and resolved_at is null;
  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.admin_resolve_report(bigint) from public;
grant execute on function public.admin_resolve_report(bigint) to authenticated;

-- 운영자는 어떤 글·댓글이든 지운다.
drop policy if exists "operators delete any post" on public.posts;
create policy "operators delete any post" on public.posts for delete to authenticated using (public.is_admin());
drop policy if exists "operators delete any comment" on public.comments;
create policy "operators delete any comment" on public.comments for delete to authenticated using (public.is_admin());
drop policy if exists "members delete their own comments" on public.comments;
create policy "members delete their own comments" on public.comments for delete to authenticated using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
create table if not exists public.user_blocks (
  blocker    uuid not null references auth.users on delete cascade,
  blocked    uuid not null references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker, blocked),
  check (blocker <> blocked)
);

alter table public.user_blocks enable row level security;
drop policy if exists "members manage their own blocks" on public.user_blocks;
create policy "members manage their own blocks" on public.user_blocks
  for all to authenticated using (auth.uid() = blocker) with check (auth.uid() = blocker);
