-- 데일리 PvP (docs/DAILY_PVP_DESIGN.md).
--
-- 미니게임과 별도로 하루 3회, 실제 유저를 검색해 그 사람의 "지금" 라인업과
-- 즉시 붙는 캐주얼 PvP다. 기존 public_club_squads(옵트인 스냅샷)와는 완전히
-- 별개 경로로, 상대의 saves를 직접 읽는다 — "PvP 상대는 공개 설정과 무관하게
-- 항상 보인다"로 이미 확정된 사항이다. 실제 라인업 조회·판정 로직은
-- supabase/functions/pvp-opponent-squad, simulate-pvp-match 두 Edge
-- Function이 lib/publicClub.ts·lib/serverMatch.ts를 그대로 번들해서 맡는다
-- (로직이 SQL에 다시 쓰이지 않도록) — 여기서는 검색과, commit_match가
-- pvp 결과도 받을 수 있도록 넓히는 것만 한다.

-- ---------------------------------------------------------------------------
-- 1. 상대 검색 — saves.data->>'club'을 대상으로, 클럽명뿐이라 민감정보 아님
-- ---------------------------------------------------------------------------
create or replace function public.search_pvp_opponents(p_query text)
  returns jsonb
  language sql
  stable
  security definer
  set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'userId', s.user_id,
    'clubName', s.club_name,
    'division', s.division
  )), '[]'::jsonb)
  from (
    select user_id, data->>'club' as club_name, (data->'season'->>'division')::int as division
    from public.saves
    where auth.uid() is not null
      and user_id <> auth.uid()
      and coalesce(data->>'club', '') <> ''
      and data->>'club' ilike '%' || p_query || '%'
    order by updated_at desc
    limit 20
  ) s
$$;

revoke all on function public.search_pvp_opponents(text) from public;
grant execute on function public.search_pvp_opponents(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. match_results가 pvp 결과와 상대 user_id도 받도록 넓힌다
-- ---------------------------------------------------------------------------
alter table public.match_results drop constraint if exists match_results_competition_check;
alter table public.match_results
  add constraint match_results_competition_check
  check (competition in ('league', 'cup', 'friendly', 'pvp'));

alter table public.match_results
  add column if not exists opponent_user_id uuid references auth.users on delete set null;

drop function if exists public.commit_match(
  uuid, text, text, text, int, text, int, text, int, int, text, bigint, jsonb
);

create or replace function public.commit_match(
  p_user             uuid,
  p_competition      text,
  p_seed             text,
  p_engine_version   text,
  p_division         int,
  p_opponent_name    text,
  p_opponent_rating  int,
  p_venue            text,
  p_score_for        int,
  p_score_against    int,
  p_result           text,
  p_reward           bigint,
  p_events           jsonb,
  p_opponent_user_id uuid default null
) returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_match_id bigint;
begin
  perform pg_advisory_xact_lock(hashtext(p_user::text));

  insert into public.match_results
    (user_id, competition, seed, engine_version, division, opponent_name,
     opponent_rating, venue, score_for, score_against, result, reward, events,
     opponent_user_id)
  values
    (p_user, p_competition, p_seed, p_engine_version, p_division, p_opponent_name,
     p_opponent_rating, p_venue, p_score_for, p_score_against, p_result, p_reward, p_events,
     p_opponent_user_id)
  returning id into v_match_id;

  if p_reward > 0 then
    insert into public.gold_ledger (user_id, delta, reason, ref)
    values (p_user, p_reward, 'match', v_match_id::text);
  end if;

  return jsonb_build_object(
    'ok', true,
    'matchId', v_match_id,
    'balance', public.gold_balance(p_user)
  );
end $$;

revoke all on function public.commit_match(
  uuid, text, text, text, int, text, int, text, int, int, text, bigint, jsonb, uuid
) from public;
revoke all on function public.commit_match(
  uuid, text, text, text, int, text, int, text, int, int, text, bigint, jsonb, uuid
) from authenticated;
grant execute on function public.commit_match(
  uuid, text, text, text, int, text, int, text, int, int, text, bigint, jsonb, uuid
) to service_role;
