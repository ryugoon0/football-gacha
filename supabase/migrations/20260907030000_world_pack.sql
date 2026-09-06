-- 월드 스카우트팩 — 팔지 않는 팩. 선물 수령이나 월드 카드 3장 합성이 잔고를 올리고,
-- 뽑기 확정(commit_pull)이 내린다. 프리미엄 티켓과 같은 모양(scout_tickets): 세이브
-- 안 아이템으로 두면 세이브를 고쳐 월드 카드를 찍어 낼 수 있어서 서버가 잔고를 갖는다.

create table if not exists public.world_packs (
  user_id    uuid primary key references auth.users on delete cascade,
  balance    int not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.world_pack_ledger (
  id         bigserial primary key,
  user_id    uuid not null references auth.users on delete cascade,
  delta      int  not null,
  -- 'gift' 선물 수령 · 'fusion' 월드 3장 합성 · 'pull' 팩 개봉 · 'admin' 운영자 조정
  reason     text not null,
  ref        text,
  created_at timestamptz not null default now()
);
create index if not exists world_pack_ledger_user_idx on public.world_pack_ledger (user_id, id desc);

-- 합성에 쓰인 카드 uid. 한 번 쓴 uid 는 다시 못 쓴다 — 옛 세이브를 되살려 같은 카드로
-- 두 번 합성하는 길을 막는다.
create table if not exists public.world_fusions (
  uid        text primary key,
  user_id    uuid not null references auth.users on delete cascade,
  player_id  text not null,
  created_at timestamptz not null default now()
);

alter table public.world_packs enable row level security;
alter table public.world_pack_ledger enable row level security;
alter table public.world_fusions enable row level security;
drop policy if exists "players read their own world packs" on public.world_packs;
create policy "players read their own world packs" on public.world_packs
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists "players read their own world pack ledger" on public.world_pack_ledger;
create policy "players read their own world pack ledger" on public.world_pack_ledger
  for select to authenticated using (auth.uid() = user_id);

create or replace function public.move_world_packs(p_user uuid, p_delta int, p_reason text, p_ref text)
  returns boolean
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_balance int;
begin
  if p_delta = 0 then
    return true;
  end if;
  insert into public.world_packs (user_id, balance) values (p_user, 0)
  on conflict (user_id) do nothing;
  select balance into v_balance from public.world_packs where user_id = p_user for update;
  if v_balance + p_delta < 0 then
    return false;
  end if;
  update public.world_packs set balance = v_balance + p_delta, updated_at = now() where user_id = p_user;
  insert into public.world_pack_ledger (user_id, delta, reason, ref) values (p_user, p_delta, p_reason, p_ref);
  return true;
end $$;

revoke all on function public.move_world_packs(uuid, int, text, text) from public;
revoke all on function public.move_world_packs(uuid, int, text, text) from authenticated;

-- 월드 3장 합성 — Edge Function(draw-pack, fuse_world)이 명단으로 등급을 확인한 뒤 부른다.
-- 여기서는 세이브에 그 uid 가 실제로 있는지와 재사용 여부만 본다.
create or replace function public.record_world_fusion(p_user uuid, p_uids text[], p_player_ids text[])
  returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_cards jsonb;
  v_uid text;
  v_i int := 0;
begin
  perform pg_advisory_xact_lock(hashtext('world_fusion:' || p_user::text));
  if p_uids is null or array_length(p_uids, 1) <> 3 or array_length(p_player_ids, 1) <> 3 then
    return jsonb_build_object('ok', false, 'reason', 'need three');
  end if;
  if (select count(distinct u) from unnest(p_uids) u) <> 3 then
    return jsonb_build_object('ok', false, 'reason', 'need three');
  end if;
  select data->'cards' into v_cards from public.saves where user_id = p_user;
  if v_cards is null or jsonb_typeof(v_cards) <> 'array' then
    return jsonb_build_object('ok', false, 'reason', 'no save');
  end if;
  foreach v_uid in array p_uids loop
    v_i := v_i + 1;
    if not exists (select 1 from jsonb_array_elements(v_cards) c where c->>'uid' = v_uid and c->>'playerId' = p_player_ids[v_i]) then
      return jsonb_build_object('ok', false, 'reason', 'card not in save');
    end if;
    if exists (select 1 from public.world_fusions where uid = v_uid) then
      return jsonb_build_object('ok', false, 'reason', 'card already used');
    end if;
  end loop;
  v_i := 0;
  foreach v_uid in array p_uids loop
    v_i := v_i + 1;
    insert into public.world_fusions (uid, user_id, player_id) values (v_uid, p_user, p_player_ids[v_i]);
  end loop;
  perform public.move_world_packs(p_user, 1, 'fusion', array_to_string(p_uids, ','));
  return jsonb_build_object('ok', true, 'balance', coalesce((select balance from public.world_packs where user_id = p_user), 0));
end $$;

revoke all on function public.record_world_fusion(uuid, text[], text[]) from public;
revoke all on function public.record_world_fusion(uuid, text[], text[]) from authenticated;
grant execute on function public.record_world_fusion(uuid, text[], text[]) to service_role;

-- 뽑기 확정에 월드 팩 인자를 더한다. 옛 시그니처는 지운다.
drop function if exists public.commit_pull(uuid, text, bigint, text, jsonb, int, int, boolean, jsonb, int);

create or replace function public.commit_pull(
  p_user        uuid,
  p_pack        text,
  p_cost        bigint,
  p_seed        text,
  p_rates       jsonb,
  p_pity_before int,
  p_pity_after  int,
  p_pity_hit    boolean,
  p_cards       jsonb,
  p_tickets     int default 0,
  p_world_packs int default 0
) returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_balance bigint;
  v_pull_id bigint;
  v_tickets int := greatest(coalesce(p_tickets, 0), 0);
  v_packs int := greatest(coalesce(p_world_packs, 0), 0);
begin
  perform pg_advisory_xact_lock(hashtext(p_user::text));

  v_balance := public.gold_balance(p_user);
  if v_balance < p_cost then
    return jsonb_build_object('ok', false, 'reason', 'not enough gold', 'balance', v_balance);
  end if;
  if v_tickets > 0 and coalesce((select balance from public.scout_tickets where user_id = p_user), 0) < v_tickets then
    return jsonb_build_object('ok', false, 'reason', 'not enough tickets',
                              'tickets', coalesce((select balance from public.scout_tickets where user_id = p_user), 0));
  end if;
  if v_packs > 0 and coalesce((select balance from public.world_packs where user_id = p_user), 0) < v_packs then
    return jsonb_build_object('ok', false, 'reason', 'not enough packs',
                              'worldPacks', coalesce((select balance from public.world_packs where user_id = p_user), 0));
  end if;

  insert into public.pull_log
    (user_id, pack, cost, seed, rates, pity_before, pity_after, pity_hit, cards)
  values
    (p_user, p_pack, p_cost, p_seed, p_rates, p_pity_before, p_pity_after,
     coalesce(p_pity_hit, false), p_cards)
  returning id into v_pull_id;

  if p_cost > 0 then
    insert into public.gold_ledger (user_id, delta, reason, ref)
    values (p_user, -p_cost, 'pull', v_pull_id::text);
  end if;
  if v_tickets > 0 then
    perform public.move_scout_tickets(p_user, -v_tickets, 'pull', v_pull_id::text);
  end if;
  if v_packs > 0 then
    perform public.move_world_packs(p_user, -v_packs, 'pull', v_pull_id::text);
  end if;

  insert into public.economy (user_id, pity) values (p_user, p_pity_after)
  on conflict (user_id) do update set pity = excluded.pity;

  return jsonb_build_object('ok', true, 'pull_id', v_pull_id,
                            'balance', public.gold_balance(p_user),
                            'tickets', coalesce((select balance from public.scout_tickets where user_id = p_user), 0),
                            'worldPacks', coalesce((select balance from public.world_packs where user_id = p_user), 0),
                            'pity', p_pity_after);
end $$;

revoke all on function public.commit_pull(uuid, text, bigint, text, jsonb, int, int, boolean, jsonb, int, int) from public;
revoke all on function public.commit_pull(uuid, text, bigint, text, jsonb, int, int, boolean, jsonb, int, int) from authenticated;
grant execute on function public.commit_pull(uuid, text, bigint, text, jsonb, int, int, boolean, jsonb, int, int) to service_role;

-- 선물 수령 — items 의 'premiumTicket' 은 티켓 잔고로, 'worldPack' 은 월드 팩 잔고로 간다.
create or replace function public.claim_gifts(p_inbox_ids bigint[] default null)
  returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_gold bigint := 0;
  v_tickets int := 0;
  v_packs int := 0;
  v_items jsonb := '{}'::jsonb;
  v_cards jsonb := '[]'::jsonb;
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
      returning i.id, g.gold, g.items, g.cards
    )
    select * from claimed
  loop
    v_count := v_count + 1;
    v_gold := v_gold + v_row.gold;
    v_ids := v_ids || case when v_ids = '' then '' else ',' end || v_row.id::text;
    v_cards := v_cards || coalesce(v_row.cards, '[]'::jsonb);
    for v_key, v_val in select key, value from jsonb_each_text(coalesce(v_row.items, '{}'::jsonb)) loop
      if coalesce(nullif(v_val, '')::int, 0) <= 0 then
        continue;
      end if;
      if v_key = 'premiumTicket' then
        v_tickets := v_tickets + nullif(v_val, '')::int;
      elsif v_key = 'worldPack' then
        v_packs := v_packs + nullif(v_val, '')::int;
      else
        v_items := jsonb_set(v_items, array[v_key],
          to_jsonb(coalesce(nullif(v_items->>v_key, '')::int, 0) + nullif(v_val, '')::int));
      end if;
    end loop;
  end loop;

  if v_gold > 0 then
    insert into public.gold_ledger (user_id, delta, reason, ref)
    values (v_user, v_gold, 'gift', 'inbox:' || v_ids);
  end if;
  if v_tickets > 0 then
    perform public.move_scout_tickets(v_user, v_tickets, 'gift', 'inbox:' || v_ids);
  end if;
  if v_packs > 0 then
    perform public.move_world_packs(v_user, v_packs, 'gift', 'inbox:' || v_ids);
  end if;

  return jsonb_build_object('ok', true, 'count', v_count, 'gold', v_gold, 'items', v_items, 'cards', v_cards,
                            'tickets', v_tickets,
                            'ticketBalance', coalesce((select balance from public.scout_tickets where user_id = v_user), 0),
                            'worldPacks', v_packs,
                            'worldPackBalance', coalesce((select balance from public.world_packs where user_id = v_user), 0));
end $$;

revoke all on function public.claim_gifts(bigint[]) from public;
grant execute on function public.claim_gifts(bigint[]) to authenticated;

-- 확률 안내에 월드 팩 확률도 나간다.
create or replace function public.public_odds()
  returns jsonb
  language sql
  stable
  security definer
  set search_path = public
as $$
  select coalesce(jsonb_object_agg(key, value), '{}'::jsonb)
  from public.game_config
  where key like 'basicRate%' or key like 'premiumRate%' or key like 'worldRate%' or key like 'exchange:%';
$$;

revoke all on function public.public_odds() from public;
grant execute on function public.public_odds() to anon, authenticated;
