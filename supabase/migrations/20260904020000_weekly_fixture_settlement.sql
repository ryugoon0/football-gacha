-- 주간 대회 경기 자동 정산 — Phase 3.
--
-- 임시 근사치입니다. 진짜 카드·전술 기반 엔진(lib/matchEngine.ts)으로
-- 정산하려면 이 리그용 스쿼드를 유저가 저장하는 화면이 먼저 있어야 하는데
-- 아직 없습니다. 지금은 weekly_league_members.rating(평점) 하나로
-- lib/league.ts의 simulateAiMatch와 같은 포아송 모델을 SQL로 옮겨 씁니다.
-- "로직은 한 벌" 원칙에서 벗어나는 걸 알면서 하는 선택입니다 — 실제 엔진이
-- 붙으면 이 함수는 은퇴시키고 Edge Function 기반 정산으로 옮깁니다
-- (docs/WEEKLY_TOURNAMENT.md 참고).
--
-- 이런 이유로 simulation_seed는 재현 가능한 시드가 아니라 "언제 정산했는지"
-- 정도의 감사용 참조일 뿐입니다 — PR2(simulate-match)의 진짜 seed 재현과는
-- 다릅니다. 착각하지 않도록 이 컬럼에 값을 넣지 않고 null로 둡니다.

-- 버그 수정: seed_weekly_competitions가 OPENING_PLACEMENT 타입을 만들지
-- 않고 있었다(type CHECK를 넓힌 마이그레이션에서 이 함수를 안 고쳤음) —
-- generate-placement-league Edge Function이 이미 배포돼 있어 실제로 이
-- 문제에 걸린다. on conflict do nothing이라 재실행해도 안전하다.
create or replace function public.seed_weekly_competitions(p_group_id bigint)
  returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  insert into public.weekly_competitions (group_id, type, display_name)
  values
    (p_group_id, 'OPENING_PLACEMENT', '개막 배치 리그'),
    (p_group_id, 'LEAGUE', '리그'),
    (p_group_id, 'CUP_A', 'Cup A'),
    (p_group_id, 'CUP_B', 'Cup B'),
    (p_group_id, 'MASTERS_FINAL', 'Masters Final')
  on conflict (group_id, type) do nothing;

  return (
    select jsonb_object_agg(type, id)
    from public.weekly_competitions
    where group_id = p_group_id
  );
end $$;

create extension if not exists pg_cron;

create or replace function public._weekly_poisson_goal(p_lambda numeric)
  returns int
  language plpgsql
as $$
declare
  v_limit numeric := exp(-p_lambda);
  v_goals int := 0;
  v_product numeric := random();
begin
  while v_product > v_limit and v_goals < 9 loop
    v_goals := v_goals + 1;
    v_product := v_product * random();
  end loop;
  return v_goals;
end $$;

revoke all on function public._weekly_poisson_goal(numeric) from public;
revoke all on function public._weekly_poisson_goal(numeric) from authenticated;

-- 시각이 된(scheduled_at_utc <= now()) pending fixture를 최대 p_limit개까지
-- 정산한다. pg_cron이 몇 분마다 이걸 부른다 — 아무도 접속하지 않아도 경기가
-- 진행된다는 요구사항(스펙 7절)을 이 근사치 수준에서 만족시킨다.
create or replace function public.settle_due_weekly_fixtures(p_limit int default 500)
  returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_row record;
  v_count int := 0;
  v_home_rating smallint;
  v_away_rating smallint;
  v_diff numeric;
  v_lambda_home numeric;
  v_lambda_away numeric;
begin
  for v_row in
    select id, group_id, home_slot, away_slot
    from public.weekly_fixtures
    where status = 'pending' and scheduled_at_utc <= now()
    order by scheduled_at_utc
    limit p_limit
    for update skip locked
  loop
    select rating into v_home_rating from public.weekly_league_members
      where group_id = v_row.group_id and slot = v_row.home_slot;
    select rating into v_away_rating from public.weekly_league_members
      where group_id = v_row.group_id and slot = v_row.away_slot;

    -- lib/league.ts의 simulateAiMatch와 같은 공식(홈 3점 보정, -4.5~4.5 사이 클램프).
    v_diff := coalesce(v_home_rating, 60) + 3 - coalesce(v_away_rating, 60);
    v_lambda_home := greatest(0.25, least(4.5, 1.3 + v_diff / 22));
    v_lambda_away := greatest(0.25, least(4.5, 1.3 - v_diff / 22));

    update public.weekly_fixtures
      set score_home = public._weekly_poisson_goal(v_lambda_home),
          score_away = public._weekly_poisson_goal(v_lambda_away),
          status = 'played',
          settled_at = now()
      where id = v_row.id;

    v_count := v_count + 1;
  end loop;

  return jsonb_build_object('ok', true, 'settled', v_count);
end $$;

revoke all on function public.settle_due_weekly_fixtures(int) from public;
revoke all on function public.settle_due_weekly_fixtures(int) from authenticated;
grant execute on function public.settle_due_weekly_fixtures(int) to service_role;

-- pg_cron은 데이터베이스 소유자 권한으로 돈다 — service_role grant와 별개로
-- 함수 자체가 SECURITY DEFINER라 문제없다. 5분마다, 최근 것만.
select cron.unschedule('settle-weekly-fixtures')
  where exists (select 1 from cron.job where jobname = 'settle-weekly-fixtures');

select cron.schedule('settle-weekly-fixtures', '*/5 * * * *', $$select public.settle_due_weekly_fixtures()$$);
