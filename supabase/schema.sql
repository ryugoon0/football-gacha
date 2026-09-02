-- Football Day 클론 — 계정 세이브와 게시판 스키마
--
-- 사용법: Supabase 프로젝트 → SQL Editor → 이 파일 전체를 붙여넣고 Run.
-- 두 번 실행해도 안전합니다(모두 if not exists / drop policy if exists).

-- ---------------------------------------------------------------------------
-- 1. 클라우드 세이브: 계정당 한 줄
-- ---------------------------------------------------------------------------
create table if not exists public.saves (
  user_id    uuid primary key references auth.users on delete cascade,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

-- A save is a few hundred KB at most; the cap stops one account from filling
-- the database. Safe to re-run: the constraint is added only when missing.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'saves_data_size'
  ) then
    alter table public.saves
      add constraint saves_data_size check (pg_column_size(data) <= 524288);
  end if;
end $$;

alter table public.saves enable row level security;

drop policy if exists "saves are private" on public.saves;
create policy "saves are private" on public.saves
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 2. 게시판: 누구나 읽고, 로그인한 사람만 쓰고, 자기 글만 지웁니다
-- ---------------------------------------------------------------------------
create table if not exists public.posts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade,
  nickname   text not null check (char_length(nickname) between 1 and 16),
  title      text not null check (char_length(title) between 1 and 60),
  body       text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists posts_created_at_idx on public.posts (created_at desc);

alter table public.posts enable row level security;

drop policy if exists "posts are public to read" on public.posts;
create policy "posts are public to read" on public.posts
  for select using (true);

drop policy if exists "members write their own posts" on public.posts;
create policy "members write their own posts" on public.posts
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "members delete their own posts" on public.posts;
create policy "members delete their own posts" on public.posts
  for delete to authenticated using (auth.uid() = user_id);

create table if not exists public.comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.posts on delete cascade,
  user_id    uuid not null references auth.users on delete cascade,
  nickname   text not null check (char_length(nickname) between 1 and 16),
  body       text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists comments_post_id_idx on public.comments (post_id, created_at);

alter table public.comments enable row level security;

drop policy if exists "comments are public to read" on public.comments;
create policy "comments are public to read" on public.comments
  for select using (true);

drop policy if exists "members write their own comments" on public.comments;
create policy "members write their own comments" on public.comments
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "members delete their own comments" on public.comments;
create policy "members delete their own comments" on public.comments
  for delete to authenticated using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 3. 운영자와 공지사항
-- ---------------------------------------------------------------------------
-- 운영자는 이 표에 들어 있는 계정뿐입니다. 넣고 빼는 일은 SQL Editor에서만
-- 할 수 있습니다 — insert 정책이 없으므로 앱에서는 아무도 스스로를 운영자로
-- 만들 수 없습니다.
--
-- 본인을 운영자로 등록하려면 (한 번만):
--   insert into public.admins (user_id)
--   select id from auth.users where email = 'your@email.com'
--   on conflict do nothing;
create table if not exists public.admins (
  user_id  uuid primary key references auth.users on delete cascade,
  added_at timestamptz not null default now()
);

alter table public.admins enable row level security;

-- 자기가 운영자인지만 확인할 수 있습니다. 운영자 명단 전체는 보이지 않습니다.
drop policy if exists "you can check your own admin row" on public.admins;
create policy "you can check your own admin row" on public.admins
  for select to authenticated using (auth.uid() = user_id);

-- security definer라 admins의 RLS를 거치지 않고 확인합니다. 정책 안에서
-- 스스로를 다시 부르지 않도록 하기 위한 것입니다.
create or replace function public.is_admin()
  returns boolean
  language sql
  stable
  security definer
  set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- 공지사항은 게시판의 글이되 운영자만 세울 수 있는 깃발입니다.
alter table public.posts add column if not exists notice boolean not null default false;
-- 이 공지가 어떤 패치 로그 항목들을 담고 있는지. 중복 공지를 막는 데 씁니다.
alter table public.posts add column if not exists patch_ids text[] not null default '{}';

create index if not exists posts_notice_idx on public.posts (notice, created_at desc);

-- 글쓰기 정책을 다시 깝니다: 공지 깃발은 운영자만 세울 수 있습니다.
drop policy if exists "members write their own posts" on public.posts;
create policy "members write their own posts" on public.posts
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and (notice = false or public.is_admin())
  );

-- 운영자는 공지를 내릴 수 있어야 합니다. 일반 글은 여전히 본인 것만.
drop policy if exists "members delete their own posts" on public.posts;
create policy "members delete their own posts" on public.posts
  for delete to authenticated
  using (auth.uid() = user_id or public.is_admin());
