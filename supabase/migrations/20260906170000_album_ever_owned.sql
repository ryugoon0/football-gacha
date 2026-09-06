-- 앨범 완성 판정을 "지금 손에 있는 카드"에서 "한 번이라도 가진 기록"으로 바꾼다
-- (lib/album.ts ownedPlayerIds와 같은 기준: 세이브의 collected 목록 ∪ 현재 카드의 playerId).
-- _album_set_complete(set, ids) 의 두 번째 인자는 이제 선수 id 문자열 배열이다.
drop function if exists public._album_owned_count(jsonb, jsonb);
create or replace function public._album_owned_count(p_ids jsonb, p_player_ids jsonb)
  returns int
  language sql
  immutable
as $$
  select count(distinct v)::int
  from jsonb_array_elements_text(coalesce(p_ids, '[]'::jsonb)) v
  where p_player_ids ? v
$$;

-- 세이브 한 건에서 "가져 본 선수 id" 배열을 뽑는다.
create or replace function public._album_ever_owned(p_data jsonb)
  returns jsonb
  language sql
  immutable
as $$
  select coalesce(jsonb_agg(distinct id), '[]'::jsonb)
  from (
    select v as id from jsonb_array_elements_text(
      case when jsonb_typeof(p_data->'collected') = 'array' then p_data->'collected' else '[]'::jsonb end) v
    union
    select c->>'playerId' from jsonb_array_elements(
      case when jsonb_typeof(p_data->'cards') = 'array' then p_data->'cards' else '[]'::jsonb end) c
    where c ? 'playerId'
  ) ids
  where id is not null
$$;

create or replace function public.claim_album_set(p_set_id text)
  returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_set public.album_sets;
  v_data jsonb;
  v_ids jsonb;
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

  select data into v_data from public.saves where user_id = v_user;
  if v_data is null then
    return jsonb_build_object('ok', false, 'reason', 'no save');
  end if;
  v_ids := public._album_ever_owned(v_data);
  if not public._album_set_complete(v_set, v_ids) then
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
