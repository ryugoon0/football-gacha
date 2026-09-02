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
-- 거부는 "정상 플레이로는 절대 나올 수 없는 값"에만 겁니다. 의심스러운 정도는
-- 기록만 하고 통과시킵니다. 잘못 막아서 정상 플레이어의 진행이 사라지는 것이,
-- 조작을 한 번 놓치는 것보다 나쁩니다.
--
-- 저장은 트리거가 아니라 put_save() 함수를 거칩니다. 트리거에서 예외를 던지면
-- 같은 트랜잭션에 들어간 감사 기록까지 함께 사라져, 정작 남겨야 할 순간을
-- 기록하지 못하기 때문입니다. 함수는 예외 대신 결과를 돌려주므로 기록이 남습니다.

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
create index if not exists save_audit_alert_idx on public.save_audit (at desc)
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

-- 배열이 아닌 값이 와도 예외를 던지지 않습니다. 검사기가 죽으면 정상 저장까지
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

-- 판정만 합니다. 저장도 기록도 하지 않으므로 모니터링에서 재사용할 수 있습니다.
create or replace function public.judge_save(p_user uuid, p_data jsonb)
  returns table (out_rejected text, out_flagged text)
  language plpgsql
  stable
  security definer
  set search_path = public
as $$
declare
  v_gold    numeric := public.save_num(p_data, '{gold}');
  v_cards   int     := public.save_len(p_data, 'cards');
  v_pulls   numeric := public.save_num(p_data, '{pulls,total}');
  v_played  numeric := coalesce(public.save_num(p_data, '{record,w}'), 0)
                     + coalesce(public.save_num(p_data, '{record,d}'), 0)
                     + coalesce(public.save_num(p_data, '{record,l}'), 0);
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
    select sa.* into v_last
    from public.save_audit sa
    where sa.user_id = p_user and sa.rejected is null
    order by sa.at desc
    limit 1;

    if v_last.id is not null then
      v_seconds := greatest(extract(epoch from (now() - v_last.at)), 1);
      v_jump := v_gold - coalesce(v_last.gold, 0);

      -- 일괄 방출로 한 번에 크게 오를 수 있으므로 1천만 골드의 여유를 둡니다.
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

  -- (3) 뽑기 대비 카드 수. 이적시장·합성으로도 늘어나므로 기록만 합니다.
  if v_reason is null and v_pulls is not null and v_cards > v_pulls + 1000 then
    v_flag := concat_ws(' / ', v_flag, format('cards %s vs pulls %s', v_cards, v_pulls));
  end if;

  return query select v_reason, v_flag;
end $$;

-- 클라이언트가 세이브를 올리는 유일한 통로입니다.
create or replace function public.put_save(p_data jsonb)
  returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_j    record;
  v_gold bigint;
  v_diff bigint;
begin
  if v_user is null then
    return jsonb_build_object('ok', false, 'reason', 'not signed in');
  end if;
  if pg_column_size(p_data) > 524288 then
    return jsonb_build_object('ok', false, 'reason', 'save too large');
  end if;

  select j.out_rejected as rejected, j.out_flagged as flagged
    into v_j
    from public.judge_save(v_user, p_data) j;

  -- 예외를 던지지 않으므로 이 기록은 반드시 남습니다. 거부된 저장이야말로
  -- 남겨야 하는 기록입니다.
  insert into public.save_audit
    (user_id, gold, cards, pulls, played, season, rejected, flagged)
  values (
    v_user,
    public.save_num(p_data, '{gold}'),
    public.save_len(p_data, 'cards'),
    public.save_num(p_data, '{pulls,total}'),
    coalesce(public.save_num(p_data, '{record,w}'), 0)
      + coalesce(public.save_num(p_data, '{record,d}'), 0)
      + coalesce(public.save_num(p_data, '{record,l}'), 0),
    public.save_num(p_data, '{season,index}'),
    v_j.rejected,
    v_j.flagged
  );

  if v_j.rejected is not null then
    return jsonb_build_object('ok', false, 'reason', v_j.rejected);
  end if;

  insert into public.saves (user_id, data, updated_at)
  values (v_user, p_data, now())
  on conflict (user_id) do update
    set data = excluded.data, updated_at = excluded.updated_at;

  -- 원장을 세이브에 맞춥니다. 경기 보상처럼 아직 클라이언트가 계산하는 변동을
  -- 'client' 사유로 남겨, 골드의 모든 움직임이 한 줄씩 기록되게 합니다.
  -- 2단계는 이 'client' 줄을 서버가 계산한 사유로 하나씩 바꾸는 일입니다.
  if coalesce((select seeded from public.economy where user_id = v_user), false) then
    v_gold := coalesce(public.save_num(p_data, '{gold}'), 0)::bigint;
    v_diff := v_gold - public.gold_balance(v_user);
    if v_diff <> 0 then
      insert into public.gold_ledger (user_id, delta, reason)
      values (v_user, v_diff, 'client');
    end if;
  end if;

  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.put_save(jsonb) from public;
grant execute on function public.put_save(jsonb) to authenticated;

-- 직접 쓰기는 막습니다. 읽기는 본인 것만, 쓰기는 put_save()만.
drop policy if exists "saves are private" on public.saves;
drop policy if exists "players read their own save" on public.saves;
create policy "players read their own save" on public.saves
  for select to authenticated using (auth.uid() = user_id);
-- insert/update 정책이 없으므로 클라이언트의 직접 쓰기는 거부됩니다.
-- put_save()는 security definer라 이 정책을 거치지 않습니다.

drop trigger if exists guard_save_trigger on public.saves;

-- ---------------------------------------------------------------------------
-- 5. 모니터링 — 한 가지 신호를 믿지 않는다
-- ---------------------------------------------------------------------------
-- 조작을 한 가지 검사로 잡으려 하면, 그 검사를 피하는 방법 하나만 알면 전부
-- 통과합니다. 그래서 서로 다른 층에서 독립적으로 신호를 만들고, 겹치는 계정을
-- 위로 올립니다. 한 신호는 우연일 수 있지만 세 신호가 겹치면 우연이 아닙니다.
--
-- 여기 있는 것은 전부 뷰입니다. 원본 기록을 바꾸지 않으므로 규칙을 나중에
-- 고쳐도 과거 데이터를 다시 볼 수 있습니다.

-- (1) 거부·표시된 저장. 가장 직접적인 신호.
create or replace view public.watch_rejects as
  select user_id,
         count(*) filter (where rejected is not null) as rejects,
         count(*) filter (where flagged is not null)  as flags,
         max(at) as last_at,
         max(coalesce(rejected, flagged)) as sample
  from public.save_audit
  where at > now() - interval '30 days'
    and (rejected is not null or flagged is not null)
  group by user_id;

-- (2) 저장 빈도. 사람이 손으로 하는 플레이에는 한계가 있습니다. 자동화된
--     클라이언트는 여기서 드러납니다.
create or replace view public.watch_write_rate as
  select user_id,
         count(*) as writes_1h,
         min(at) as since
  from public.save_audit
  where at > now() - interval '1 hour'
  group by user_id
  having count(*) > 240;   -- 15초에 한 번꼴이 한 시간 내내

-- (3) 진행 속도. 골드가 시간당 얼마나 늘었는지를 계정끼리 비교합니다.
--     절대 기준이 아니라 또래 대비 이상치를 봅니다.
create or replace view public.watch_progress as
  with span as (
    select user_id,
           max(gold) - min(gold) as gold_gain,
           max(played) - min(played) as matches,
           extract(epoch from (max(at) - min(at))) / 3600 as hours
    from public.save_audit
    where at > now() - interval '7 days' and rejected is null
    group by user_id
    having extract(epoch from (max(at) - min(at))) > 3600
  )
  select user_id,
         gold_gain,
         matches,
         round(gold_gain / greatest(hours, 1)) as gold_per_hour,
         round((matches / greatest(hours, 1))::numeric, 1) as matches_per_hour
  from span;

-- (4) 되돌아간 진행. 정상 플레이에서 전적은 줄지 않습니다. 줄었다면 예전
--     세이브를 다시 올린 것이고, 보상만 챙기고 되감는 수법의 흔적입니다.
create or replace view public.watch_rollback as
  with pairs as (
    select user_id, at, played, gold,
           lag(played) over (partition by user_id order by at) as prev_played,
           lag(gold) over (partition by user_id order by at) as prev_gold
    from public.save_audit
    where rejected is null and at > now() - interval '30 days'
  )
  select user_id,
         count(*) as rollbacks,
         max(at) as last_at,
         max(prev_played - played) as biggest_drop
  from pairs
  where played < prev_played
  group by user_id;

-- (5) 게시판 도배. 조작과 별개로 서비스를 해치는 행동입니다.
create or replace view public.watch_spam as
  select user_id, count(*) as posts_1h, max(created_at) as last_at
  from public.posts
  where created_at > now() - interval '1 hour'
  group by user_id
  having count(*) > 20;

-- 모든 신호를 한 줄로 모읍니다. 겹칠수록 위로 올라옵니다.
create or replace view public.watchlist as
  with signals as (
    select user_id, 'reject' as signal, rejects as weight,
           format('거부 %s건 · 표시 %s건 (%s)', rejects, flags, sample) as detail,
           last_at
    from public.watch_rejects
    union all
    select user_id, 'write_rate', 1, format('1시간 저장 %s회', writes_1h), now()
    from public.watch_write_rate
    union all
    select user_id, 'gold_rate', 1, format('시간당 골드 %s', gold_per_hour), now()
    from public.watch_progress
    where gold_per_hour > 2000000
    union all
    select user_id, 'match_rate', 1, format('시간당 경기 %s판', matches_per_hour), now()
    from public.watch_progress
    where matches_per_hour > 200
    union all
    select user_id, 'rollback', rollbacks, format('되감기 %s회 (최대 %s판)', rollbacks, biggest_drop), last_at
    from public.watch_rollback
    union all
    select user_id, 'spam', 1, format('1시간 글 %s개', posts_1h), last_at
    from public.watch_spam
  )
  select user_id,
         count(distinct signal) as signals,
         sum(weight) as score,
         array_agg(distinct signal) as kinds,
         string_agg(detail, ' / ' order by detail) as detail,
         max(last_at) as last_at
  from signals
  group by user_id
  order by count(distinct signal) desc, sum(weight) desc;

-- 뷰는 만든 사람 권한으로 도는 것이 기본이라, 운영자인지 여기서 한 번 더
-- 확인합니다. 운영자가 아니면 빈 결과를 봅니다.
create or replace function public.watchlist_for_admin()
  returns table (
    user_id  uuid,
    email    text,
    signals  bigint,
    score    numeric,
    kinds    text[],
    detail   text,
    last_at  timestamptz
  )
  language sql
  stable
  security definer
  set search_path = public
as $$
  select w.user_id, u.email, w.signals, w.score, w.kinds, w.detail, w.last_at
  from public.watchlist w
  left join auth.users u on u.id = w.user_id
  where public.is_admin()
  order by w.signals desc, w.score desc
  limit 100;
$$;

revoke all on function public.watchlist_for_admin() from public;
grant execute on function public.watchlist_for_admin() to authenticated;

-- 서비스 전체 상태 한 줄. 개인이 아니라 추세를 봅니다.
create or replace function public.health_for_admin()
  returns jsonb
  language sql
  stable
  security definer
  set search_path = public
as $$
  select case when not public.is_admin() then '{}'::jsonb else jsonb_build_object(
    'saves_24h',    (select count(*) from public.save_audit where at > now() - interval '24 hours'),
    'rejects_24h',  (select count(*) from public.save_audit where at > now() - interval '24 hours' and rejected is not null),
    'flags_24h',    (select count(*) from public.save_audit where at > now() - interval '24 hours' and flagged is not null),
    'players_24h',  (select count(distinct user_id) from public.save_audit where at > now() - interval '24 hours'),
    'watchlist',    (select count(*) from public.watchlist),
    'watchlist_multi', (select count(*) from public.watchlist where signals > 1),
    'posts_24h',    (select count(*) from public.posts where created_at > now() - interval '24 hours')
  ) end;
$$;

revoke all on function public.health_for_admin() from public;
grant execute on function public.health_for_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- 6. 골드 원장과 서버 권한 뽑기 (1단계)
-- ---------------------------------------------------------------------------
-- 골드는 이제 숫자 하나가 아니라 **추가만 되는 거래 기록**입니다. 잔액은
-- 저장하는 값이 아니라 합계입니다. 돈이 걸리면 "지금 얼마인가"보다 "왜 그
-- 금액인가"가 중요해지고, 잔액만 있으면 다툼이 났을 때 설명할 수가 없습니다.
--
-- 이번 단계에서 서버가 완전히 소유하는 것은 **뽑기**입니다. 난수와 확률이
-- 서버에 있으므로 고지한 확률이 실제와 같음을 pull_log로 증명할 수 있습니다.
-- 경기 보상 같은 나머지 변동은 아직 클라이언트가 계산하지만, put_save가 그
-- 차액을 'client' 사유로 원장에 남기므로 **모든 골드 움직임이 한 줄씩 남습니다.**
-- 2단계는 그 'client' 줄을 서버가 계산한 사유로 하나씩 바꾸는 일입니다.

create table if not exists public.gold_ledger (
  id         bigserial primary key,
  user_id    uuid not null references auth.users on delete cascade,
  delta      bigint not null,
  -- 'opening' 최초 이관 · 'pull' 뽑기 · 'client' 아직 클라이언트가 계산하는 것
  reason     text not null,
  ref        text,
  created_at timestamptz not null default now()
);

create index if not exists gold_ledger_user_idx on public.gold_ledger (user_id, id desc);

alter table public.gold_ledger enable row level security;
-- 본인 것은 읽을 수 있습니다. 쓰기는 어떤 정책도 없으므로 함수를 통해서만.
drop policy if exists "players read their own ledger" on public.gold_ledger;
create policy "players read their own ledger" on public.gold_ledger
  for select to authenticated using (auth.uid() = user_id);

-- 뽑기 기록. 확률 고지의 근거이자, 나중에 재현해 볼 수 있는 원본입니다.
create table if not exists public.pull_log (
  id          bigserial primary key,
  user_id     uuid not null references auth.users on delete cascade,
  pack        text not null,
  cost        bigint not null,
  -- 서버가 만든 시드. 이것만 있으면 같은 결과를 다시 만들 수 있습니다.
  seed        text not null,
  -- 이 뽑기에 실제로 적용된 확률표. 나중에 표를 바꿔도 과거 판정을 설명할 수
  -- 있어야 하므로 그때의 값을 함께 남깁니다.
  rates       jsonb not null,
  pity_before int not null,
  pity_after  int not null,
  pity_hit    boolean not null default false,
  cards       jsonb not null,
  created_at  timestamptz not null default now()
);

create index if not exists pull_log_user_idx on public.pull_log (user_id, id desc);
create index if not exists pull_log_at_idx on public.pull_log (created_at desc);

alter table public.pull_log enable row level security;
drop policy if exists "players read their own pulls" on public.pull_log;
create policy "players read their own pulls" on public.pull_log
  for select to authenticated using (auth.uid() = user_id);

-- 천장 카운터. 세이브가 아니라 서버가 셉니다.
create table if not exists public.economy (
  user_id  uuid primary key references auth.users on delete cascade,
  pity     int not null default 0,
  seeded   boolean not null default false,
  seeded_at timestamptz
);

alter table public.economy enable row level security;
drop policy if exists "players read their own economy" on public.economy;
create policy "players read their own economy" on public.economy
  for select to authenticated using (auth.uid() = user_id);

create or replace function public.gold_balance(p_user uuid)
  returns bigint
  language sql
  stable
  security definer
  set search_path = public
as $$
  select coalesce(sum(delta), 0)::bigint from public.gold_ledger where user_id = p_user;
$$;

-- 기존 플레이어를 원장으로 옮깁니다. 한 번만 실행되며, 이후 호출은 아무 일도
-- 하지 않습니다. 이관 전에는 세이브의 골드가, 이후에는 원장이 진실입니다.
create or replace function public.seed_economy(p_gold bigint, p_pity int)
  returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_row  public.economy%rowtype;
begin
  if v_user is null then
    return jsonb_build_object('ok', false, 'reason', 'not signed in');
  end if;

  insert into public.economy (user_id, pity) values (v_user, greatest(coalesce(p_pity, 0), 0))
  on conflict (user_id) do nothing;

  select * into v_row from public.economy where user_id = v_user;
  if v_row.seeded then
    return jsonb_build_object('ok', true, 'already', true,
                              'balance', public.gold_balance(v_user), 'pity', v_row.pity);
  end if;

  -- 이관 금액도 사람이 정한 값이 아니라 기록으로 남습니다.
  insert into public.gold_ledger (user_id, delta, reason, ref)
  values (v_user, greatest(least(coalesce(p_gold, 0), 1000000000), 0), 'opening', 'migrate');

  update public.economy
     set seeded = true, seeded_at = now(), pity = greatest(coalesce(p_pity, 0), 0)
   where user_id = v_user;

  return jsonb_build_object('ok', true, 'already', false,
                            'balance', public.gold_balance(v_user),
                            'pity', greatest(coalesce(p_pity, 0), 0));
end $$;

revoke all on function public.seed_economy(bigint, int) from public;
grant execute on function public.seed_economy(bigint, int) to authenticated;

create or replace function public.economy_snapshot()
  returns jsonb
  language sql
  stable
  security definer
  set search_path = public
as $$
  select case when auth.uid() is null then jsonb_build_object('ok', false) else
    jsonb_build_object(
      'ok', true,
      'balance', public.gold_balance(auth.uid()),
      'pity', coalesce((select pity from public.economy where user_id = auth.uid()), 0),
      'seeded', coalesce((select seeded from public.economy where user_id = auth.uid()), false)
    ) end;
$$;

revoke all on function public.economy_snapshot() from public;
grant execute on function public.economy_snapshot() to authenticated;

-- 뽑기를 한 트랜잭션으로 확정합니다. **service_role만 부를 수 있습니다** —
-- 클라이언트가 직접 부를 수 있으면 원하는 카드를 넣어 달라고 할 수 있습니다.
create or replace function public.commit_pull(
  p_user        uuid,
  p_pack        text,
  p_cost        bigint,
  p_seed        text,
  p_rates       jsonb,
  p_pity_before int,
  p_pity_after  int,
  p_pity_hit    boolean,
  p_cards       jsonb
) returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_balance bigint;
  v_pull_id bigint;
begin
  -- 같은 사람의 동시 뽑기를 줄 세웁니다. 잔액을 읽고 쓰는 사이에 끼어들어
  -- 두 번 뽑는 것을 막습니다.
  perform pg_advisory_xact_lock(hashtext(p_user::text));

  v_balance := public.gold_balance(p_user);
  if v_balance < p_cost then
    return jsonb_build_object('ok', false, 'reason', 'not enough gold', 'balance', v_balance);
  end if;

  insert into public.pull_log
    (user_id, pack, cost, seed, rates, pity_before, pity_after, pity_hit, cards)
  values
    (p_user, p_pack, p_cost, p_seed, p_rates, p_pity_before, p_pity_after,
     coalesce(p_pity_hit, false), p_cards)
  returning id into v_pull_id;

  insert into public.gold_ledger (user_id, delta, reason, ref)
  values (p_user, -p_cost, 'pull', v_pull_id::text);

  insert into public.economy (user_id, pity) values (p_user, p_pity_after)
  on conflict (user_id) do update set pity = excluded.pity;

  return jsonb_build_object('ok', true, 'pull_id', v_pull_id,
                            'balance', public.gold_balance(p_user),
                            'pity', p_pity_after);
end $$;

revoke all on function public.commit_pull(uuid, text, bigint, text, jsonb, int, int, boolean, jsonb) from public;
revoke all on function public.commit_pull(uuid, text, bigint, text, jsonb, int, int, boolean, jsonb) from authenticated;
grant execute on function public.commit_pull(uuid, text, bigint, text, jsonb, int, int, boolean, jsonb) to service_role;
