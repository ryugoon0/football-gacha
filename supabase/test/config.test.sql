\set ON_ERROR_STOP on
\pset pager off
insert into auth.users (id,email) values
 ('11111111-1111-1111-1111-111111111111','player@test'),
 ('22222222-2222-2222-2222-222222222222','boss@test') on conflict do nothing;
insert into public.admins (user_id) values ('22222222-2222-2222-2222-222222222222') on conflict do nothing;
create or replace function as_user(uid text) returns void language sql as
$$ select set_config('test.uid', uid, false); select null::void $$;

-- register_knob은 이제 운영자만 부를 수 있다 (실제 호출자인
-- BalancePanel/ShopPanel도 운영자 화면에서만 렌더링됨) — 초기 등록도
-- 운영자로 인증한 상태에서 한다.
select as_user('22222222-2222-2222-2222-222222222222');
select public.register_knob('staminaDrain', 0.65, 0.1, 2);
select public.register_knob('miniGameLimit', 10, 0, 50);

\echo '### 0. 운영자가 아니면 노브를 등록/재정의할 수도 없다'
select as_user('11111111-1111-1111-1111-111111111111');
select public.register_knob('staminaDrain', 0.65, 0.1, 999999) as attempt_widen_range;
-- 조용히 무시됐어야 한다 — 범위는 그대로다.
select key, value, min_value, max_value from public.game_config where key = 'staminaDrain';

\echo '### 1. 운영자가 아니면 못 바꾼다'
select as_user('11111111-1111-1111-1111-111111111111');
select public.set_game_config('staminaDrain', 1.5) as as_player;

\echo '### 2. 운영자는 바꿀 수 있다'
select as_user('22222222-2222-2222-2222-222222222222');
select public.set_game_config('staminaDrain', 1.5) as as_operator;

\echo '### 3. 범위 밖은 거절이 아니라 당겨진다'
select public.set_game_config('staminaDrain', 999) as way_too_high;
select public.set_game_config('miniGameLimit', -5) as negative;

\echo '### 4. 모르는 키와 숫자가 아닌 값'
select public.set_game_config('nonsense', 1) as unknown_key;
select public.set_game_config('staminaDrain', 'NaN'::numeric) as nan;

\echo '### 5. 현재 값'
select key, value, min_value, max_value from public.game_config order by key;

\echo '### 6. 누가 무엇을 바꿨는지 남는가'
select key, before, after, email from public.config_history();

\echo '### 7. 재배포로 노브를 다시 등록해도 운영자 값이 살아있는가'
select public.register_knob('staminaDrain', 0.65, 0.1, 2);
select key, value from public.game_config where key = 'staminaDrain';

\echo '### 8. 범위가 좁아지면 값도 그 안으로 들어오는가'
select public.register_knob('staminaDrain', 0.65, 0.1, 1.0);
select key, value from public.game_config where key = 'staminaDrain';

\echo '### 9. 일반 플레이어도 값을 읽을 수는 있어야 한다 (게임이 써야 하므로)'
grant usage on schema public to authenticated;
grant select on public.game_config to authenticated;
set role authenticated;
select as_user('11111111-1111-1111-1111-111111111111');
select count(*) as player_can_read from public.game_config;
select count(*) as player_sees_history from public.config_history();
reset role;
