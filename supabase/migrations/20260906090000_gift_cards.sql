-- 선물에 카드 — 운영자가 특정 선수 카드를 그대로 선물한다(예: 한 클럽 스쿼드 한 장씩).
--
-- gifts.cards 는 카드 id(lib/players.ts PlayerDef.id) 배열이다. 같은 id 가 두 번 있으면
-- 두 장. 수령(claim_gifts)은 배열을 그대로 돌려주고 클라이언트 reducer(grantCards)가
-- 세이브에 카드를 만든다 — 골드·아이템과 같은 "서버가 내용, 클라이언트가 잔고" 모양.
-- 모르는 id 는 클라이언트가 버린다. 보관함 용량은 넘겨도 받는다(선물이 막히는 것보다
-- 낫고, 넘친 만큼은 새 스카우트가 막히니 유저가 정리하게 된다).

alter table public.gifts add column if not exists cards jsonb not null default '[]'::jsonb;

drop function if exists public.send_gift(text, text, int, jsonb, jsonb, timestamptz);

create or replace function public.send_gift(
  p_title      text,
  p_message    text,
  p_gold       int,
  p_items      jsonb,
  p_target     jsonb,
  p_expires_at timestamptz default null,
  p_cards      jsonb default '[]'::jsonb
) returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_id bigint;
  v_count int;
  v_items jsonb := coalesce(p_items, '{}'::jsonb);
  v_cards jsonb := coalesce(p_cards, '[]'::jsonb);
begin
  if not public.is_admin() then
    return jsonb_build_object('ok', false, 'reason', 'not an operator');
  end if;
  if jsonb_typeof(v_items) <> 'object' or jsonb_typeof(v_cards) <> 'array' then
    return jsonb_build_object('ok', false, 'reason', 'bad items');
  end if;
  if jsonb_array_length(v_cards) > 200 then
    return jsonb_build_object('ok', false, 'reason', 'too many cards');
  end if;
  if coalesce(p_gold, 0) <= 0
     and (select count(*) from jsonb_each_text(v_items) where coalesce(nullif(value, '')::int, 0) > 0) = 0
     and jsonb_array_length(v_cards) = 0 then
    return jsonb_build_object('ok', false, 'reason', 'empty gift');
  end if;

  insert into public.gifts (created_by, title, message, gold, items, cards, target, expires_at)
  values (auth.uid(), trim(p_title), coalesce(p_message, ''), greatest(coalesce(p_gold, 0), 0), v_items, v_cards, p_target, p_expires_at)
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

revoke all on function public.send_gift(text, text, int, jsonb, jsonb, timestamptz, jsonb) from public;
grant execute on function public.send_gift(text, text, int, jsonb, jsonb, timestamptz, jsonb) to authenticated;

drop function if exists public.gifts_for_admin();
create or replace function public.gifts_for_admin()
  returns table (
    id bigint, title text, message text, gold int, items jsonb, cards jsonb, target jsonb,
    recipients int, claimed bigint, created_at timestamptz, expires_at timestamptz
  )
  language sql
  stable
  security definer
  set search_path = public
as $$
  select g.id, g.title, g.message, g.gold, g.items, g.cards, g.target, g.recipients,
         (select count(*) from public.gift_inbox i where i.gift_id = g.id and i.claimed_at is not null) as claimed,
         g.created_at, g.expires_at
  from public.gifts g
  where public.is_admin()
  order by g.id desc
  limit 50;
$$;

revoke all on function public.gifts_for_admin() from public;
grant execute on function public.gifts_for_admin() to authenticated;

create or replace function public.my_gifts()
  returns jsonb
  language sql
  stable
  security definer
  set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'inboxId', i.id, 'giftId', g.id, 'title', g.title, 'message', g.message,
      'gold', g.gold, 'items', g.items, 'cards', g.cards, 'createdAt', i.created_at,
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

-- 수령: 골드·아이템·티켓에 카드 배열을 더해 돌려준다.
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

  return jsonb_build_object('ok', true, 'count', v_count, 'gold', v_gold, 'items', v_items, 'cards', v_cards,
                            'tickets', v_tickets,
                            'ticketBalance', coalesce((select balance from public.scout_tickets where user_id = v_user), 0));
end $$;

revoke all on function public.claim_gifts(bigint[]) from public;
grant execute on function public.claim_gifts(bigint[]) to authenticated;
