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
  updated_at timestamptz not null default now(),
  -- 저장할 때마다 1씩 늘어납니다. 클라이언트가 자신이 기반으로 삼은 revision을
  -- 함께 보내면, put_save가 그 사이 다른 탭/기기가 먼저 저장하지 않았는지
  -- 확인하는 데 씁니다(compare-and-swap). 다중 탭에서 낡은 상태가 최신
  -- 진행도를 덮어쓰는 사고를 여기서 막습니다.
  revision   bigint not null default 0
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
  v_saved         jsonb;
  v_saved_played  numeric;
begin
  -- (1) 절대값: 어떤 플레이로도 도달할 수 없는 범위.
  if v_gold is null or v_gold < 0 or v_gold > 1e12 then
    v_reason := format('gold out of range: %s', coalesce(v_gold::text, 'null'));
  elsif v_cards > 5000 then
    v_reason := format('too many cards: %s', v_cards);
  end if;

  -- (2) 진행도 되감기: 정상 플레이라면 절대 줄지 않는 값들을 지금 저장된
  -- 세이브(public.saves)와 비교합니다. 카드 수는 방출·합성으로 정상적으로
  -- 줄어들 수 있어 여기 포함하지 않습니다. 다중 탭에서 낡은 세이브가
  -- 다시 올라오거나, 의도적으로 예전 고자원 세이브를 재전송하는 경로를
  -- 여기서 막습니다 — revision CAS(put_save)를 통과했더라도 한 번 더 봅니다.
  if v_reason is null then
    select data into v_saved from public.saves where user_id = p_user;
    if v_saved is not null then
      v_saved_played := coalesce(public.save_num(v_saved, '{record,w}'), 0)
                       + coalesce(public.save_num(v_saved, '{record,d}'), 0)
                       + coalesce(public.save_num(v_saved, '{record,l}'), 0);
      if v_played < v_saved_played then
        v_reason := format('progress rollback: played %s -> %s', v_saved_played, v_played);
      elsif coalesce(v_pulls, 0) < coalesce(public.save_num(v_saved, '{pulls,total}'), 0) then
        v_reason := format('progress rollback: pulls %s -> %s',
                            public.save_num(v_saved, '{pulls,total}'), v_pulls);
      elsif coalesce(public.save_num(p_data, '{season,index}'), 0)
            < coalesce(public.save_num(v_saved, '{season,index}'), 0) then
        v_reason := format('progress rollback: season %s -> %s',
                            public.save_num(v_saved, '{season,index}'),
                            public.save_num(p_data, '{season,index}'));
      elsif coalesce(public.save_num(p_data, '{trophies,cup}'), 0)
            < coalesce(public.save_num(v_saved, '{trophies,cup}'), 0) then
        v_reason := 'progress rollback: trophies.cup decreased';
      elsif coalesce(public.save_num(p_data, '{trophies,promotions}'), 0)
            < coalesce(public.save_num(v_saved, '{trophies,promotions}'), 0) then
        v_reason := 'progress rollback: trophies.promotions decreased';
      elsif coalesce(public.save_num(p_data, '{capacity}'), 0)
            < coalesce(public.save_num(v_saved, '{capacity}'), 0) then
        v_reason := 'progress rollback: capacity decreased';
      end if;
    end if;
  end if;

  -- (3) 증가 속도: 직전 통과 기록과 비교합니다.
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

  -- (4) 뽑기 대비 카드 수. 이적시장·합성으로도 늘어나므로 기록만 합니다.
  if v_reason is null and v_pulls is not null and v_cards > v_pulls + 1000 then
    v_flag := concat_ws(' / ', v_flag, format('cards %s vs pulls %s', v_cards, v_pulls));
  end if;

  return query select v_reason, v_flag;
end $$;

-- 클라이언트가 세이브를 올리는 유일한 통로입니다.
--
-- p_base_revision: 클라이언트가 이 저장을 만들 때 알고 있던 saves.revision.
-- 지금 저장된 revision과 다르면(=그 사이 다른 탭/기기가 먼저 저장했으면)
-- compare-and-swap 실패로 거부합니다. null이면(구버전 클라이언트, 또는
-- 아직 한 번도 revision을 받아본 적 없는 첫 저장) 이 검사를 건너뛰고
-- judge_save의 단조 필드 비교에만 기댑니다.
drop function if exists public.put_save(jsonb);

create or replace function public.put_save(p_data jsonb, p_base_revision bigint default null)
  returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_user             uuid := auth.uid();
  -- 일반 record 변수는 매칭되는 행이 없으면 "할당된 적 없음" 상태가 되어
  -- 필드 접근 시 예외를 던집니다. bigint 스칼라는 없으면 그냥 null이 되므로
  -- 이 함수를 처음 쓰는(세이브가 아직 없는) 계정에서도 안전합니다.
  v_current_revision bigint;
  v_j                record;
  v_gold             bigint;
  v_diff             bigint;
  v_revision         bigint;
begin
  if v_user is null then
    return jsonb_build_object('ok', false, 'reason', 'not signed in');
  end if;
  if pg_column_size(p_data) > 524288 then
    return jsonb_build_object('ok', false, 'reason', 'save too large');
  end if;

  -- 같은 계정의 저장이 동시에(다중 탭) 들어와도 아래 CAS 확인과 실제 쓰기
  -- 사이에 다른 저장이 끼어들지 못하도록 트랜잭션 동안 잠급니다.
  perform pg_advisory_xact_lock(hashtext('football-save'), hashtext(v_user::text));

  select revision into v_current_revision from public.saves where user_id = v_user;

  if p_base_revision is not null and v_current_revision is not null
     and p_base_revision <> v_current_revision then
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
      'stale_save_revision',
      null
    );
    return jsonb_build_object(
      'ok', false, 'reason', 'stale_save_revision', 'revision', v_current_revision
    );
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

  insert into public.saves (user_id, data, updated_at, revision)
  values (v_user, p_data, now(), coalesce(v_current_revision, 0) + 1)
  on conflict (user_id) do update
    set data = excluded.data, updated_at = excluded.updated_at, revision = excluded.revision
  returning revision into v_revision;

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

  return jsonb_build_object('ok', true, 'revision', v_revision);
end $$;

revoke all on function public.put_save(jsonb, bigint) from public;
grant execute on function public.put_save(jsonb, bigint) to authenticated;

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
--
--     judge_save가 이제 이런 시도 자체를 거부하므로(rejected로 남음),
--     통과한 저장만 보면 이 신호가 무력화됩니다. 그래서 시도 전체를 보되,
--     비교 기준은 "그 직전에 실제로 통과한 저장"으로 둡니다 — 거부된
--     시도끼리 비교하면 의미가 없기 때문입니다.
create or replace view public.watch_rollback as
  with accepted as (
    select user_id, at, played
    from public.save_audit
    where rejected is null and at > now() - interval '30 days'
  ),
  attempts as (
    select sa.user_id, sa.at, sa.played,
           (
             select a.played from accepted a
             where a.user_id = sa.user_id and a.at < sa.at
             order by a.at desc
             limit 1
           ) as prev_played
    from public.save_audit sa
    where sa.at > now() - interval '30 days'
  )
  select user_id,
         count(*) as rollbacks,
         max(at) as last_at,
         max(prev_played - played) as biggest_drop
  from attempts
  where prev_played is not null and played < prev_played
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

-- ---------------------------------------------------------------------------
-- 6b. 경기 판정 (SECURITY_ARCHITECTURE.md 3단계, 리그/컵/친선부터)
-- ---------------------------------------------------------------------------
-- draw-pack과 같은 모양이다: 클라이언트는 무엇을 하고 싶은지만 말하고
-- (스쿼드 배치·전술·어느 상대와), 결과가 무엇인지는 서버가 정한다.
-- 지금 범위: 경기 중 실시간 개입(전술 변경·교체)은 잠시 끈다 — 개입을
-- 서버가 접수하는 건 4단계(실시간 리그)의 일이다.

create table if not exists public.match_results (
  id              bigserial primary key,
  user_id         uuid not null references auth.users on delete cascade,
  competition     text not null check (competition in ('league', 'cup', 'friendly')),
  seed            text not null,
  engine_version  text not null,
  division        smallint not null check (division between 1 and 5),
  -- 아직 서버가 리그 대진을 갖고 있지 않으므로(3절 참고, 실유저 매칭은
  -- 그다음 단계) 상대 이름·평점은 클라이언트가 알려준 값을 받는다.
  -- 골드 보상은 상대 평점이 아니라 division과 승패로만 정해지므로
  -- (matchReward 참고), 상대를 부풀려도 보상이 늘지 않는다.
  opponent_name   text not null check (char_length(opponent_name) between 1 and 40),
  opponent_rating smallint not null check (opponent_rating between 0 and 200),
  venue           text not null check (venue in ('home', 'away', 'neutral')),
  score_for       smallint not null check (score_for between 0 and 30),
  score_against   smallint not null check (score_against between 0 and 30),
  result          text not null check (result in ('W', 'D', 'L')),
  reward          bigint not null check (reward >= 0),
  events          jsonb not null,
  created_at      timestamptz not null default now()
);

create index if not exists match_results_user_idx on public.match_results (user_id, id desc);

alter table public.match_results enable row level security;
drop policy if exists "players read their own match results" on public.match_results;
create policy "players read their own match results" on public.match_results
  for select to authenticated using (auth.uid() = user_id);

-- 경기를 한 트랜잭션으로 확정합니다. commit_pull과 같은 이유로
-- service_role만 부를 수 있습니다 — 클라이언트가 직접 부를 수 있으면
-- 원하는 스코어를 넣어 달라고 할 수 있습니다.
create or replace function public.commit_match(
  p_user            uuid,
  p_competition     text,
  p_seed            text,
  p_engine_version  text,
  p_division        int,
  p_opponent_name   text,
  p_opponent_rating int,
  p_venue           text,
  p_score_for       int,
  p_score_against   int,
  p_result          text,
  p_reward          bigint,
  p_events          jsonb
) returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_match_id bigint;
begin
  perform pg_advisory_xact_lock(hashtext(p_user::text));

  insert into public.match_results
    (user_id, competition, seed, engine_version, division, opponent_name,
     opponent_rating, venue, score_for, score_against, result, reward, events)
  values
    (p_user, p_competition, p_seed, p_engine_version, p_division, p_opponent_name,
     p_opponent_rating, p_venue, p_score_for, p_score_against, p_result, p_reward, p_events)
  returning id into v_match_id;

  if p_reward > 0 then
    insert into public.gold_ledger (user_id, delta, reason, ref)
    values (p_user, p_reward, 'match', v_match_id::text);
  end if;

  return jsonb_build_object(
    'ok', true,
    'matchId', v_match_id,
    'balance', public.gold_balance(p_user)
  );
end $$;

revoke all on function public.commit_match(
  uuid, text, text, text, int, text, int, text, int, int, text, bigint, jsonb
) from public;
revoke all on function public.commit_match(
  uuid, text, text, text, int, text, int, text, int, int, text, bigint, jsonb
) from authenticated;
grant execute on function public.commit_match(
  uuid, text, text, text, int, text, int, text, int, int, text, bigint, jsonb
) to service_role;

-- ---------------------------------------------------------------------------
-- 7. 운영 도구 — 밸런스 값
-- ---------------------------------------------------------------------------
-- 운영자가 개발자를 거치지 않고 돌릴 수 있는 값들입니다. 브라우저만 쓰는
-- 값이며, 뽑기 확률·팩 가격·천장은 여기 없습니다 — 그것들은 고지한 확률을
-- 증명하기 위해 Edge Function에 번들되어 있고, 데이터베이스에 사본을 두면
-- 조용히 어긋나는 두 번째 진실이 될 뿐입니다.
--
-- 상한과 하한을 값과 함께 저장합니다. 오타 하나로 게임이 망가지는 도구는
-- 없느니만 못하므로, 서버에서도 범위를 강제합니다.

create table if not exists public.game_config (
  key        text primary key,
  value      numeric not null,
  min_value  numeric not null,
  max_value  numeric not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users on delete set null
);

alter table public.game_config enable row level security;
-- 값은 게임이 읽어야 하므로 로그인한 사람 누구나 읽습니다. 쓰기는 정책이
-- 없으므로 함수를 통해서만, 그리고 운영자만.
drop policy if exists "players read the config" on public.game_config;
create policy "players read the config" on public.game_config
  for select to authenticated using (true);

-- 누가 언제 무엇을 얼마에서 얼마로 바꿨는지. 밸런스가 이상해졌을 때
-- 되짚을 수 있어야 합니다.
create table if not exists public.config_audit (
  id         bigserial primary key,
  key        text not null,
  before     numeric,
  after      numeric not null,
  changed_by uuid references auth.users on delete set null,
  at         timestamptz not null default now()
);

alter table public.config_audit enable row level security;
drop policy if exists "only operators read config history" on public.config_audit;
create policy "only operators read config history" on public.config_audit
  for select to authenticated using (public.is_admin());

-- 노브를 등록합니다. 이미 있으면 값은 두고 범위만 최신으로 맞춥니다 —
-- 운영자가 조절해 둔 값을 배포 때마다 되돌리지 않기 위해서입니다.
--
-- 클라이언트에서는 운영자 화면(BalancePanel/ShopPanel)만 이걸 부릅니다.
-- 하지만 security definer 함수는 기본적으로 PUBLIC 실행 권한을 갖고,
-- min_value/max_value를 통째로 새로 쓸 수 있으므로 — 범위를 원하는 값
-- 하나로 좁혀 넣으면(min=max=999999) 그 즉시 현재 value도 그 값으로
-- 당겨집니다 — is_admin() 확인 없이 두면 로그인한 아무나 이 경로로
-- 밸런스 값을 마음대로 바꿀 수 있습니다. set_game_config와 같은 방식으로
-- 막습니다.
create or replace function public.register_knob(
  p_key text, p_default numeric, p_min numeric, p_max numeric
) returns void
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  if not public.is_admin() then
    return;
  end if;
  insert into public.game_config (key, value, min_value, max_value)
  values (p_key, p_default, p_min, p_max)
  on conflict (key) do update
    set min_value = excluded.min_value,
        max_value = excluded.max_value,
        value = least(greatest(public.game_config.value, excluded.min_value), excluded.max_value);
end $$;

revoke all on function public.register_knob(text, numeric, numeric, numeric) from public;
grant execute on function public.register_knob(text, numeric, numeric, numeric) to authenticated;

create or replace function public.set_game_config(p_key text, p_value numeric)
  returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_row    public.game_config%rowtype;
  v_before numeric;
  v_next   numeric;
begin
  if not public.is_admin() then
    return jsonb_build_object('ok', false, 'reason', 'not an operator');
  end if;

  select * into v_row from public.game_config where key = p_key;
  if v_row.key is null then
    return jsonb_build_object('ok', false, 'reason', 'unknown key');
  end if;
  -- Postgres의 numeric은 IEEE와 달리 NaN을 자기 자신과 같다고 봅니다. 그래서
  -- 'NaN <> NaN'으로는 걸러지지 않고, 정렬에서는 가장 큰 값으로 취급되어
  -- 그대로 두면 최댓값으로 조용히 설정됩니다.
  if p_value is null or p_value = 'NaN'::numeric then
    return jsonb_build_object('ok', false, 'reason', 'not a number');
  end if;

  v_before := v_row.value;
  -- 범위 밖은 거절하지 않고 범위 안으로 당깁니다. 슬라이더를 끝까지 민 것을
  -- 오류로 돌려주면 쓰기 불편하기만 합니다.
  v_next := least(greatest(p_value, v_row.min_value), v_row.max_value);

  update public.game_config
     set value = v_next, updated_at = now(), updated_by = auth.uid()
   where key = p_key;

  insert into public.config_audit (key, before, after, changed_by)
  values (p_key, v_before, v_next, auth.uid());

  return jsonb_build_object('ok', true, 'key', p_key, 'value', v_next,
                            'clamped', v_next <> p_value);
end $$;

revoke all on function public.set_game_config(text, numeric) from public;
grant execute on function public.set_game_config(text, numeric) to authenticated;

create or replace function public.config_history()
  returns table (key text, before numeric, after numeric, email text, at timestamptz)
  language sql
  stable
  security definer
  set search_path = public
as $$
  select c.key, c.before, c.after, u.email, c.at
  from public.config_audit c
  left join auth.users u on u.id = c.changed_by
  where public.is_admin()
  order by c.id desc
  limit 50;
$$;

revoke all on function public.config_history() from public;
grant execute on function public.config_history() to authenticated;

-- ---------------------------------------------------------------------------
-- 8. 공개 클럽 스쿼드
-- ---------------------------------------------------------------------------
-- 세이브 전체를 공개하지 않습니다. 감독이 동의한 경우에만 클럽명, 디비전,
-- 전력, 포메이션과 선수 id/레벨의 작은 스냅샷만 공개합니다. 카드 uid, 골드,
-- 전술, 이메일은 이 테이블에 들어가지 않습니다.
create table if not exists public.public_club_squads (
  user_id     uuid primary key references auth.users on delete cascade,
  club_name   text not null check (char_length(club_name) between 1 and 30),
  division    smallint not null check (division between 1 and 5),
  rating      smallint not null check (rating between 0 and 200),
  formation   text not null check (formation in ('4-3-3', '4-4-2', '4-2-3-1', '3-5-2')),
  lineup      jsonb not null default '[]'::jsonb,
  is_public   boolean not null default false,
  updated_at  timestamptz not null default now(),
  constraint public_club_squads_lineup_array check (jsonb_typeof(lineup) = 'array'),
  constraint public_club_squads_lineup_size check (jsonb_array_length(lineup) <= 25)
);

create index if not exists public_club_squads_rating_idx
  on public.public_club_squads (rating desc, updated_at desc)
  where is_public;

alter table public.public_club_squads enable row level security;

drop policy if exists "public squads are readable" on public.public_club_squads;
create policy "public squads are readable" on public.public_club_squads
  for select using (is_public or auth.uid() = user_id);

grant select on public.public_club_squads to anon, authenticated;

create or replace function public.set_public_club_squad(
  p_visible boolean,
  p_club_name text,
  p_division integer,
  p_rating integer,
  p_formation text,
  p_lineup jsonb
) returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_member jsonb;
begin
  if v_user is null then
    return jsonb_build_object('ok', false, 'reason', 'not signed in');
  end if;
  if p_club_name is null or char_length(trim(p_club_name)) not between 1 and 30 then
    return jsonb_build_object('ok', false, 'reason', 'invalid club name');
  end if;
  if p_division not between 1 and 5 or p_rating not between 0 and 200 then
    return jsonb_build_object('ok', false, 'reason', 'invalid club rating');
  end if;
  if p_formation not in ('4-3-3', '4-4-2', '4-2-3-1', '3-5-2') then
    return jsonb_build_object('ok', false, 'reason', 'invalid formation');
  end if;
  if p_lineup is null or jsonb_typeof(p_lineup) <> 'array' or jsonb_array_length(p_lineup) > 25 then
    return jsonb_build_object('ok', false, 'reason', 'invalid lineup');
  end if;

  for v_member in select value from jsonb_array_elements(p_lineup)
  loop
    if jsonb_typeof(v_member) <> 'object'
       or not (v_member ? 'playerId' and v_member ? 'level' and v_member ? 'role' and v_member ? 'slot')
       or jsonb_typeof(v_member -> 'playerId') <> 'string'
       or jsonb_typeof(v_member -> 'level') <> 'number'
       or (v_member ->> 'role') not in ('starter', 'bench')
       or jsonb_typeof(v_member -> 'slot') <> 'string'
       or (v_member ->> 'level')::integer not between 1 and 10 then
      return jsonb_build_object('ok', false, 'reason', 'invalid lineup member');
    end if;
  end loop;

  insert into public.public_club_squads
    (user_id, club_name, division, rating, formation, lineup, is_public, updated_at)
  values
    (v_user, trim(p_club_name), p_division, p_rating, p_formation, p_lineup, p_visible, now())
  on conflict (user_id) do update
    set club_name = excluded.club_name,
        division = excluded.division,
        rating = excluded.rating,
        formation = excluded.formation,
        lineup = excluded.lineup,
        is_public = excluded.is_public,
        updated_at = excluded.updated_at;

  return jsonb_build_object('ok', true, 'visible', p_visible, 'updated_at', now());
end $$;

revoke all on function public.set_public_club_squad(boolean, text, integer, integer, text, jsonb) from public;
grant execute on function public.set_public_club_squad(boolean, text, integer, integer, text, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- 9. 주간 리그·컵 대회 시스템 (docs/WEEKLY_TOURNAMENT.md)
-- ---------------------------------------------------------------------------
-- 대진 생성 알고리즘(라운드로빈·컵 브래킷) 자체는 여기 SQL로 다시 쓰지
-- 않는다. lib/weeklyLeague/schedule.ts·cup.ts가 이미 순수 함수로 만들고
-- 테스트돼 있으므로, Edge Function이 그 결과를 JSONB로 만들어 보내고 여기
-- RPC는 "한 번만 저장되게" 트랜잭션·잠금·중복 방지만 책임진다.
--
-- 컵은 8강·4강·결승 대진이 이전 라운드 결과가 나와야 정해지므로, 한 번에
-- 다 만들지 않는다. 리그 90경기와 컵 16강만 그룹 생성 시점에 전부 알 수
-- 있고, 8강부터는 이전 스테이지가 끝난 뒤 seed_cup_stage_ties를 다시
-- 부른다. 이 스키마가 반영된 시점에는 아직 Phase 3(크론·자동 진행·실제
-- 배정 알고리즘)이 없다 — 테이블과 저장 RPC만 있다.

create table if not exists public.weekly_league_groups (
  id               bigserial primary key,
  tier             smallint not null check (tier >= 0),
  week_id          text not null check (char_length(week_id) between 1 and 20),
  status           text not null check (status in ('forming', 'active', 'finished')) default 'forming',
  -- 스케줄 생성 규칙 버전. 지금은 전부 1 — 규칙이 바뀌면 새 값을 쓰고 옛 값은 그대로 둔다.
  schedule_version smallint not null default 1,
  created_at       timestamptz not null default now(),
  finished_at      timestamptz
);

create index if not exists weekly_league_groups_tier_week_idx
  on public.weekly_league_groups (tier, week_id);

alter table public.weekly_league_groups enable row level security;
drop policy if exists "groups are readable" on public.weekly_league_groups;
create policy "groups are readable" on public.weekly_league_groups
  for select to authenticated using (true);

create table if not exists public.weekly_league_members (
  group_id  bigint not null references public.weekly_league_groups(id) on delete cascade,
  slot      smallint not null check (slot between 0 and 15),
  kind      text not null check (kind in ('user', 'ai')),
  user_id   uuid references auth.users on delete set null,
  club_name text not null check (char_length(club_name) between 1 and 30),
  badge     text not null default '',
  rating    smallint not null check (rating between 0 and 200),
  joined_at timestamptz not null default now(),
  primary key (group_id, slot),
  unique (group_id, user_id),
  constraint weekly_league_members_kind_user check (
    (kind = 'user' and user_id is not null) or (kind = 'ai' and user_id is null)
  )
);

alter table public.weekly_league_members enable row level security;
drop policy if exists "members are readable" on public.weekly_league_members;
create policy "members are readable" on public.weekly_league_members
  for select to authenticated using (true);

create table if not exists public.weekly_schedule_slots (
  week_id          text not null check (char_length(week_id) between 1 and 20),
  slot_index       smallint not null check (slot_index between 0 and 104),
  day_of_week      text not null check (day_of_week in ('MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN')),
  local_hour       smallint not null check (local_hour between 9 and 23),
  type             text not null check (type in ('OPENING_PLACEMENT', 'LEAGUE', 'CUP_A', 'CUP_B', 'MASTERS_FINAL')),
  cup_stage        text check (cup_stage in ('R16', 'QF', 'SF', 'FINAL')),
  leg              smallint check (leg in (1, 2)),
  scheduled_at_utc timestamptz not null,
  primary key (week_id, slot_index)
);

alter table public.weekly_schedule_slots enable row level security;
drop policy if exists "slots are readable" on public.weekly_schedule_slots;
create policy "slots are readable" on public.weekly_schedule_slots
  for select to authenticated using (true);

create table if not exists public.weekly_competitions (
  id           bigserial primary key,
  group_id     bigint not null references public.weekly_league_groups(id) on delete cascade,
  type         text not null check (type in ('OPENING_PLACEMENT', 'LEAGUE', 'CUP_A', 'CUP_B', 'MASTERS_FINAL')),
  display_name text not null,
  rules_config jsonb not null default '{}'::jsonb,
  status       text not null check (status in ('pending', 'active', 'finished')) default 'pending',
  unique (group_id, type)
);

alter table public.weekly_competitions enable row level security;
drop policy if exists "competitions are readable" on public.weekly_competitions;
create policy "competitions are readable" on public.weekly_competitions
  for select to authenticated using (true);

-- 컵 타이와 fixture가 서로를 참조해서(순환 FK) fixture 테이블을 먼저
-- 만들고 나중에 컵 타이 쪽 FK를 건다.

create table if not exists public.weekly_fixtures (
  id               bigserial primary key,
  group_id         bigint not null references public.weekly_league_groups(id) on delete cascade,
  competition_id   bigint not null references public.weekly_competitions(id) on delete cascade,
  round            smallint check (round between 0 and 89),
  cup_tie_id       bigint,
  leg              smallint check (leg in (1, 2)),
  neutral_venue    boolean not null default false,
  home_slot        smallint not null check (home_slot between 0 and 15),
  away_slot        smallint not null check (away_slot between 0 and 15),
  scheduled_at_utc timestamptz not null,
  status           text not null check (status in ('pending', 'played')) default 'pending',
  simulation_seed  text,
  score_home       smallint check (score_home between 0 and 30),
  score_away       smallint check (score_away between 0 and 30),
  events           jsonb,
  settled_at       timestamptz,
  constraint weekly_fixtures_distinct_clubs check (home_slot <> away_slot)
);

create index if not exists weekly_fixtures_group_idx on public.weekly_fixtures (group_id, round);
create index if not exists weekly_fixtures_pending_idx
  on public.weekly_fixtures (scheduled_at_utc) where status = 'pending';
create unique index if not exists weekly_fixtures_home_slot_time_idx
  on public.weekly_fixtures (group_id, scheduled_at_utc, home_slot);
create unique index if not exists weekly_fixtures_away_slot_time_idx
  on public.weekly_fixtures (group_id, scheduled_at_utc, away_slot);

alter table public.weekly_fixtures enable row level security;
drop policy if exists "fixtures are readable" on public.weekly_fixtures;
create policy "fixtures are readable" on public.weekly_fixtures
  for select to authenticated using (true);

create table if not exists public.weekly_cup_ties (
  id                    bigserial primary key,
  competition_id        bigint not null references public.weekly_competitions(id) on delete cascade,
  stage                 text not null check (stage in ('R16', 'QF', 'SF', 'FINAL')),
  home_slot              smallint not null check (home_slot between 0 and 15),
  away_slot              smallint not null check (away_slot between 0 and 15),
  first_leg_fixture_id   bigint references public.weekly_fixtures(id),
  second_leg_fixture_id  bigint references public.weekly_fixtures(id),
  aggregate_home_score   smallint,
  aggregate_away_score   smallint,
  winner_slot            smallint,
  decided_by             text check (decided_by in ('AGGREGATE', 'EXTRA_TIME', 'PENALTIES', 'REGULATION')),
  constraint weekly_cup_ties_distinct_clubs check (home_slot <> away_slot),
  unique (competition_id, stage, home_slot, away_slot)
);

create index if not exists weekly_cup_ties_competition_idx on public.weekly_cup_ties (competition_id, stage);

alter table public.weekly_cup_ties enable row level security;
drop policy if exists "cup ties are readable" on public.weekly_cup_ties;
create policy "cup ties are readable" on public.weekly_cup_ties
  for select to authenticated using (true);

alter table public.weekly_fixtures
  add constraint weekly_fixtures_cup_tie_fk foreign key (cup_tie_id)
  references public.weekly_cup_ties(id) on delete cascade;

create or replace function public.seed_weekly_schedule_slots(p_week_id text, p_slots jsonb)
  returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_existing int;
begin
  perform pg_advisory_xact_lock(hashtext('weekly_schedule:' || p_week_id));

  select count(*) into v_existing from public.weekly_schedule_slots where week_id = p_week_id;
  if v_existing > 0 then
    return jsonb_build_object('ok', true, 'inserted', 0, 'reason', 'already seeded');
  end if;

  insert into public.weekly_schedule_slots
    (week_id, slot_index, day_of_week, local_hour, type, cup_stage, leg, scheduled_at_utc)
  select
    p_week_id,
    (slot->>'index')::smallint,
    slot->>'day',
    (slot->>'hour')::smallint,
    slot->>'type',
    slot->>'cupStage',
    (slot->>'leg')::smallint,
    (slot->>'scheduledAtUtc')::timestamptz
  from jsonb_array_elements(p_slots) as slot;

  return jsonb_build_object('ok', true, 'inserted', jsonb_array_length(p_slots));
end $$;

revoke all on function public.seed_weekly_schedule_slots(text, jsonb) from public;
revoke all on function public.seed_weekly_schedule_slots(text, jsonb) from authenticated;
grant execute on function public.seed_weekly_schedule_slots(text, jsonb) to service_role;

create or replace function public.create_weekly_league_group(
  p_tier int,
  p_week_id text,
  p_members jsonb
) returns bigint
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_group_id bigint;
begin
  if jsonb_array_length(p_members) <> 16 then
    raise exception 'create_weekly_league_group: expected 16 members, got %', jsonb_array_length(p_members);
  end if;

  insert into public.weekly_league_groups (tier, week_id)
  values (p_tier, p_week_id)
  returning id into v_group_id;

  insert into public.weekly_league_members (group_id, slot, kind, user_id, club_name, badge, rating)
  select
    v_group_id,
    (member->>'slot')::smallint,
    member->>'kind',
    nullif(member->>'userId', '')::uuid,
    member->>'clubName',
    coalesce(member->>'badge', ''),
    (member->>'rating')::smallint
  from jsonb_array_elements(p_members) as member;

  return v_group_id;
end $$;

revoke all on function public.create_weekly_league_group(int, text, jsonb) from public;
revoke all on function public.create_weekly_league_group(int, text, jsonb) from authenticated;
grant execute on function public.create_weekly_league_group(int, text, jsonb) to service_role;

create or replace function public.seed_weekly_competitions(p_group_id bigint)
  returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  insert into public.weekly_competitions (group_id, type, display_name)
  values
    (p_group_id, 'OPENING_PLACEMENT', '개막 배치 리그'),
    (p_group_id, 'LEAGUE', '리그'),
    (p_group_id, 'CUP_A', 'Cup A'),
    (p_group_id, 'CUP_B', 'Cup B'),
    (p_group_id, 'MASTERS_FINAL', 'Masters Final')
  on conflict (group_id, type) do nothing;

  return (
    select jsonb_object_agg(type, id)
    from public.weekly_competitions
    where group_id = p_group_id
  );
end $$;

revoke all on function public.seed_weekly_competitions(bigint) from public;
revoke all on function public.seed_weekly_competitions(bigint) from authenticated;
grant execute on function public.seed_weekly_competitions(bigint) to service_role;

create or replace function public.seed_league_fixtures(
  p_group_id bigint,
  p_competition_id bigint,
  p_fixtures jsonb
) returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_existing int;
begin
  perform pg_advisory_xact_lock(hashtext('weekly_league_fixtures:' || p_competition_id::text));

  select count(*) into v_existing from public.weekly_fixtures where competition_id = p_competition_id;
  if v_existing > 0 then
    return jsonb_build_object('ok', true, 'inserted', 0, 'reason', 'already seeded');
  end if;

  insert into public.weekly_fixtures (
    group_id, competition_id, round, home_slot, away_slot, scheduled_at_utc
  )
  select
    p_group_id,
    p_competition_id,
    (f->>'round')::smallint,
    (f->>'homeSlot')::smallint,
    (f->>'awaySlot')::smallint,
    (f->>'scheduledAtUtc')::timestamptz
  from jsonb_array_elements(p_fixtures) as f;

  return jsonb_build_object('ok', true, 'inserted', jsonb_array_length(p_fixtures));
end $$;

revoke all on function public.seed_league_fixtures(bigint, bigint, jsonb) from public;
revoke all on function public.seed_league_fixtures(bigint, bigint, jsonb) from authenticated;
grant execute on function public.seed_league_fixtures(bigint, bigint, jsonb) to service_role;

create or replace function public.seed_cup_stage_ties(
  p_group_id bigint,
  p_competition_id bigint,
  p_stage text,
  p_ties jsonb
) returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_existing int;
  v_tie jsonb;
  v_tie_id bigint;
  v_leg1_id bigint;
  v_leg2_id bigint;
begin
  perform pg_advisory_xact_lock(hashtext('weekly_cup_stage:' || p_competition_id::text || ':' || p_stage));

  select count(*) into v_existing
  from public.weekly_cup_ties
  where competition_id = p_competition_id and stage = p_stage;
  if v_existing > 0 then
    return jsonb_build_object('ok', true, 'inserted', 0, 'reason', 'already seeded');
  end if;

  for v_tie in select * from jsonb_array_elements(p_ties)
  loop
    insert into public.weekly_cup_ties (competition_id, stage, home_slot, away_slot)
    values (
      p_competition_id,
      p_stage,
      (v_tie->>'homeSlot')::smallint,
      (v_tie->>'awaySlot')::smallint
    )
    returning id into v_tie_id;

    insert into public.weekly_fixtures (
      group_id, competition_id, cup_tie_id, leg, neutral_venue,
      home_slot, away_slot, scheduled_at_utc
    )
    values (
      p_group_id, p_competition_id, v_tie_id,
      case when p_stage = 'FINAL' then null else 1 end,
      p_stage = 'FINAL',
      (v_tie->>'homeSlot')::smallint,
      (v_tie->>'awaySlot')::smallint,
      (v_tie->'leg1ScheduledAtUtc' #>> '{}')::timestamptz
    )
    returning id into v_leg1_id;

    update public.weekly_cup_ties set first_leg_fixture_id = v_leg1_id where id = v_tie_id;

    if p_stage <> 'FINAL' then
      insert into public.weekly_fixtures (
        group_id, competition_id, cup_tie_id, leg, neutral_venue,
        home_slot, away_slot, scheduled_at_utc
      )
      values (
        p_group_id, p_competition_id, v_tie_id, 2, false,
        (v_tie->>'awaySlot')::smallint,
        (v_tie->>'homeSlot')::smallint,
        (v_tie->'leg2ScheduledAtUtc' #>> '{}')::timestamptz
      )
      returning id into v_leg2_id;

      update public.weekly_cup_ties set second_leg_fixture_id = v_leg2_id where id = v_tie_id;
    end if;
  end loop;

  return jsonb_build_object('ok', true, 'inserted', jsonb_array_length(p_ties));
end $$;

revoke all on function public.seed_cup_stage_ties(bigint, bigint, text, jsonb) from public;
revoke all on function public.seed_cup_stage_ties(bigint, bigint, text, jsonb) from authenticated;
grant execute on function public.seed_cup_stage_ties(bigint, bigint, text, jsonb) to service_role;

-- ---------------------------------------------------------------------------
-- 10. 주간 대회 경기 자동 정산 — 임시 근사치 (docs/WEEKLY_TOURNAMENT.md)
-- ---------------------------------------------------------------------------
-- 진짜 카드·전술 기반 엔진으로 정산하려면 이 리그용 스쿼드를 유저가 저장하는
-- 화면이 먼저 있어야 하는데 아직 없다. 지금은 weekly_league_members.rating
-- 하나로 lib/league.ts의 simulateAiMatch와 같은 포아송 모델을 SQL로 옮겨
-- 쓴다 — "로직은 한 벌" 원칙에서 벗어나는 걸 알면서 하는 선택. 실제 엔진이
-- 붙으면 이 함수는 은퇴시키고 Edge Function 기반 정산으로 옮긴다.

create extension if not exists pg_cron;

create or replace function public._weekly_poisson_goal(p_lambda numeric)
  returns int
  language plpgsql
as $$
declare
  v_limit numeric := exp(-p_lambda);
  v_goals int := 0;
  v_product numeric := random();
begin
  while v_product > v_limit and v_goals < 9 loop
    v_goals := v_goals + 1;
    v_product := v_product * random();
  end loop;
  return v_goals;
end $$;

revoke all on function public._weekly_poisson_goal(numeric) from public;
revoke all on function public._weekly_poisson_goal(numeric) from authenticated;

create or replace function public.settle_due_weekly_fixtures(p_limit int default 500)
  returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_row record;
  v_count int := 0;
  v_home_rating smallint;
  v_away_rating smallint;
  v_diff numeric;
  v_lambda_home numeric;
  v_lambda_away numeric;
begin
  for v_row in
    select id, group_id, home_slot, away_slot
    from public.weekly_fixtures
    where status = 'pending' and scheduled_at_utc <= now()
    order by scheduled_at_utc
    limit p_limit
    for update skip locked
  loop
    select rating into v_home_rating from public.weekly_league_members
      where group_id = v_row.group_id and slot = v_row.home_slot;
    select rating into v_away_rating from public.weekly_league_members
      where group_id = v_row.group_id and slot = v_row.away_slot;

    v_diff := coalesce(v_home_rating, 60) + 3 - coalesce(v_away_rating, 60);
    v_lambda_home := greatest(0.25, least(4.5, 1.3 + v_diff / 22));
    v_lambda_away := greatest(0.25, least(4.5, 1.3 - v_diff / 22));

    update public.weekly_fixtures
      set score_home = public._weekly_poisson_goal(v_lambda_home),
          score_away = public._weekly_poisson_goal(v_lambda_away),
          status = 'played',
          settled_at = now()
      where id = v_row.id;

    v_count := v_count + 1;
  end loop;

  return jsonb_build_object('ok', true, 'settled', v_count);
end $$;

revoke all on function public.settle_due_weekly_fixtures(int) from public;
revoke all on function public.settle_due_weekly_fixtures(int) from authenticated;
grant execute on function public.settle_due_weekly_fixtures(int) to service_role;

select cron.unschedule('settle-weekly-fixtures')
  where exists (select 1 from cron.job where jobname = 'settle-weekly-fixtures');

select cron.schedule('settle-weekly-fixtures', '*/5 * * * *', $$select public.settle_due_weekly_fixtures()$$);

-- ---------------------------------------------------------------------------
-- 11. 개막 배치 리그 자동 생성 (docs/WEEKLY_TOURNAMENT.md)
-- ---------------------------------------------------------------------------
-- 대진 "패턴"은 클럽이 누구인지와 무관하게 항상 같다
-- (lib/weeklyLeague/placement.ts의 generatePlacementFixtures 출력). 그래서
-- 그 알고리즘을 SQL로 다시 짜는 대신 결과값을 정적 표로 저장해 두고, 이
-- 함수는 "누가 몇 번 슬롯인지"만 자동으로 정한다.

create table if not exists public.weekly_placement_fixture_template (
  round     smallint not null,
  home_slot smallint not null check (home_slot between 0 and 15),
  away_slot smallint not null check (away_slot between 0 and 15),
  primary key (round, home_slot, away_slot)
);

-- generatePlacementFixtures(['0'..'15'])의 실제 출력을 그대로 옮긴 것.
-- lib/weeklyLeague/placement.ts를 바꾸면 이 표도 다시 뽑아 갱신해야 한다.
insert into public.weekly_placement_fixture_template (round, home_slot, away_slot)
values
(0,0,15),(0,1,14),(0,2,13),(0,3,12),(0,4,11),(0,5,10),(0,6,9),(0,7,8),(1,0,14),(1,15,13),(1,1,12),(1,2,11),(1,3,10),(1,4,9),(1,5,8),(1,6,7),(2,0,13),(2,14,12),(2,15,11),(2,1,10),(2,2,9),(2,3,8),(2,4,7),(2,5,6),(3,0,12),(3,13,11),(3,14,10),(3,15,9),(3,1,8),(3,2,7),(3,3,6),(3,4,5),(4,0,11),(4,12,10),(4,13,9),(4,14,8),(4,15,7),(4,1,6),(4,2,5),(4,3,4),(5,0,10),(5,11,9),(5,12,8),(5,13,7),(5,14,6),(5,15,5),(5,1,4),(5,2,3),(6,0,9),(6,10,8),(6,11,7),(6,12,6),(6,13,5),(6,14,4),(6,15,3),(6,1,2),(7,0,8),(7,9,7),(7,10,6),(7,11,5),(7,12,4),(7,13,3),(7,14,2),(7,15,1),(8,0,7),(8,8,6),(8,9,5),(8,10,4),(8,11,3),(8,12,2),(8,13,1),(8,14,15),(9,0,6),(9,7,5),(9,8,4),(9,9,3),(9,10,2),(9,11,1),(9,12,15),(9,13,14),(10,0,5),(10,6,4),(10,7,3),(10,8,2),(10,9,1),(10,10,15),(10,11,14),(10,12,13),(11,0,4),(11,5,3),(11,6,2),(11,7,1),(11,8,15),(11,9,14),(11,10,13),(11,11,12),(12,0,3),(12,4,2),(12,5,1),(12,6,15),(12,7,14),(12,8,13),(12,9,12),(12,10,11),(13,0,2),(13,3,1),(13,4,15),(13,5,14),(13,6,13),(13,7,12),(13,8,11),(13,9,10),(14,0,1),(14,2,15),(14,3,14),(14,4,13),(14,5,12),(14,6,11),(14,7,10),(14,8,9),(15,15,0),(15,14,1),(15,13,2),(15,12,3),(15,11,4),(15,10,5),(15,9,6),(15,8,7),(16,14,0),(16,13,15),(16,12,1),(16,11,2),(16,10,3),(16,9,4),(16,8,5),(16,7,6),(17,13,0),(17,12,14),(17,11,15),(17,10,1),(17,9,2),(17,8,3),(17,7,4),(17,6,5),(18,12,0),(18,11,13),(18,10,14),(18,9,15),(18,8,1),(18,7,2),(18,6,3),(18,5,4),(19,11,0),(19,10,12),(19,9,13),(19,8,14),(19,7,15),(19,6,1),(19,5,2),(19,4,3),(20,10,0),(20,9,11),(20,8,12),(20,7,13),(20,6,14),(20,5,15),(20,4,1),(20,3,2),(21,9,0),(21,8,10),(21,7,11),(21,6,12),(21,5,13),(21,4,14),(21,3,15),(21,2,1),(22,8,0),(22,7,9),(22,6,10),(22,5,11),(22,4,12),(22,3,13),(22,2,14),(22,1,15),(23,7,0),(23,6,8),(23,5,9),(23,4,10),(23,3,11),(23,2,12),(23,1,13),(23,15,14),(24,6,0),(24,5,7),(24,4,8),(24,3,9),(24,2,10),(24,1,11),(24,15,12),(24,14,13),(25,5,0),(25,4,6),(25,3,7),(25,2,8),(25,1,9),(25,15,10),(25,14,11),(25,13,12),(26,4,0),(26,3,5),(26,2,6),(26,1,7),(26,15,8),(26,14,9),(26,13,10),(26,12,11),(27,3,0),(27,2,4),(27,1,5),(27,15,6),(27,14,7),(27,13,8),(27,12,9),(27,11,10),(28,2,0),(28,1,3),(28,15,4),(28,14,5),(28,13,6),(28,12,7),(28,11,8),(28,10,9),(29,1,0),(29,15,2),(29,14,3),(29,13,4),(29,12,5),(29,11,6),(29,10,7),(29,9,8),(30,0,15),(30,1,14),(30,2,13),(30,3,12),(30,4,11),(30,5,10),(30,6,9),(30,7,8),(31,14,0),(31,15,13),(31,12,1),(31,11,2),(31,10,3),(31,9,4),(31,8,5),(31,6,7),(32,13,0),(32,14,12),(32,15,11),(32,1,10),(32,2,9),(32,3,8),(32,4,7),(32,5,6),(33,0,12),(33,13,11),(33,14,10),(33,15,9),(33,1,8),(33,2,7),(33,3,6),(33,4,5),(34,0,11),(34,12,10),(34,13,9),(34,14,8),(34,15,7),(34,1,6),(34,2,5),(34,3,4),(35,0,10),(35,11,9),(35,12,8),(35,7,13),(35,14,6),(35,5,15),(35,1,4),(35,2,3),(36,9,0),(36,10,8),(36,11,7),(36,12,6),(36,13,5),(36,14,4),(36,15,3),(36,1,2),(37,8,0),(37,9,7),(37,10,6),(37,5,11),(37,4,12),(37,13,3),(37,14,2),(37,15,1),(38,0,7),(38,8,6),(38,9,5),(38,10,4),(38,11,3),(38,12,2),(38,13,1),(38,14,15),(39,6,0),(39,7,5),(39,8,4),(39,3,9),(39,2,10),(39,11,1),(39,12,15),(39,13,14),(40,0,5),(40,6,4),(40,7,3),(40,8,2),(40,9,1),(40,10,15),(40,11,14),(40,12,13),(41,4,0),(41,5,3),(41,6,2),(41,7,1),(41,15,8),(41,9,14),(41,10,13),(41,11,12),(42,0,3),(42,4,2),(42,5,1),(42,6,15),(42,7,14),(42,8,13),(42,9,12),(42,10,11),(43,2,0),(43,3,1),(43,4,15),(43,5,14),(43,6,13),(43,7,12),(43,8,11),(43,9,10),(44,1,0),(44,2,15),(44,3,14),(44,4,13),(44,5,12),(44,6,11),(44,7,10),(44,8,9)
on conflict do nothing;

-- 등급별 실유저 상한·AI 기준 평점 — lib/weeklyLeague/config.ts의 TIERS와
-- 반드시 같은 값을 유지해야 한다.
create table if not exists public.weekly_tier_rules (
  tier            smallint primary key,
  max_real_users  smallint not null,
  ai_base_rating  smallint not null
);

insert into public.weekly_tier_rules (tier, max_real_users, ai_base_rating) values
  (0, 8, 75),
  (1, 4, 68),
  (2, 2, 61),
  (3, 1, 54)
on conflict (tier) do update
  set max_real_users = excluded.max_real_users,
      ai_base_rating = excluded.ai_base_rating;

create or replace function public.auto_bootstrap_placement_leagues()
  returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_week_id text := 'placement-2026-09-04';
  v_first_match_at timestamptz := '2026-09-04T09:00:00+09:00'::timestamptz;
  v_tier record;
  v_existing_group bigint;
  v_group_id bigint;
  v_assigned_user_ids uuid[];
  v_candidate record;
  v_members jsonb;
  v_slot int;
  v_competitions jsonb;
  v_placement_id bigint;
  v_fixtures jsonb;
  v_created_tiers int[] := array[]::int[];
begin
  perform pg_advisory_xact_lock(hashtext('auto_bootstrap_placement:' || v_week_id));

  perform public.seed_weekly_schedule_slots(v_week_id, (
    select jsonb_agg(jsonb_build_object(
      'index', i,
      'day', (array['FRI', 'SAT', 'SUN'])[i / 15 + 1],
      'hour', 9 + (i % 15),
      'type', 'OPENING_PLACEMENT',
      'scheduledAtUtc', v_first_match_at + ((i / 15) * 24 + (i % 15)) * interval '1 hour'
    ))
    from generate_series(0, 44) i
  ));

  select coalesce(array_agg(m.user_id), array[]::uuid[]) into v_assigned_user_ids
  from public.weekly_league_members m
  join public.weekly_league_groups g on g.id = m.group_id
  where g.week_id = v_week_id and m.kind = 'user';

  for v_tier in select tier, max_real_users, ai_base_rating from public.weekly_tier_rules order by tier
  loop
    select id into v_existing_group from public.weekly_league_groups
      where tier = v_tier.tier and week_id = v_week_id limit 1;
    if v_existing_group is not null then
      continue;
    end if;

    v_members := '[]'::jsonb;
    v_slot := 0;

    for v_candidate in
      select s.user_id, s.data->>'club' as club_name
      from public.saves s
      where not exists (select 1 from public.admins a where a.user_id = s.user_id)
        and not (s.user_id = any(v_assigned_user_ids))
      order by s.user_id
    loop
      exit when v_slot >= v_tier.max_real_users;
      v_members := v_members || jsonb_build_object(
        'slot', v_slot,
        'kind', 'user',
        'userId', v_candidate.user_id,
        'clubName', coalesce(nullif(trim(v_candidate.club_name), ''), '유저클럽' || (v_slot + 1)),
        'badge', '',
        'rating', v_tier.ai_base_rating + 5
      );
      v_assigned_user_ids := v_assigned_user_ids || v_candidate.user_id;
      v_slot := v_slot + 1;
    end loop;

    while jsonb_array_length(v_members) < 16 loop
      v_members := v_members || jsonb_build_object(
        'slot', jsonb_array_length(v_members),
        'kind', 'ai',
        'userId', null,
        'clubName', 'AI 클럽 ' || (jsonb_array_length(v_members) + 1),
        'badge', '',
        'rating', v_tier.ai_base_rating
      );
    end loop;

    v_group_id := public.create_weekly_league_group(v_tier.tier, v_week_id, v_members);
    v_competitions := public.seed_weekly_competitions(v_group_id);
    v_placement_id := (v_competitions->>'OPENING_PLACEMENT')::bigint;

    select jsonb_agg(jsonb_build_object(
      'round', t.round,
      'homeSlot', t.home_slot,
      'awaySlot', t.away_slot,
      'scheduledAtUtc', v_first_match_at + ((t.round / 15) * 24 + (t.round % 15)) * interval '1 hour'
    )) into v_fixtures
    from public.weekly_placement_fixture_template t;

    perform public.seed_league_fixtures(v_group_id, v_placement_id, v_fixtures);

    v_created_tiers := v_created_tiers || v_tier.tier;
  end loop;

  return jsonb_build_object('ok', true, 'weekId', v_week_id, 'createdTiers', v_created_tiers);
end $$;

revoke all on function public.auto_bootstrap_placement_leagues() from public;
revoke all on function public.auto_bootstrap_placement_leagues() from authenticated;
grant execute on function public.auto_bootstrap_placement_leagues() to service_role;

select cron.unschedule('auto-bootstrap-placement')
  where exists (select 1 from cron.job where jobname = 'auto-bootstrap-placement');

select cron.schedule('auto-bootstrap-placement', '*/10 * * * *', $$select public.auto_bootstrap_placement_leagues()$$);
