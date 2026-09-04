-- 버그 수정: 20260905060000에서 weekly_rewards의 유일 제약을
-- (fixture_id, user_id, kind) → (fixture_id, user_id, kind, coalesce(card_id,''))
-- 유일 인덱스로 바꿨는데, commit_weekly_fixture_result의
-- `on conflict (fixture_id, user_id, kind)`는 그대로여서 "matching unique
-- constraint 없음" 오류로 정산 전체가 실패했다(14:00 경기가 '정산 중'에 멈춤).
-- 충돌 대상을 지정하지 않는 `on conflict do nothing`으로 바꾼다 — 어떤 유일
-- 인덱스에 걸려도 조용히 건너뛴다.
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
      on conflict do nothing;
    end loop;
  end if;

  return jsonb_build_object('ok', v_updated = 1, 'alreadySettled', v_updated = 0);
end $$;
