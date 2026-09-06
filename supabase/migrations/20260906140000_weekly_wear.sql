-- 경쟁 리그 체력 원장 — 정산된 내 경기마다 "누가 뛰었나"를 적어 두고, 클라이언트가
-- 접속하면 그 줄을 세이브에 반영한다(선발 소모·교체 소모·휴식 회복, 노브는
-- lib/tuning.ts weeklyDrainStarter/weeklyDrainSub/weeklyRestRecover). 서버는 세이브를
-- 직접 고치지 않는다(보상·징계와 같은 모양). 적용한 줄은 applied_at 으로 잠근다.
create table if not exists public.weekly_wear (
  id         bigserial primary key,
  user_id    uuid not null references auth.users on delete cascade,
  fixture_id bigint not null references public.weekly_fixtures(id) on delete cascade,
  group_id   bigint not null references public.weekly_league_groups(id) on delete cascade,
  starters   jsonb not null default '[]'::jsonb,
  subs       jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  applied_at timestamptz,
  unique (fixture_id, user_id)
);
create index if not exists weekly_wear_user_open_idx on public.weekly_wear (user_id) where applied_at is null;

alter table public.weekly_wear enable row level security;
drop policy if exists "players read their own wear" on public.weekly_wear;
create policy "players read their own wear" on public.weekly_wear for select to authenticated using (auth.uid() = user_id);

drop function if exists public.commit_weekly_fixture_result(bigint, int, int, jsonb, text, text, jsonb, jsonb, jsonb, jsonb, jsonb);

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
  p_mvp            jsonb default null,
  p_ratings        jsonb default '[]'::jsonb,
  p_wear           jsonb default '[]'::jsonb
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

    for v_line in select * from jsonb_array_elements(coalesce(p_ratings, '[]'::jsonb))
    loop
      insert into public.weekly_player_ratings (fixture_id, group_id, slot, player_id, player_name, position, rating, goals, assists)
      values (p_fixture_id, v_group, (v_line->>'slot')::smallint, v_line->>'playerId',
              left(coalesce(v_line->>'name', '선수'), 40),
              left(coalesce(v_line->>'position', ''), 8),
              greatest(0, least(10, coalesce((v_line->>'rating')::numeric, 0))),
              greatest(0, least(30, coalesce((v_line->>'goals')::int, 0))),
              greatest(0, least(30, coalesce((v_line->>'assists')::int, 0))))
      on conflict do nothing;
    end loop;

    for v_line in select * from jsonb_array_elements(coalesce(p_wear, '[]'::jsonb))
    loop
      if nullif(v_line->>'userId', '') is null then continue; end if;
      insert into public.weekly_wear (user_id, fixture_id, group_id, starters, subs)
      values ((v_line->>'userId')::uuid, p_fixture_id, v_group,
              coalesce(v_line->'starters', '[]'::jsonb), coalesce(v_line->'subs', '[]'::jsonb))
      on conflict do nothing;
    end loop;
  end if;

  if v_updated = 1 then
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

revoke all on function public.commit_weekly_fixture_result(bigint, int, int, jsonb, text, text, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb) from public;
revoke all on function public.commit_weekly_fixture_result(bigint, int, int, jsonb, text, text, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb) from authenticated;
grant execute on function public.commit_weekly_fixture_result(bigint, int, int, jsonb, text, text, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb) to service_role;

-- 클라이언트가 반영한 줄을 잠근다. 본인 줄만.
create or replace function public.ack_weekly_wear(p_ids bigint[])
  returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_n int;
begin
  if v_user is null then return jsonb_build_object('ok', false, 'reason', 'not signed in'); end if;
  update public.weekly_wear set applied_at = now()
    where user_id = v_user and applied_at is null and id = any(p_ids);
  get diagnostics v_n = row_count;
  return jsonb_build_object('ok', true, 'applied', v_n);
end $$;

revoke all on function public.ack_weekly_wear(bigint[]) from public;
grant execute on function public.ack_weekly_wear(bigint[]) to authenticated;
