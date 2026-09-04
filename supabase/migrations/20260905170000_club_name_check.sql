-- 클럽명 중복 확인 — 가입 화면(로그인 전, anon)과 클럽명 변경(로그인 후)에서 부른다.
--
-- 이름은 두 곳에 있을 수 있다: 이미 플레이한 계정의 세이브(saves.data->>'club')와,
-- 가입만 하고 아직 첫 로그인을 안 한 계정의 auth 메타데이터(raw_user_meta_data->>'club').
-- 둘 다 보되, 나 자신의 이름은 제외한다(로그인 상태에서 같은 이름으로 "변경"해도 통과).
-- security definer 라서 anon 도 결과 boolean 만 받고 다른 사람의 데이터는 못 본다.
create or replace function public.club_name_available(p_name text)
  returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_name text := lower(regexp_replace(trim(coalesce(p_name, '')), '\s+', ' ', 'g'));
  v_me uuid := auth.uid();
begin
  if char_length(v_name) < 2 or char_length(v_name) > 20 then
    return jsonb_build_object('ok', true, 'available', false, 'reason', 'length');
  end if;
  if exists (
    select 1 from public.saves s
    where lower(regexp_replace(trim(coalesce(s.data->>'club', '')), '\s+', ' ', 'g')) = v_name
      and (v_me is null or s.user_id <> v_me)
  ) then
    return jsonb_build_object('ok', true, 'available', false, 'reason', 'taken');
  end if;
  if exists (
    select 1 from auth.users u
    where lower(regexp_replace(trim(coalesce(u.raw_user_meta_data->>'club', '')), '\s+', ' ', 'g')) = v_name
      and (v_me is null or u.id <> v_me)
  ) then
    return jsonb_build_object('ok', true, 'available', false, 'reason', 'taken');
  end if;
  return jsonb_build_object('ok', true, 'available', true);
end $$;

revoke all on function public.club_name_available(text) from public;
grant execute on function public.club_name_available(text) to anon;
grant execute on function public.club_name_available(text) to authenticated;
