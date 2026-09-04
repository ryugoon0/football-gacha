-- 경쟁 리그 보상 — 경기 결과 골드와 핫타임 개입 보너스.
--
-- 액수는 정산하는 Edge Function(weekly-fixture-live)이 lib/weeklyLeague/
-- rewards.ts로 정해서 commit_weekly_fixture_result에 함께 넘기고, 여기서는
-- weekly_rewards에 적어 둘 뿐이다 — 공식은 lib에 한 벌만 있다. 정산은 내가
-- 접속해 있지 않을 때 일어나므로 골드가 바로 세이브에 들어갈 수 없고,
-- 경쟁 리그 탭의 "보상 받기"(claim_weekly_rewards)로 수령할 때 클라이언트
-- 세이브에 반영된다. 이 게임의 다른 보상과 같은 모양(서버가 액수, 클라이언트가
-- 잔고).

create table if not exists public.weekly_rewards (
  id         bigserial primary key,
  user_id    uuid not null references auth.users on delete cascade,
  fixture_id bigint not null references public.weekly_fixtures(id) on delete cascade,
  group_id   bigint not null references public.weekly_league_groups(id) on delete cascade,
  kind       text not null check (kind in ('match', 'hot_time')),
  amount     int not null check (amount >= 0),
  created_at timestamptz not null default now(),
  claimed_at timestamptz,
  unique (fixture_id, user_id, kind)
);
create index if not exists weekly_rewards_user_unclaimed_idx
  on public.weekly_rewards (user_id) where claimed_at is null;

alter table public.weekly_rewards enable row level security;
drop policy if exists "players read their own weekly rewards" on public.weekly_rewards;
create policy "players read their own weekly rewards" on public.weekly_rewards
  for select to authenticated using (auth.uid() = user_id);

-- 결과 확정에 보상 줄을 함께 받는다. 이미 pending이 아니면(다른 호출이 먼저
-- 확정) 보상도 넣지 않는다 — 두 번 정산되지 않는 것과 같은 이유.
drop function if exists public.commit_weekly_fixture_result(bigint, int, int, jsonb, text, text);

create or replace function public.commit_weekly_fixture_result(
  p_fixture_id     bigint,
  p_score_home     int,
  p_score_away     int,
  p_events         jsonb,
  p_seed           text,
  p_engine_version text,
  p_rewards        jsonb default '[]'::jsonb
) returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_updated int;
  v_group bigint;
  v_line jsonb;
begin
  perform pg_advisory_xact_lock(hashtext('weekly_fixture:' || p_fixture_id::text));

  update public.weekly_fixtures
    set score_home = p_score_home,
        score_away = p_score_away,
        events = p_events,
        simulation_seed = p_seed,
        engine_version = p_engine_version,
        settlement_engine = 'match',
        status = 'played',
        settled_at = now()
    where id = p_fixture_id and status = 'pending'
    returning group_id into v_group;
  get diagnostics v_updated = row_count;

  delete from public.weekly_fixture_stale_queue where fixture_id = p_fixture_id;

  if v_updated = 1 then
    for v_line in select * from jsonb_array_elements(coalesce(p_rewards, '[]'::jsonb))
    loop
      insert into public.weekly_rewards (user_id, fixture_id, group_id, kind, amount)
      values ((v_line->>'userId')::uuid, p_fixture_id, v_group, v_line->>'kind', (v_line->>'amount')::int)
      on conflict (fixture_id, user_id, kind) do nothing;
    end loop;
  end if;

  return jsonb_build_object('ok', v_updated = 1, 'alreadySettled', v_updated = 0);
end $$;

revoke all on function public.commit_weekly_fixture_result(bigint, int, int, jsonb, text, text, jsonb) from public;
revoke all on function public.commit_weekly_fixture_result(bigint, int, int, jsonb, text, text, jsonb) from authenticated;
grant execute on function public.commit_weekly_fixture_result(bigint, int, int, jsonb, text, text, jsonb) to service_role;

-- 수령 — 내 미수령 보상을 한 번에. 클라이언트가 부르고, 합계를 세이브 골드에
-- 더한다. 같은 줄을 두 번 받을 수 없도록 claimed_at으로 잠근다.
create or replace function public.claim_weekly_rewards()
  returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_total bigint;
  v_count int;
begin
  if v_user is null then
    return jsonb_build_object('ok', false, 'reason', 'not signed in');
  end if;
  perform pg_advisory_xact_lock(hashtext('weekly_rewards:' || v_user::text));

  with claimed as (
    update public.weekly_rewards
      set claimed_at = now()
      where user_id = v_user and claimed_at is null
      returning amount
  )
  select coalesce(sum(amount), 0), count(*) into v_total, v_count from claimed;

  if v_total > 0 then
    insert into public.gold_ledger (user_id, delta, reason, ref)
    values (v_user, v_total, 'weekly', 'claim:' || now()::text);
  end if;

  return jsonb_build_object('ok', true, 'amount', v_total, 'lines', v_count);
end $$;

revoke all on function public.claim_weekly_rewards() from public;
grant execute on function public.claim_weekly_rewards() to authenticated;
