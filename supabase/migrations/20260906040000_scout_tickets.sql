-- 프리미엄 스카우트 티켓 — 골드 대신 프리미엄 스카우트 1회를 여는 서버 잔고.
--
-- 아이템(세이브 안 보유량)으로 두면 세이브를 고쳐 티켓을 늘리는 순간 프리미엄 뽑기가
-- 공짜가 된다. 그래서 골드 원장처럼 서버가 잔고를 갖고, 선물 수령(claim_gifts)이 올리고
-- 뽑기 확정(commit_pull)이 내린다. 상점에서는 팔지 않는다 — 선물·보상으로만 준다.

create table if not exists public.scout_tickets (
  user_id    uuid primary key references auth.users on delete cascade,
  balance    int not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.scout_ticket_ledger (
  id         bigserial primary key,
  user_id    uuid not null references auth.users on delete cascade,
  delta      int  not null,
  -- 'gift' 선물 수령 · 'pull' 뽑기 사용 · 'admin' 운영자 조정
  reason     text not null,
  ref        text,
  created_at timestamptz not null default now()
);
create index if not exists scout_ticket_ledger_user_idx on public.scout_ticket_ledger (user_id, id desc);

alter table public.scout_tickets enable row level security;
alter table public.scout_ticket_ledger enable row level security;
drop policy if exists "players read their own tickets" on public.scout_tickets;
create policy "players read their own tickets" on public.scout_tickets
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists "players read their own ticket ledger" on public.scout_ticket_ledger;
create policy "players read their own ticket ledger" on public.scout_ticket_ledger
  for select to authenticated using (auth.uid() = user_id);

-- 내부용: 잔고를 delta 만큼 움직이고 원장에 남긴다. 음수로 내려가면 false.
create or replace function public.move_scout_tickets(p_user uuid, p_delta int, p_reason text, p_ref text)
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
  insert into public.scout_tickets (user_id, balance) values (p_user, 0)
  on conflict (user_id) do nothing;
  select balance into v_balance from public.scout_tickets where user_id = p_user for update;
  if v_balance + p_delta < 0 then
    return false;
  end if;
  update public.scout_tickets set balance = v_balance + p_delta, updated_at = now() where user_id = p_user;
  insert into public.scout_ticket_ledger (user_id, delta, reason, ref) values (p_user, p_delta, p_reason, p_ref);
  return true;
end $$;

revoke all on function public.move_scout_tickets(uuid, int, text, text) from public;
revoke all on function public.move_scout_tickets(uuid, int, text, text) from authenticated;

-- 뽑기 확정에 티켓 인자를 더한다. 옛 시그니처는 지운다(PostgREST 가 두 개를 구분하지 못함).
drop function if exists public.commit_pull(uuid, text, bigint, text, jsonb, int, int, boolean, jsonb);

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
  p_tickets     int default 0
) returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_balance bigint;
  v_pull_id bigint;
  v_tickets int := greatest(coalesce(p_tickets, 0), 0);
begin
  -- 같은 사람의 동시 뽑기를 줄 세웁니다. 잔액을 읽고 쓰는 사이에 끼어들어
  -- 두 번 뽑는 것을 막습니다.
  perform pg_advisory_xact_lock(hashtext(p_user::text));

  v_balance := public.gold_balance(p_user);
  if v_balance < p_cost then
    return jsonb_build_object('ok', false, 'reason', 'not enough gold', 'balance', v_balance);
  end if;
  if v_tickets > 0 and coalesce((select balance from public.scout_tickets where user_id = p_user), 0) < v_tickets then
    return jsonb_build_object('ok', false, 'reason', 'not enough tickets',
                              'tickets', coalesce((select balance from public.scout_tickets where user_id = p_user), 0));
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

  insert into public.economy (user_id, pity) values (p_user, p_pity_after)
  on conflict (user_id) do update set pity = excluded.pity;

  return jsonb_build_object('ok', true, 'pull_id', v_pull_id,
                            'balance', public.gold_balance(p_user),
                            'tickets', coalesce((select balance from public.scout_tickets where user_id = p_user), 0),
                            'pity', p_pity_after);
end $$;

revoke all on function public.commit_pull(uuid, text, bigint, text, jsonb, int, int, boolean, jsonb, int) from public;
revoke all on function public.commit_pull(uuid, text, bigint, text, jsonb, int, int, boolean, jsonb, int) from authenticated;
grant execute on function public.commit_pull(uuid, text, bigint, text, jsonb, int, int, boolean, jsonb, int) to service_role;

-- 선물 수령 — items 의 'premiumTicket' 은 아이템이 아니라 티켓 잔고로 간다.
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
      if coalesce(nullif(v_val, '')::int, 0) <= 0 then
        continue;
      end if;
      if v_key = 'premiumTicket' then
        v_tickets := v_tickets + nullif(v_val, '')::int;
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

  return jsonb_build_object('ok', true, 'count', v_count, 'gold', v_gold, 'items', v_items,
                            'tickets', v_tickets,
                            'ticketBalance', coalesce((select balance from public.scout_tickets where user_id = v_user), 0));
end $$;

revoke all on function public.claim_gifts(bigint[]) from public;
grant execute on function public.claim_gifts(bigint[]) to authenticated;
