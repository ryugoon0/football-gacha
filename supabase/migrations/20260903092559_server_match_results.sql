-- 경기 판정을 서버로 (SECURITY_ARCHITECTURE.md 3단계, 리그/컵 경기부터).
--
-- draw-pack이 뽑기에서 한 것과 같은 모양이다: 클라이언트는 무엇을 하고
-- 싶은지만 말하고(스쿼드 배치·전술·어느 상대와), 결과가 무엇인지는
-- 서버가 정한다. 난수는 crypto이고, 시드는 남겨서 재현 가능하다.
--
-- 지금 범위: 리그·컵·친선 경기 전부 "제출 → 서버가 한 번에 계산 →
-- 반환" 방식으로 판정한다. 경기 중 실시간 개입(전술 변경·교체)은
-- 이 단계에서 잠시 끈다 — 개입을 서버가 접수하는 건 다음 단계(4단계,
-- 실시간 리그)의 일이라, 지금 개입을 허용하면 서버가 계산한 결과와
-- 클라이언트가 재생하는 화면이 어긋날 수 있다.

create table if not exists public.match_results (
  id              bigserial primary key,
  user_id         uuid not null references auth.users on delete cascade,
  competition     text not null check (competition in ('league', 'cup', 'friendly')),
  seed            text not null,
  engine_version  text not null,
  division        smallint not null check (division between 1 and 5),
  -- 아직 서버가 리그 대진을 갖고 있지 않으므로(3절 참고, 실유저 매칭은
  -- 그다음 단계) 상대 이름·평점은 클라이언트가 알려준 값을 받는다.
  -- 골드 보상은 상대 평점이 아니라 division과 승패로만 정해지므로
  -- (matchReward 참고), 상대를 부풀려도 보상이 늘지 않는다.
  opponent_name   text not null check (char_length(opponent_name) between 1 and 40),
  opponent_rating smallint not null check (opponent_rating between 0 and 200),
  venue           text not null check (venue in ('home', 'away', 'neutral')),
  score_for       smallint not null check (score_for between 0 and 30),
  score_against   smallint not null check (score_against between 0 and 30),
  result          text not null check (result in ('W', 'D', 'L')),
  reward          bigint not null check (reward >= 0),
  events          jsonb not null,
  created_at      timestamptz not null default now()
);

create index if not exists match_results_user_idx on public.match_results (user_id, id desc);

alter table public.match_results enable row level security;
drop policy if exists "players read their own match results" on public.match_results;
create policy "players read their own match results" on public.match_results
  for select to authenticated using (auth.uid() = user_id);

-- 경기를 한 트랜잭션으로 확정합니다. commit_pull과 같은 이유로
-- service_role만 부를 수 있습니다 — 클라이언트가 직접 부를 수 있으면
-- 원하는 스코어를 넣어 달라고 할 수 있습니다.
create or replace function public.commit_match(
  p_user            uuid,
  p_competition     text,
  p_seed            text,
  p_engine_version  text,
  p_division        int,
  p_opponent_name   text,
  p_opponent_rating int,
  p_venue           text,
  p_score_for       int,
  p_score_against   int,
  p_result          text,
  p_reward          bigint,
  p_events          jsonb
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
     opponent_rating, venue, score_for, score_against, result, reward, events)
  values
    (p_user, p_competition, p_seed, p_engine_version, p_division, p_opponent_name,
     p_opponent_rating, p_venue, p_score_for, p_score_against, p_result, p_reward, p_events)
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
  uuid, text, text, text, int, text, int, text, int, int, text, bigint, jsonb
) from public;
revoke all on function public.commit_match(
  uuid, text, text, text, int, text, int, text, int, int, text, bigint, jsonb
) from authenticated;
grant execute on function public.commit_match(
  uuid, text, text, text, int, text, int, text, int, int, text, bigint, jsonb
) to service_role;
