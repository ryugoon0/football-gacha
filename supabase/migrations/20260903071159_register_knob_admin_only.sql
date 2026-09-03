-- register_knob에 운영자 확인을 추가한다.
--
-- 계기: 운영자 화면을 게임 화면과 분리하는 작업의 독립 코드 리뷰에서 발견됨
-- (이 취약점 자체는 오늘 만든 게 아니라 기존 코드에 있던 것).
--
-- register_knob(p_key, p_default, p_min, p_max)는 SECURITY DEFINER 함수라
-- 기본적으로 PUBLIC 실행 권한을 갖고, is_admin() 확인이 없었다. 이 함수는
-- 키가 이미 있으면 min_value/max_value를 통째로 새 값으로 바꾸고, 현재
-- value도 그 새 범위 안으로 당긴다(least(greatest(value, min), max)).
-- 즉 로그인한 아무나 register_knob('staminaDrain', x, 999999, 999999) 같은
-- 호출로 즉시 밸런스 값을 원하는 숫자로 바꿀 수 있었다 — set_game_config는
-- is_admin()을 확인하지만 이 우회로는 그 확인을 거치지 않았다.
--
-- 클라이언트에서 이 RPC를 부르는 곳은 lib/configSync.ts의 registerKnobs()
-- 뿐이고, 그건 components/tabs/BalancePanel.tsx / ShopPanel.tsx(둘 다
-- 운영자 화면 전용)에서만 호출되므로 is_admin() 확인을 추가해도 정상
-- 운영자 흐름은 그대로 동작한다.

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
