-- 도움(어시스트) 기록 — 득점 순위 표에 도움과 공격 포인트가 붙는다.
-- 엔진이 골마다 제공자를 고르고(pickAssister), scorersOf가 선수 단위로 합쳐
-- commit에 넘긴다. 골 0·도움 1인 행도 이제 유효하다.
alter table public.weekly_goal_scorers
  add column if not exists assists smallint not null default 0 check (assists between 0 and 30);
alter table public.weekly_goal_scorers drop constraint if exists weekly_goal_scorers_goals_check;
alter table public.weekly_goal_scorers add constraint weekly_goal_scorers_goals_check check (goals between 0 and 30);
alter table public.weekly_goal_scorers drop constraint if exists weekly_goal_scorers_any_check;
alter table public.weekly_goal_scorers add constraint weekly_goal_scorers_any_check check (goals + assists >= 1);

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
      insert into public.weekly_goal_scorers (fixture_id, group_id, slot, player_id, player_name, goals, assists)
      values (p_fixture_id, v_group, (v_line->>'slot')::smallint, v_line->>'playerId',
              left(coalesce(v_line->>'name', '선수'), 40),
              greatest(0, least(30, coalesce((v_line->>'goals')::int, 0))),
              greatest(0, least(30, coalesce((v_line->>'assists')::int, 0))))
      on conflict do nothing;
    end loop;
  end if;

  return jsonb_build_object('ok', v_updated = 1, 'alreadySettled', v_updated = 0);
end $$;

revoke all on function public.commit_weekly_fixture_result(bigint, int, int, jsonb, text, text, jsonb, jsonb) from public;
revoke all on function public.commit_weekly_fixture_result(bigint, int, int, jsonb, text, text, jsonb, jsonb) from authenticated;
grant execute on function public.commit_weekly_fixture_result(bigint, int, int, jsonb, text, text, jsonb, jsonb) to service_role;
