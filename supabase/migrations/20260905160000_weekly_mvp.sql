-- 경기 MVP — 양 팀 선발 전원의 평점(캐주얼과 같은 lib/growth.ts 공식, 시드 고정)
-- 중 최고를 fixture에 적는다. 선수 순위 탭의 MVP 횟수 순위와 경기 결과 줄에 쓴다.
alter table public.weekly_fixtures
  add column if not exists mvp_slot smallint,
  add column if not exists mvp_player_id text,
  add column if not exists mvp_player_name text,
  add column if not exists mvp_rating numeric(3,1);

drop function if exists public.commit_weekly_fixture_result(bigint, int, int, jsonb, text, text, jsonb, jsonb, jsonb);

create or replace function public.commit_weekly_fixture_result(
  p_fixture_id     bigint,
  p_score_home     int,
  p_score_away     int,
  p_events         jsonb,
  p_seed           text,
  p_engine_version text,
  p_rewards        jsonb default '[]'::jsonb,
  p_scorers        jsonb default '[]'::jsonb,
  p_discipline     jsonb default '[]'::jsonb,
  p_mvp            jsonb default null
) returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_updated int;
  v_group bigint;
  v_line jsonb;
  v_home_slot smallint;
  v_away_slot smallint;
  v_yellows int;
  v_ban int;
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
        settled_at = now(),
        mvp_slot = nullif(p_mvp->>'slot', '')::smallint,
        mvp_player_id = p_mvp->>'playerId',
        mvp_player_name = left(p_mvp->>'name', 40),
        mvp_rating = nullif(p_mvp->>'rating', '')::numeric(3,1)
    where id = p_fixture_id and status = 'pending'
    returning group_id, home_slot, away_slot into v_group, v_home_slot, v_away_slot;
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

  if v_updated = 1 then
    -- Everyone banned for this fixture has now served a match of it.
    update public.weekly_discipline
      set ban_matches = ban_matches - 1, updated_at = now()
      where group_id = v_group and slot in (v_home_slot, v_away_slot) and ban_matches > 0;

    for v_line in select * from jsonb_array_elements(coalesce(p_discipline, '[]'::jsonb))
    loop
      insert into public.weekly_discipline (group_id, slot, player_id, player_name)
      values (v_group, (v_line->>'slot')::smallint, v_line->>'playerId', left(coalesce(v_line->>'name', '선수'), 40))
      on conflict (group_id, slot, player_id) do nothing;

      select yellows, ban_matches into v_yellows, v_ban from public.weekly_discipline
        where group_id = v_group and slot = (v_line->>'slot')::smallint and player_id = v_line->>'playerId';

      if coalesce((v_line->>'red')::boolean, false) then
        -- Two yellows: one match. Straight red: one to three.
        v_ban := greatest(v_ban, case when coalesce((v_line->>'secondYellow')::boolean, false) then 1
                                      else 1 + floor(random() * 3)::int end);
      else
        v_yellows := v_yellows + greatest(0, coalesce((v_line->>'yellows')::int, 0));
        if v_yellows >= 4 then
          v_ban := greatest(v_ban, 1);
          v_yellows := 0;
        end if;
      end if;

      update public.weekly_discipline
        set yellows = v_yellows, ban_matches = v_ban, updated_at = now()
        where group_id = v_group and slot = (v_line->>'slot')::smallint and player_id = v_line->>'playerId';
    end loop;
  end if;

  return jsonb_build_object('ok', v_updated = 1, 'alreadySettled', v_updated = 0);
end $$;

revoke all on function public.commit_weekly_fixture_result(bigint, int, int, jsonb, text, text, jsonb, jsonb, jsonb, jsonb) from public;
revoke all on function public.commit_weekly_fixture_result(bigint, int, int, jsonb, text, text, jsonb, jsonb, jsonb, jsonb) from authenticated;
grant execute on function public.commit_weekly_fixture_result(bigint, int, int, jsonb, text, text, jsonb, jsonb, jsonb, jsonb) to service_role;
