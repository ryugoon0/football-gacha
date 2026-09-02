\set ON_ERROR_STOP on
\pset pager off
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'player@test'),
  ('22222222-2222-2222-2222-222222222222', 'boss@test'),
  ('33333333-3333-3333-3333-333333333333', 'cheat@test')
on conflict do nothing;
insert into public.admins (user_id) values ('22222222-2222-2222-2222-222222222222')
on conflict do nothing;

create or replace function as_user(uid text) returns void language sql as
$$ select set_config('test.uid', uid, false); select null::void $$;

\echo '### 1. put_save 기본 동작'
select as_user('11111111-1111-1111-1111-111111111111');
select public.put_save('{"gold":3000,"cards":[{"uid":"a"}],"pulls":{"total":1},"record":{"w":1,"d":0,"l":0},"season":{"index":1}}') as normal;
select public.put_save('{"gold":999999999999999,"cards":[],"pulls":{"total":0},"record":{"w":0,"d":0,"l":0}}') as absurd;
select public.put_save('{"gold":3000,"cards":"헛소리","pulls":{"total":0},"record":{"w":0,"d":0,"l":0}}') as bad_shape;

\echo '### 2. 거부가 기록으로 남는가 (이전 버전의 결함)'
select coalesce(rejected,'(통과)') as rejected, gold
from public.save_audit where user_id='11111111-1111-1111-1111-111111111111' order by id;

\echo '### 3. 저장된 것은 통과한 값뿐인가'
select data->>'gold' as saved_gold from public.saves where user_id='11111111-1111-1111-1111-111111111111';

\echo '### 4. 직접 쓰기는 막히는가 (authenticated 역할로)'
grant usage on schema public to authenticated;
grant select on public.saves to authenticated;
set role authenticated;
select as_user('11111111-1111-1111-1111-111111111111');
do $$ begin
  insert into public.saves (user_id, data) values ('11111111-1111-1111-1111-111111111111','{"gold":1}');
  raise notice 'FAIL — 직접 쓰기가 통과했다';
exception when others then
  raise notice 'OK — 직접 쓰기 거부됨: %', SQLERRM;
end $$;
reset role;

\echo '### 5. 되감기 탐지 (전적이 줄어드는 세이브)'
select as_user('33333333-3333-3333-3333-333333333333');
select public.put_save('{"gold":5000,"cards":[],"pulls":{"total":0},"record":{"w":50,"d":0,"l":0}}');
select public.put_save('{"gold":9000,"cards":[],"pulls":{"total":0},"record":{"w":20,"d":0,"l":0}}');
select public.put_save('{"gold":9000,"cards":[],"pulls":{"total":0},"record":{"w":51,"d":0,"l":0}}');
select rollbacks, biggest_drop from public.watch_rollback where user_id='33333333-3333-3333-3333-333333333333';

\echo '### 6. 여러 신호가 겹치면 위로 올라오는가'
insert into public.save_audit (user_id, gold, cards, played, rejected)
select '33333333-3333-3333-3333-333333333333', 1e13, 0, 0, 'gold out of range: test'
from generate_series(1,3);
select signals, score, kinds from public.watchlist where user_id='33333333-3333-3333-3333-333333333333';

\echo '### 7. 운영자만 감시 목록을 볼 수 있는가'
select as_user('22222222-2222-2222-2222-222222222222');
select count(*) as as_operator from public.watchlist_for_admin();
select as_user('11111111-1111-1111-1111-111111111111');
select count(*) as as_player from public.watchlist_for_admin();

\echo '### 8. 서비스 상태'
select as_user('22222222-2222-2222-2222-222222222222');
select jsonb_pretty(public.health_for_admin());
select as_user('11111111-1111-1111-1111-111111111111');
select public.health_for_admin() as player_sees;
