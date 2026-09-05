-- 운영자 선물 — 메시지와 함께 골드·아이템을 보낸다. 받는 쪽은 선물함에서 수령한다.
--
-- 보내는 순간 대상을 확정해 gift_inbox 에 한 사람당 한 줄을 만든다(규칙을 저장해 두고
-- 읽을 때마다 평가하지 않는다 — "접속 안 한 지 7일" 같은 대상은 보낸 시점의 사실이어야
-- 하고, 수령 여부도 줄마다 잠겨야 한다). 골드는 경쟁 리그 보상과 같은 모양이다: 서버가
-- 액수를 정하고 원장(gold_ledger, 사유 'gift')에 적고, 클라이언트가 세이브 잔고에 더한다.
-- put_save 는 세이브 골드와 원장 합계의 차액만 'client' 로 남기므로 두 번 세지 않는다.

create table if not exists public.gifts (
  id          bigserial primary key,
  created_by  uuid references auth.users on delete set null,
  title       text not null check (char_length(title) between 1 and 40),
  message     text not null default '' check (char_length(message) <= 500),
  gold        int  not null default 0 check (gold between 0 and 100000000),
  -- { "drink": 2, "cardHotTime": 1 } — 아이템 id 는 lib/items.ts 의 ItemId. 모르는 id 는
  -- 클라이언트 reducer 가 버린다.
  items       jsonb not null default '{}'::jsonb,
  -- { kind: 'all' } | { kind: 'users', userIds: [...] } | { kind: 'inactive'|'active'|'new', days: n }
  target      jsonb not null,
  recipients  int  not null default 0,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz
);

create table if not exists public.gift_inbox (
  id         bigserial primary key,
  gift_id    bigint not null references public.gifts(id) on delete cascade,
  user_id    uuid   not null references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  claimed_at timestamptz,
  unique (gift_id, user_id)
);
create index if not exists gift_inbox_user_unclaimed_idx on public.gift_inbox (user_id) where claimed_at is null;

alter table public.gifts enable row level security;
alter table public.gift_inbox enable row level security;

drop policy if exists "operators read gifts" on public.gifts;
create policy "operators read gifts" on public.gifts
  for select to authenticated using (public.is_admin());
drop policy if exists "players read their own inbox" on public.gift_inbox;
create policy "players read their own inbox" on public.gift_inbox
  for select to authenticated using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 대상 계산 — 보낼 때와 미리 셀 때 같은 함수를 쓴다.
-- 'all'/'new' 는 가입 계정 전체(auth.users), 'active'/'inactive' 는 세이브가 마지막으로
-- 저장된 시각(saves.updated_at — 플레이 중 계속 갱신되므로 접속 시각의 근사)을 본다.
-- ---------------------------------------------------------------------------
create or replace function public.gift_audience(p_target jsonb)
  returns table (user_id uuid)
  language plpgsql
  stable
  security definer
  set search_path = public
as $$
declare
  v_kind text := coalesce(p_target->>'kind', '');
  v_days int  := greatest(0, least(3650, coalesce(nullif(p_target->>'days', '')::int, 0)));
begin
  if v_kind = 'all' then
    return query select u.id from auth.users u;
  elsif v_kind = 'users' then
    return query
      select u.id from auth.users u
      where u.id in (select nullif(x, '')::uuid from jsonb_array_elements_text(coalesce(p_target->'userIds', '[]'::jsonb)) x);
  elsif v_kind = 'inactive' then
    return query select s.user_id from public.saves s where s.updated_at < now() - make_interval(days => v_days);
  elsif v_kind = 'active' then
    return query select s.user_id from public.saves s where s.updated_at >= now() - make_interval(days => v_days);
  elsif v_kind = 'new' then
    return query select u.id from auth.users u where u.created_at >= now() - make_interval(days => v_days);
  end if;
end $$;

revoke all on function public.gift_audience(jsonb) from public;

create or replace function public.gift_audience_count_for_admin(p_target jsonb)
  returns int
  language sql
  stable
  security definer
  set search_path = public
as $$
  select case when not public.is_admin() then -1 else (select count(*)::int from public.gift_audience(p_target)) end;
$$;

revoke all on function public.gift_audience_count_for_admin(jsonb) from public;
grant execute on function public.gift_audience_count_for_admin(jsonb) to authenticated;

-- 특정 유저 고르기 — 클럽명·이메일 일부로 찾는다. 운영자만.
create or replace function public.find_users_for_admin(p_query text)
  returns table (user_id uuid, email text, club text, last_seen_at timestamptz, created_at timestamptz)
  language sql
  stable
  security definer
  set search_path = public
as $$
  select u.id, u.email::text,
         coalesce(s.data->>'club', u.raw_user_meta_data->>'club', '') as club,
         s.updated_at, u.created_at
  from auth.users u
  left join public.saves s on s.user_id = u.id
  where public.is_admin()
    and char_length(trim(coalesce(p_query, ''))) >= 1
    and (
      coalesce(s.data->>'club', u.raw_user_meta_data->>'club', '') ilike '%' || trim(p_query) || '%'
      or u.email ilike '%' || trim(p_query) || '%'
    )
  order by s.updated_at desc nulls last
  limit 20;
$$;

revoke all on function public.find_users_for_admin(text) from public;
grant execute on function public.find_users_for_admin(text) to authenticated;

-- 보내기. 대상이 0명이면 만들지 않는다.
create or replace function public.send_gift(
  p_title      text,
  p_message    text,
  p_gold       int,
  p_items      jsonb,
  p_target     jsonb,
  p_expires_at timestamptz default null
) returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_id bigint;
  v_count int;
  v_items jsonb := coalesce(p_items, '{}'::jsonb);
begin
  if not public.is_admin() then
    return jsonb_build_object('ok', false, 'reason', 'not an operator');
  end if;
  if jsonb_typeof(v_items) <> 'object' then
    return jsonb_build_object('ok', false, 'reason', 'bad items');
  end if;
  if coalesce(p_gold, 0) <= 0 and (select count(*) from jsonb_each_text(v_items) where coalesce(nullif(value, '')::int, 0) > 0) = 0 then
    return jsonb_build_object('ok', false, 'reason', 'empty gift');
  end if;

  insert into public.gifts (created_by, title, message, gold, items, target, expires_at)
  values (auth.uid(), trim(p_title), coalesce(p_message, ''), greatest(coalesce(p_gold, 0), 0), v_items, p_target, p_expires_at)
  returning id into v_id;

  insert into public.gift_inbox (gift_id, user_id)
  select v_id, a.user_id from public.gift_audience(p_target) a
  on conflict do nothing;
  get diagnostics v_count = row_count;

  if v_count = 0 then
    delete from public.gifts where id = v_id;
    return jsonb_build_object('ok', false, 'reason', 'no recipients');
  end if;

  update public.gifts set recipients = v_count where id = v_id;
  return jsonb_build_object('ok', true, 'giftId', v_id, 'recipients', v_count);
end $$;

revoke all on function public.send_gift(text, text, int, jsonb, jsonb, timestamptz) from public;
grant execute on function public.send_gift(text, text, int, jsonb, jsonb, timestamptz) to authenticated;

-- 운영자용 발송 내역.
create or replace function public.gifts_for_admin()
  returns table (
    id bigint, title text, message text, gold int, items jsonb, target jsonb,
    recipients int, claimed bigint, created_at timestamptz, expires_at timestamptz
  )
  language sql
  stable
  security definer
  set search_path = public
as $$
  select g.id, g.title, g.message, g.gold, g.items, g.target, g.recipients,
         (select count(*) from public.gift_inbox i where i.gift_id = g.id and i.claimed_at is not null) as claimed,
         g.created_at, g.expires_at
  from public.gifts g
  where public.is_admin()
  order by g.id desc
  limit 50;
$$;

revoke all on function public.gifts_for_admin() from public;
grant execute on function public.gifts_for_admin() to authenticated;

-- 내 선물함 — 안 받은 것 전부와 최근 30일 안에 받은 것. 기한이 지난 미수령은 뺀다.
create or replace function public.my_gifts()
  returns jsonb
  language sql
  stable
  security definer
  set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'inboxId', i.id, 'giftId', g.id, 'title', g.title, 'message', g.message,
      'gold', g.gold, 'items', g.items, 'createdAt', i.created_at,
      'claimedAt', i.claimed_at, 'expiresAt', g.expires_at
    ) order by (i.claimed_at is null) desc, i.id desc), '[]'::jsonb)
  from public.gift_inbox i
  join public.gifts g on g.id = i.gift_id
  where i.user_id = auth.uid()
    and (
      (i.claimed_at is null and (g.expires_at is null or g.expires_at > now()))
      or i.claimed_at > now() - interval '30 days'
    );
$$;

revoke all on function public.my_gifts() from public;
grant execute on function public.my_gifts() to authenticated;

-- 수령 — 고른 줄(없으면 전부). 골드는 원장에 'gift' 로, 아이템은 합쳐서 돌려준다.
create or replace function public.claim_gifts(p_inbox_ids bigint[] default null)
  returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_gold bigint := 0;
  v_items jsonb := '{}'::jsonb;
  v_count int := 0;
  v_row record;
  v_key text;
  v_val text;
  v_ids text := '';
begin
  if v_user is null then
    return jsonb_build_object('ok', false, 'reason', 'not signed in');
  end if;
  perform pg_advisory_xact_lock(hashtext('gifts:' || v_user::text));

  for v_row in
    with claimed as (
      update public.gift_inbox i
        set claimed_at = now()
      from public.gifts g
      where g.id = i.gift_id
        and i.user_id = v_user
        and i.claimed_at is null
        and (g.expires_at is null or g.expires_at > now())
        and (p_inbox_ids is null or i.id = any(p_inbox_ids))
      returning i.id, g.gold, g.items
    )
    select * from claimed
  loop
    v_count := v_count + 1;
    v_gold := v_gold + v_row.gold;
    v_ids := v_ids || case when v_ids = '' then '' else ',' end || v_row.id::text;
    for v_key, v_val in select key, value from jsonb_each_text(coalesce(v_row.items, '{}'::jsonb)) loop
      if coalesce(nullif(v_val, '')::int, 0) > 0 then
        v_items := jsonb_set(v_items, array[v_key],
          to_jsonb(coalesce(nullif(v_items->>v_key, '')::int, 0) + nullif(v_val, '')::int));
      end if;
    end loop;
  end loop;

  if v_gold > 0 then
    insert into public.gold_ledger (user_id, delta, reason, ref)
    values (v_user, v_gold, 'gift', 'inbox:' || v_ids);
  end if;

  return jsonb_build_object('ok', true, 'count', v_count, 'gold', v_gold, 'items', v_items);
end $$;

revoke all on function public.claim_gifts(bigint[]) from public;
grant execute on function public.claim_gifts(bigint[]) to authenticated;
