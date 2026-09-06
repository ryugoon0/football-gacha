-- 확률 공개 페이지(/odds) — 로그인 없이 지금 적용 중인 스카우트 확률과 조각 교환
-- 비용을 읽는다. game_config 전체를 anon 에 열지 않고, 확률·교환 키만 돌려주는
-- 함수 하나만 연다(게임산업법 확률형 아이템 확률 표시 의무 — 사이트에서 상시 열람).
create or replace function public.public_odds()
  returns jsonb
  language sql
  stable
  security definer
  set search_path = public
as $$
  select coalesce(jsonb_object_agg(key, value), '{}'::jsonb)
  from public.game_config
  where key like 'basicRate%' or key like 'premiumRate%' or key like 'exchange:%';
$$;

revoke all on function public.public_odds() from public;
grant execute on function public.public_odds() to anon, authenticated;
