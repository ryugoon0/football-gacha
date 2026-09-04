-- 라이브 경기 입장·지시·히든 카드 사용을 킥오프 10분 전부터 연다(전에는 3분).
--
-- 3분은 라인업을 보고 히든 카드 조건까지 따지기엔 짧았다. 매 정각 경기라
-- 10분 전 창(:50~:00)은 직전 경기의 라이브 창(:00~:15)과 겹치지 않는다.
-- Edge Function의 PRE_WINDOW_MS, 클라이언트의 PRE_WINDOW_MS와 같은 값이어야 한다.
create or replace function public.submit_weekly_fixture_command(
  p_fixture_id      bigint,
  p_user            uuid,
  p_kind            text,
  p_payload         jsonb,
  p_idempotency_key text
) returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_fixture record;
  v_side text;
  v_minute int;
  v_id bigint;
begin
  select f.id, f.group_id, f.home_slot, f.away_slot, f.status, f.scheduled_at_utc
    into v_fixture
    from public.weekly_fixtures f where f.id = p_fixture_id;
  if v_fixture.id is null then
    return jsonb_build_object('ok', false, 'reason', 'not found');
  end if;
  if v_fixture.status <> 'pending' then
    return jsonb_build_object('ok', false, 'reason', 'already settled');
  end if;
  if now() < v_fixture.scheduled_at_utc - interval '10 minutes' then
    return jsonb_build_object('ok', false, 'reason', 'not started');
  end if;
  if now() >= v_fixture.scheduled_at_utc + interval '15 minutes' then
    return jsonb_build_object('ok', false, 'reason', 'live window over');
  end if;

  select case when m.slot = v_fixture.home_slot then 'home' else 'away' end
    into v_side
    from public.weekly_league_members m
    where m.group_id = v_fixture.group_id
      and m.kind = 'user' and m.user_id = p_user
      and m.slot in (v_fixture.home_slot, v_fixture.away_slot);
  if v_side is null then
    return jsonb_build_object('ok', false, 'reason', 'not a participant');
  end if;

  -- 킥오프 전은 분 0 — 재생기가 첫 틱 전에 적용한다.
  v_minute := least(90, greatest(0, floor(extract(epoch from (now() - v_fixture.scheduled_at_utc)) / 10)::int));

  insert into public.weekly_fixture_commands
    (fixture_id, side, user_id, kind, payload, idempotency_key, received_match_minute)
  values (p_fixture_id, v_side, p_user, p_kind, p_payload, p_idempotency_key, v_minute)
  on conflict (fixture_id, user_id, idempotency_key) do nothing
  returning id into v_id;

  if v_id is null then
    select id, received_match_minute into v_id, v_minute
      from public.weekly_fixture_commands
      where fixture_id = p_fixture_id and user_id = p_user and idempotency_key = p_idempotency_key;
    return jsonb_build_object('ok', true, 'id', v_id, 'side', v_side, 'minute', v_minute, 'duplicate', true);
  end if;
  return jsonb_build_object('ok', true, 'id', v_id, 'side', v_side, 'minute', v_minute, 'duplicate', false);
end $$;
