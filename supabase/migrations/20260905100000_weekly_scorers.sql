-- 경쟁 리그 득점 기록 — 선수 순위(득점왕)의 원천.
--
-- 실제 엔진으로 정산되는 경기는 득점자를 카드 uid로 안다(재생 결과의
-- scorerUids). Edge Function이 그걸 선수 id·이름으로 풀어 commit에 함께
-- 넘기고, 여기서는 fixture당 (슬롯, 선수) 별 골 수를 적는다. 포아송(AI 대
-- AI) 경기는 득점자가 없으므로 기록도 없다 — 선수 순위는 실유저가 낀
-- 경기의 기록으로만 매겨진다.
create table if not exists public.weekly_goal_scorers (
  id          bigserial primary key,
  fixture_id  bigint not null references public.weekly_fixtures(id) on delete cascade,
  group_id    bigint not null references public.weekly_league_groups(id) on delete cascade,
  slot        smallint not null check (slot between 0 and 15),
  player_id   text not null,
  player_name text not null,
  goals       smallint not null check (goals between 1 and 30),
  unique (fixture_id, slot, player_id)
);
create index if not exists weekly_goal_scorers_group_idx on public.weekly_goal_scorers (group_id, slot);

alter table public.weekly_goal_scorers enable row level security;
drop policy if exists "scorers are readable" on public.weekly_goal_scorers;
create policy "scorers are readable" on public.weekly_goal_scorers
  for select to authenticated using (true);

drop function if exists public.commit_weekly_fixture_result(bigint, int, int, jsonb, text, text, jsonb);

create or replace function public.commit_weekly_fixture_result(
  p_fixture_id     bigint,
  p_score_home     int,
  p_score_away     int,
  p_events         jsonb,
  p_seed           text,
  p_engine_version text,
  p_rewards        jsonb default '[]'::jsonb,
  p_scorers        jsonb default '[]'::jsonb
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
      on conflict do nothing;
    end loop;

    for v_line in select * from jsonb_array_elements(coalesce(p_scorers, '[]'::jsonb))
    loop
      insert into public.weekly_goal_scorers (fixture_id, group_id, slot, player_id, player_name, goals)
      values (p_fixture_id, v_group, (v_line->>'slot')::smallint, v_line->>'playerId',
              left(coalesce(v_line->>'name', '선수'), 40), greatest(1, least(30, (v_line->>'goals')::int)))
      on conflict do nothing;
    end loop;
  end if;

  return jsonb_build_object('ok', v_updated = 1, 'alreadySettled', v_updated = 0);
end $$;

revoke all on function public.commit_weekly_fixture_result(bigint, int, int, jsonb, text, text, jsonb, jsonb) from public;
revoke all on function public.commit_weekly_fixture_result(bigint, int, int, jsonb, text, text, jsonb, jsonb) from authenticated;
grant execute on function public.commit_weekly_fixture_result(bigint, int, int, jsonb, text, text, jsonb, jsonb) to service_role;
