-- 앨범(카드 도감) 보상 — docs/ALBUM_PLAN.md.
--
-- 묶음 정의는 명단에서 나오므로 lib/album.ts가 원본이다. 서버는 명단을 모르기
-- 때문에 운영자 콘솔이 정의를 album_sets로 밀어 넣고(admin_sync_album_sets),
-- 수령(claim_album_set)은 그 표와 클라우드 세이브(saves.data.cards)의 playerId로
-- 완성 여부를 다시 확인한다 — "선언"이라 클라이언트 말만 믿지 않는다.
-- 보상은 선물(gifts/gift_inbox)로 나가 기존 선물함·팝업·티켓 처리를 그대로 탄다.
-- 묶음마다 한 번(album_claims).

create table if not exists public.album_sets (
  id         text primary key check (char_length(id) between 1 and 120),
  kind       text not null check (kind in ('club', 'league', 'special')),
  title      text not null check (char_length(title) between 1 and 80),
  player_ids jsonb not null default '[]'::jsonb,
  required   int not null check (required >= 0),
  child_ids  jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.album_claims (
  user_id    uuid not null references auth.users on delete cascade,
  set_id     text not null,
  gold       int not null default 0,
  tickets    int not null default 0,
  gift_id    bigint references public.gifts(id) on delete set null,
  claimed_at timestamptz not null default now(),
  primary key (user_id, set_id)
);
create index if not exists album_claims_set_idx on public.album_claims (set_id);

alter table public.album_sets enable row level security;
alter table public.album_claims enable row level security;
drop policy if exists "album sets are readable" on public.album_sets;
create policy "album sets are readable" on public.album_sets for select to authenticated using (true);
drop policy if exists "players read their own album claims" on public.album_claims;
create policy "players read their own album claims" on public.album_claims
  for select to authenticated using (auth.uid() = user_id);

-- 운영자: 정의 동기화(upsert). 사라진 묶음은 남겨 둔다 — 이미 받은 기록이 가리킨다.
create or replace function public.admin_sync_album_sets(p_sets jsonb)
  returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_row jsonb;
  v_count int := 0;
begin
  if not public.is_admin() then
    return jsonb_build_object('ok', false, 'reason', 'not an operator');
  end if;
  if jsonb_typeof(p_sets) <> 'array' then
    return jsonb_build_object('ok', false, 'reason', 'bad payload');
  end if;
  for v_row in select * from jsonb_array_elements(p_sets)
  loop
    insert into public.album_sets (id, kind, title, player_ids, required, child_ids, updated_at)
    values (v_row->>'id', v_row->>'kind', left(v_row->>'title', 80),
            coalesce(v_row->'playerIds', '[]'::jsonb), greatest(0, coalesce((v_row->>'required')::int, 0)),
            coalesce(v_row->'childIds', '[]'::jsonb), now())
    on conflict (id) do update
      set kind = excluded.kind, title = excluded.title, player_ids = excluded.player_ids,
          required = excluded.required, child_ids = excluded.child_ids, updated_at = now();
    v_count := v_count + 1;
  end loop;
  return jsonb_build_object('ok', true, 'count', v_count);
end $$;

revoke all on function public.admin_sync_album_sets(jsonb) from public;
grant execute on function public.admin_sync_album_sets(jsonb) to authenticated;

-- 세이브의 카드 playerId 중 묶음에 드는 서로 다른 선수 수.
create or replace function public._album_owned_count(p_cards jsonb, p_player_ids jsonb)
  returns int
  language sql
  immutable
as $$
  select count(distinct c->>'playerId')::int
  from jsonb_array_elements(coalesce(p_cards, '[]'::jsonb)) c
  where p_player_ids ? (c->>'playerId')
$$;

create or replace function public._album_set_complete(p_set public.album_sets, p_cards jsonb)
  returns boolean
  language plpgsql
  stable
as $$
declare
  v_child public.album_sets;
  v_done int := 0;
  v_id text;
begin
  if p_set.kind = 'league' then
    for v_id in select jsonb_array_elements_text(p_set.child_ids)
    loop
      select * into v_child from public.album_sets where id = v_id;
      if v_child.id is not null and public._album_set_complete(v_child, p_cards) then
        v_done := v_done + 1;
      end if;
    end loop;
    return p_set.required > 0 and v_done >= p_set.required;
  end if;
  return p_set.required > 0 and public._album_owned_count(p_cards, p_set.player_ids) >= p_set.required;
end $$;

-- 수령: 세이브로 재검증 → 기록 → 선물 발송(골드 + 프리미엄 티켓).
create or replace function public.claim_album_set(p_set_id text)
  returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_set public.album_sets;
  v_cards jsonb;
  v_gold int;
  v_tickets int;
  v_gift bigint;
  v_items jsonb;
begin
  if v_user is null then
    return jsonb_build_object('ok', false, 'reason', 'not signed in');
  end if;
  select * into v_set from public.album_sets where id = p_set_id;
  if v_set.id is null then
    return jsonb_build_object('ok', false, 'reason', 'unknown set');
  end if;
  perform pg_advisory_xact_lock(hashtext('album:' || v_user::text));
  if exists (select 1 from public.album_claims where user_id = v_user and set_id = p_set_id) then
    return jsonb_build_object('ok', false, 'reason', 'already claimed');
  end if;

  select data->'cards' into v_cards from public.saves where user_id = v_user;
  if v_cards is null or jsonb_typeof(v_cards) <> 'array' then
    return jsonb_build_object('ok', false, 'reason', 'no save');
  end if;
  if not public._album_set_complete(v_set, v_cards) then
    return jsonb_build_object('ok', false, 'reason', 'not complete');
  end if;

  -- 금액: lib/tuning.ts 기본값을 game_config가 덮는다 (lib/album.ts albumReward와 같은 키).
  v_gold := round(case v_set.kind
    when 'club' then public._weekly_knob('albumClubGold', 5000)
    when 'league' then public._weekly_knob('albumLeagueGold', 20000)
    else public._weekly_knob('albumSpecialGold', 10000) end)::int;
  v_tickets := round(case v_set.kind
    when 'club' then 0
    when 'league' then public._weekly_knob('albumLeagueTickets', 3)
    else public._weekly_knob('albumSpecialTickets', 2) end)::int;

  if v_gold > 0 or v_tickets > 0 then
    v_items := case when v_tickets > 0 then jsonb_build_object('premiumTicket', v_tickets) else '{}'::jsonb end;
    insert into public.gifts (created_by, title, message, gold, items, target, recipients)
    values (null, left('앨범 완성 · ' || v_set.title, 40),
            format('「%s」 앨범을 완성했습니다. 축하합니다!', v_set.title),
            v_gold, v_items, jsonb_build_object('kind', 'users', 'userIds', jsonb_build_array(v_user::text)), 1)
    returning id into v_gift;
    insert into public.gift_inbox (gift_id, user_id) values (v_gift, v_user);
  end if;

  insert into public.album_claims (user_id, set_id, gold, tickets, gift_id)
  values (v_user, p_set_id, v_gold, v_tickets, v_gift);

  return jsonb_build_object('ok', true, 'gold', v_gold, 'tickets', v_tickets, 'giftId', v_gift);
end $$;

revoke all on function public.claim_album_set(text) from public;
grant execute on function public.claim_album_set(text) to authenticated;

-- 운영자: 묶음별 수령 수.
create or replace function public.admin_album_claim_stats()
  returns table (set_id text, claims bigint)
  language sql
  stable
  security definer
  set search_path = public
as $$
  select c.set_id, count(*) from public.album_claims c
  where public.is_admin()
  group by c.set_id
$$;

revoke all on function public.admin_album_claim_stats() from public;
grant execute on function public.admin_album_claim_stats() to authenticated;
