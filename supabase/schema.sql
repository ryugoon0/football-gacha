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

-- ---------------------------------------------------------------------------
-- 4. 세이브 감사와 방어벽 (docs/SECURITY_ARCHITECTURE.md 0단계)
-- ---------------------------------------------------------------------------
-- 지금은 클라이언트가 게임 상태를 계산합니다. 서버 권한 이전이 끝나기 전까지
-- 조작을 완전히 막을 수는 없으므로, 이 단계의 목적은 차단이 아니라 **탐지와
-- 근거 확보**입니다.
--
-- 그래서 거부는 "정상 플레이로는 절대 나올 수 없는 값"에만 겁니다. 의심스러운
-- 정도는 기록만 하고 통과시킵니다. 잘못 막아서 정상 플레이어의 진행이 사라지는
-- 것이, 조작을 한 번 놓치는 것보다 나쁩니다.

create table if not exists public.save_audit (
  id        bigserial primary key,
  user_id   uuid not null references auth.users on delete cascade,
  at        timestamptz not null default now(),
  -- 전체 세이브를 복사하면 용량이 감당되지 않으므로 다툼이 생겼을 때 필요한
  -- 값만 남깁니다.
  gold      numeric,
  cards     int,
  pulls     numeric,
  played    numeric,
  season    numeric,
  -- 거부된 경우 그 이유. 통과했으면 null.
  rejected  text,
  -- 통과했지만 눈여겨볼 점. 거부하지는 않습니다.
  flagged   text
);

create index if not exists save_audit_user_idx on public.save_audit (user_id, at desc);
create index if not exists save_audit_rejected_idx on public.save_audit (at desc)
  where rejected is not null or flagged is not null;

alter table public.save_audit enable row level security;
-- 감사 기록은 본인도 읽거나 지울 수 없습니다. 운영자만 읽습니다.
drop policy if exists "only operators read the audit" on public.save_audit;
create policy "only operators read the audit" on public.save_audit
  for select to authenticated using (public.is_admin());

-- 세이브에서 숫자를 안전하게 꺼냅니다. 없거나 숫자가 아니면 null입니다.
create or replace function public.save_num(data jsonb, path text[])
  returns numeric
  language plpgsql
  immutable
as $$
begin
  return (data #>> path)::numeric;
exception when others then
  return null;
end $$;

-- 배열이 아닌 값이 와도 예외를 던지지 않습니다. 트리거가 죽으면 정상 저장까지
-- 막히므로, 모르는 모양은 0으로 봅니다.
create or replace function public.save_len(data jsonb, key text)
  returns int
  language sql
  immutable
as $$
  select case
    when jsonb_typeof(data -> key) = 'array' then jsonb_array_length(data -> key)
    else 0
  end;
$$;

create or replace function public.guard_save()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_gold    numeric := public.save_num(new.data, '{gold}');
  v_cards   int     := public.save_len(new.data, 'cards');
  v_pulls   numeric := public.save_num(new.data, '{pulls,total}');
  v_played  numeric := coalesce(public.save_num(new.data, '{record,w}'), 0)
                     + coalesce(public.save_num(new.data, '{record,d}'), 0)
                     + coalesce(public.save_num(new.data, '{record,l}'), 0);
  v_season  numeric := public.save_num(new.data, '{season,index}');
  v_reason  text := null;
  v_flag    text := null;
  v_last    public.save_audit%rowtype;
  v_seconds numeric;
  v_jump    numeric;
begin
  -- (1) 절대값: 어떤 플레이로도 도달할 수 없는 범위.
  if v_gold is null or v_gold < 0 or v_gold > 1e12 then
    v_reason := format('gold out of range: %s', coalesce(v_gold::text, 'null'));
  elsif v_cards > 5000 then
    v_reason := format('too many cards: %s', v_cards);
  end if;

  -- (2) 증가 속도: 직전 통과 기록과 비교합니다.
  if v_reason is null then
    select * into v_last
    from public.save_audit
    where user_id = new.user_id and rejected is null
    order by at desc
    limit 1;

    if v_last.id is not null then
      v_seconds := greatest(extract(epoch from (now() - v_last.at)), 1);
      v_jump := v_gold - coalesce(v_last.gold, 0);

      -- 일괄 방출로 한 번에 크게 오를 수 있으므로 1천만 골드의 여유를 둡니다.
      -- 그 위는 어떤 정상 조작으로도 설명되지 않습니다.
      if v_jump > (v_seconds * 100000) + 10000000 then
        v_reason := format('gold jumped %s in %s seconds', v_jump, v_seconds);
      end if;

      -- 아래는 거부하지 않고 기록만 합니다. 미니게임을 연달아 돌리면 짧은
      -- 시간에 여러 판이 쌓이는 것이 정상이기 때문입니다.
      if v_played - coalesce(v_last.played, 0) > greatest(v_seconds, 60) then
        v_flag := format('played %s matches in %s seconds',
                         v_played - coalesce(v_last.played, 0), v_seconds);
      end if;
    end if;
  end if;

  -- (3) 뽑기 대비 카드 수. 이적시장·합성으로도 카드가 늘어나므로 거부하지 않고
  -- 기록만 합니다.
  if v_reason is null and v_pulls is not null and v_cards > v_pulls + 1000 then
    v_flag := concat_ws(' / ', v_flag,
                        format('cards %s vs pulls %s', v_cards, v_pulls));
  end if;

  insert into public.save_audit
    (user_id, gold, cards, pulls, played, season, rejected, flagged)
  values
    (new.user_id, v_gold, v_cards, v_pulls, v_played, v_season, v_reason, v_flag);

  if v_reason is not null then
    raise exception 'save rejected: %', v_reason using errcode = 'check_violation';
  end if;

  return new;
end $$;

drop trigger if exists guard_save_trigger on public.saves;
create trigger guard_save_trigger
  before insert or update on public.saves
  for each row execute function public.guard_save();
