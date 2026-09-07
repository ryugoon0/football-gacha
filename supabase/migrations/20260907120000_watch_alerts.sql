-- 1시간마다 부정 행위 의심 계정 점검 배치.
--
-- watchlist 뷰는 볼 때마다 다시 계산되는 순간 사진이라, 운영자가 화면을 안 보고 있으면
-- 신호가 지나가 버린다. 매시 정각 pg_cron 이 뷰를 읽어 신호 2개 이상(또는 저장 거부가
-- 있는) 계정을 watch_alerts 에 남긴다. 계정당 한 줄이며, 신호가 더 늘면 확인 표시를
-- 풀어 다시 위로 올린다. 운영자 탭 모니터링에서 「확인」으로 닫는다.

create table if not exists public.watch_alerts (
  user_id         uuid primary key references auth.users on delete cascade,
  risk            text not null,
  signals         int not null,
  score           numeric not null default 0,
  kinds           text[] not null default '{}',
  detail          text not null default '',
  first_seen      timestamptz not null default now(),
  last_seen       timestamptz not null default now(),
  acknowledged_at timestamptz
);
alter table public.watch_alerts enable row level security;

create table if not exists public.watch_check_runs (
  id        bigserial primary key,
  ran_at    timestamptz not null default now(),
  total     int not null default 0,
  fresh     int not null default 0
);
alter table public.watch_check_runs enable row level security;

-- lib/monitor.ts riskOf 와 같은 규칙.
create or replace function public._watch_risk(p_signals bigint, p_kinds text[])
  returns text
  language sql
  immutable
as $$
  select case
    when p_signals >= 3 or ('reject' = any(p_kinds) and p_signals >= 2) then 'high'
    when p_signals >= 2 or 'reject' = any(p_kinds) then 'medium'
    else 'low' end
$$;

create or replace function public.run_watch_check()
  returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_row record;
  v_total int := 0;
  v_fresh int := 0;
  v_risk text;
  v_existing public.watch_alerts%rowtype;
begin
  for v_row in select * from public.watchlist loop
    v_risk := public._watch_risk(v_row.signals, v_row.kinds);
    if v_risk = 'low' then continue; end if;
    v_total := v_total + 1;
    select * into v_existing from public.watch_alerts where user_id = v_row.user_id;
    if v_existing.user_id is null then
      v_fresh := v_fresh + 1;
      insert into public.watch_alerts (user_id, risk, signals, score, kinds, detail)
      values (v_row.user_id, v_risk, v_row.signals, coalesce(v_row.score, 0), coalesce(v_row.kinds, '{}'), coalesce(v_row.detail, ''));
    else
      if v_existing.acknowledged_at is not null and (v_row.signals > v_existing.signals or v_risk = 'high' and v_existing.risk <> 'high') then
        v_fresh := v_fresh + 1;
      end if;
      update public.watch_alerts
        set risk = v_risk, signals = v_row.signals, score = coalesce(v_row.score, 0), kinds = coalesce(v_row.kinds, '{}'),
            detail = coalesce(v_row.detail, ''), last_seen = now(),
            -- 신호가 늘었거나 위험도가 올라갔으면 확인 표시를 푼다.
            acknowledged_at = case when v_row.signals > v_existing.signals or (v_risk = 'high' and v_existing.risk <> 'high') then null else v_existing.acknowledged_at end
        where user_id = v_row.user_id;
    end if;
  end loop;
  insert into public.watch_check_runs (total, fresh) values (v_total, v_fresh);
  delete from public.watch_check_runs where id not in (select id from public.watch_check_runs order by id desc limit 200);
  return jsonb_build_object('ok', true, 'total', v_total, 'fresh', v_fresh);
end $$;
revoke all on function public.run_watch_check() from public;
revoke all on function public.run_watch_check() from authenticated;

create or replace function public.admin_watch_alerts()
  returns table (
    user_id uuid, email text, club text, risk text, signals int, score numeric, kinds text[], detail text,
    first_seen timestamptz, last_seen timestamptz, acknowledged_at timestamptz, last_run timestamptz, last_run_total int, last_run_fresh int
  )
  language sql
  stable
  security definer
  set search_path = public
as $$
  select a.user_id, u.email::text, s.data->>'club' as club, a.risk, a.signals, a.score, a.kinds, a.detail,
         a.first_seen, a.last_seen, a.acknowledged_at,
         r.ran_at, r.total, r.fresh
  from public.watch_alerts a
  left join auth.users u on u.id = a.user_id
  left join public.saves s on s.user_id = a.user_id
  left join lateral (select ran_at, total, fresh from public.watch_check_runs order by id desc limit 1) r on true
  where public.is_admin()
  order by (a.acknowledged_at is null) desc, case a.risk when 'high' then 0 else 1 end, a.last_seen desc
  limit 200;
$$;
revoke all on function public.admin_watch_alerts() from public;
grant execute on function public.admin_watch_alerts() to authenticated;

create or replace function public.admin_watch_last_run()
  returns jsonb
  language sql
  stable
  security definer
  set search_path = public
as $$
  select coalesce((select jsonb_build_object('ranAt', ran_at, 'total', total, 'fresh', fresh) from public.watch_check_runs where public.is_admin() order by id desc limit 1), '{}'::jsonb);
$$;
revoke all on function public.admin_watch_last_run() from public;
grant execute on function public.admin_watch_last_run() to authenticated;

create or replace function public.admin_ack_watch_alert(p_user uuid)
  returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  if not public.is_admin() then
    return jsonb_build_object('ok', false, 'reason', 'not an operator');
  end if;
  update public.watch_alerts set acknowledged_at = now() where user_id = p_user;
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.admin_ack_watch_alert(uuid) from public;
grant execute on function public.admin_ack_watch_alert(uuid) to authenticated;

-- 운영자가 지금 바로 한 번 돌려 볼 수 있게.
create or replace function public.admin_run_watch_check()
  returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  if not public.is_admin() then
    return jsonb_build_object('ok', false, 'reason', 'not an operator');
  end if;
  return public.run_watch_check();
end $$;
revoke all on function public.admin_run_watch_check() from public;
grant execute on function public.admin_run_watch_check() to authenticated;

-- 매시 정각.
select cron.unschedule(jobid) from cron.job where jobname = 'watch-check-hourly';
select cron.schedule('watch-check-hourly', '0 * * * *', $$select public.run_watch_check()$$);
-- 지금 한 번.
select public.run_watch_check();
