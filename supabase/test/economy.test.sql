\set ON_ERROR_STOP on
\pset pager off
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111','player@test'),
  ('22222222-2222-2222-2222-222222222222','boss@test') on conflict do nothing;
insert into public.admins (user_id) values ('22222222-2222-2222-2222-222222222222') on conflict do nothing;
create or replace function as_user(uid text) returns void language sql as
$$ select set_config('test.uid', uid, false); select null::void $$;
select as_user('11111111-1111-1111-1111-111111111111');

\echo '### 1. 이관 전에는 잔액 0, seeded=false'
select public.economy_snapshot() as before;

\echo '### 2. 세이브에서 한 번 이관'
select public.seed_economy(3000, 5) as seeded;
select public.seed_economy(999999, 0) as second_call_must_not_add;
select public.gold_balance('11111111-1111-1111-1111-111111111111') as balance;

\echo '### 3. 클라이언트가 부르면 거부되어야 한다 (commit_pull)'
grant usage on schema public to authenticated;
set role authenticated;
select as_user('11111111-1111-1111-1111-111111111111');
do $$ begin
  perform public.commit_pull('11111111-1111-1111-1111-111111111111','basic',0,'x','{}'::jsonb,0,0,false,'[]'::jsonb);
  raise notice 'FAIL — 클라이언트가 뽑기를 확정할 수 있다';
exception when others then
  raise notice 'OK — 거부됨: %', SQLERRM;
end $$;
reset role;

\echo '### 4. 서버(service_role)가 뽑기를 확정한다'
select as_user('11111111-1111-1111-1111-111111111111');
select public.commit_pull('11111111-1111-1111-1111-111111111111','basic',300,'seed-abc',
  '{"Normal":70,"Rare":20,"Legend":5,"Live":3,"World":2}'::jsonb, 5, 6, false,
  '[{"id":"p1","rarity":"Normal"}]'::jsonb) as pull;
select public.gold_balance('11111111-1111-1111-1111-111111111111') as after_pull;

\echo '### 5. 잔액보다 비싼 뽑기는 거부'
select public.commit_pull('11111111-1111-1111-1111-111111111111','premiumTen',999999,'s2',
  '{}'::jsonb, 6, 7, false, '[]'::jsonb) as too_expensive;
select count(*) as pulls_logged from public.pull_log where user_id='11111111-1111-1111-1111-111111111111';

\echo '### 6. 세이브가 원장과 맞춰지는가 (경기 보상 5000골드)'
select public.put_save(format('{"gold":%s,"cards":[],"pulls":{"total":1},"record":{"w":1,"d":0,"l":0}}',
  public.gold_balance('11111111-1111-1111-1111-111111111111') + 5000)::jsonb) as saved;
select public.gold_balance('11111111-1111-1111-1111-111111111111') as balance_now;

\echo '### 7. 원장 전체 — 모든 움직임이 한 줄씩'
select delta, reason, coalesce(ref,'-') as ref from public.gold_ledger
where user_id='11111111-1111-1111-1111-111111111111' order by id;

\echo '### 8. 확률표가 그때의 값으로 남는가 (고지 근거)'
select pack, cost, seed, pity_before, pity_after, rates->>'Legend' as legend_rate
from public.pull_log where user_id='11111111-1111-1111-1111-111111111111';

\echo '### 9. 남의 원장은 못 본다'
grant select on public.gold_ledger to authenticated;
set role authenticated;
select as_user('22222222-2222-2222-2222-222222222222');
select count(*) as other_persons_ledger from public.gold_ledger;
reset role;
