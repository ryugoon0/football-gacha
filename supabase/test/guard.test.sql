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
-- record.w는 위 normal과 같은 1로 둔다 — 이 케이스가 보려는 것은 cards가
-- 배열이 아닐 때도 안 죽는지지, 되감기 거부와는 무관하기 때문이다.
select public.put_save('{"gold":3000,"cards":"헛소리","pulls":{"total":0},"record":{"w":1,"d":0,"l":0}}') as bad_shape;

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

\echo '### 5. 되감기는 이제 거부된다 (예전엔 기록만 하고 통과시켰다)'
select as_user('33333333-3333-3333-3333-333333333333');
select public.put_save('{"gold":5000,"cards":[],"pulls":{"total":0},"record":{"w":50,"d":0,"l":0},"season":{"index":1},"capacity":100,"trophies":{"cup":0,"promotions":0}}') as accepted_50;
-- 낮은 played로 되돌리는 시도. ok:false, reason은 'progress rollback: played 50 -> 20' 이어야 한다.
select public.put_save('{"gold":9000,"cards":[],"pulls":{"total":0},"record":{"w":20,"d":0,"l":0},"season":{"index":1},"capacity":100,"trophies":{"cup":0,"promotions":0}}') as rejected_20;
-- 거부됐으므로 저장된 값은 여전히 played=50, gold=5000 이어야 한다.
select data->>'gold' as gold_after_rejected_attempt from public.saves where user_id='33333333-3333-3333-3333-333333333333';
-- 앞으로 나아가는 저장은 정상적으로 통과한다.
select public.put_save('{"gold":9000,"cards":[],"pulls":{"total":0},"record":{"w":51,"d":0,"l":0},"season":{"index":1},"capacity":100,"trophies":{"cup":0,"promotions":0}}') as accepted_51;
-- watch_rollback은 거부된 시도까지 신호로 잡는다 (rollbacks=1, biggest_drop=30).
select rollbacks, biggest_drop from public.watch_rollback where user_id='33333333-3333-3333-3333-333333333333';

\echo '### 5b. 카드 방출·합성처럼 카드 수만 줄어드는 것은 되감기가 아니다'
select public.put_save('{"gold":9000,"cards":[{"uid":"only-one-left"}],"pulls":{"total":0},"record":{"w":52,"d":0,"l":0},"season":{"index":1},"capacity":100,"trophies":{"cup":0,"promotions":0}}') as cards_can_shrink;

\echo '### 5c. revision compare-and-swap — 다른 탭이 먼저 저장한 뒤의 재전송은 거부된다'
select revision from public.saves where user_id='33333333-3333-3333-3333-333333333333';
-- 위에서 읽은 revision보다 낮은(옛날) 값을 base로 보내면 stale_save_revision으로 거부된다.
select public.put_save(
  '{"gold":9000,"cards":[{"uid":"only-one-left"}],"pulls":{"total":0},"record":{"w":52,"d":0,"l":0},"season":{"index":1},"capacity":100,"trophies":{"cup":0,"promotions":0}}',
  0
) as stale_revision_rejected;
-- base_revision을 생략(null)하면 CAS는 건너뛰고 단조 필드 검사만 받는다 — 구버전 클라이언트 호환.
select public.put_save('{"gold":9500,"cards":[{"uid":"only-one-left"}],"pulls":{"total":0},"record":{"w":53,"d":0,"l":0},"season":{"index":1},"capacity":100,"trophies":{"cup":0,"promotions":0}}') as no_base_revision_still_ok;

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
