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
