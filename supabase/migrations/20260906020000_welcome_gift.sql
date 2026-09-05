-- 가입 선물 — target kind 'welcome' 인 선물은 새 계정이 만들어지는 순간 그 계정의
-- 선물함에 들어간다(auth.users insert 트리거). 운영자가 「선물」 탭에서 대상 「신규
-- 가입자」로 보내면 만들어지고, 만료를 걸거나 새로 보내면 최신 것만 살아 있다.
-- 처음 것은 여기서 심는다: 10,000G + 히든(작전) 카드 12종 1장씩.

create or replace function public.grant_welcome_gifts()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  insert into public.gift_inbox (gift_id, user_id)
  select g.id, new.id
  from public.gifts g
  where g.target->>'kind' = 'welcome'
    and (g.expires_at is null or g.expires_at > now())
  on conflict do nothing;

  update public.gifts g
     set recipients = recipients + 1
   where g.target->>'kind' = 'welcome'
     and (g.expires_at is null or g.expires_at > now());
  return new;
end $$;

drop trigger if exists on_auth_user_created_welcome_gift on auth.users;
create trigger on_auth_user_created_welcome_gift
  after insert on auth.users
  for each row execute function public.grant_welcome_gifts();

-- send_gift: 'welcome' 은 지금 받는 사람이 없어도 만든다(앞으로 가입하는 사람 몫).
-- 새 welcome 을 보내면 이전 welcome 은 그 시점에 만료시켜 하나만 살아 있게 한다.
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
  v_welcome boolean := coalesce(p_target->>'kind', '') = 'welcome';
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

  if v_welcome then
    update public.gifts set expires_at = now()
     where target->>'kind' = 'welcome' and (expires_at is null or expires_at > now());
  end if;

  insert into public.gifts (created_by, title, message, gold, items, target, expires_at)
  values (auth.uid(), trim(p_title), coalesce(p_message, ''), greatest(coalesce(p_gold, 0), 0), v_items, p_target, p_expires_at)
  returning id into v_id;

  if v_welcome then
    return jsonb_build_object('ok', true, 'giftId', v_id, 'recipients', 0);
  end if;

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

-- 첫 가입 선물. 이미 있으면 다시 심지 않는다.
insert into public.gifts (created_by, title, message, gold, items, target)
select null,
       '가입 축하 선물',
       '클럽 창단을 축하합니다! 첫 스카우트에 쓸 골드와, 경쟁 리그 킥오프 전에 쓰는 히든 카드 12종을 한 장씩 드립니다.',
       10000,
       '{"cardUnderdog":1,"cardEvenMatch":1,"cardHomeCrowd":1,"cardAwayGrit":1,"cardBigStage":1,"cardHotTime":1,"cardChaser":1,"cardLockdown":1,"cardFastStart":1,"cardSecondHalf":1,"cardLateLegs":1,"cardGoalmouth":1}'::jsonb,
       '{"kind":"welcome"}'::jsonb
where not exists (select 1 from public.gifts where target->>'kind' = 'welcome');
