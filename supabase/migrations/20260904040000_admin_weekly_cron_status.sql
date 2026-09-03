-- 운영자 화면에서 크론 상태를 보기 위한 RPC.
--
-- cron.job/cron.job_run_details는 cron 스키마라 PostgREST가 그대로 노출하지
-- 않는다(공개 스키마가 아님). weekly_league_groups 등 게임 테이블은 이미
-- authenticated 전체가 읽을 수 있어 별도 RPC가 필요 없지만, 크론 상태는
-- 운영 정보라 register_knob과 같은 패턴(authenticated에 부여하되 함수
-- 안에서 is_admin()으로 막음)으로 감싼다.
create or replace function public.admin_weekly_cron_status()
  returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_jobs jsonb;
begin
  if not public.is_admin() then
    return jsonb_build_object('ok', false, 'reason', 'not admin');
  end if;

  select jsonb_agg(jsonb_build_object(
    'jobname', j.jobname,
    'schedule', j.schedule,
    'active', j.active,
    'recentRuns', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'status', d.status,
        'startTime', d.start_time,
        'endTime', d.end_time,
        'returnMessage', d.return_message
      ) order by d.start_time desc), '[]'::jsonb)
      from (
        select * from cron.job_run_details d2
        where d2.jobid = j.jobid
        order by d2.start_time desc
        limit 5
      ) d
    )
  ) order by j.jobname) into v_jobs
  from cron.job j
  where j.jobname in ('settle-weekly-fixtures', 'auto-bootstrap-placement');

  return jsonb_build_object('ok', true, 'jobs', coalesce(v_jobs, '[]'::jsonb));
end $$;

revoke all on function public.admin_weekly_cron_status() from public;
grant execute on function public.admin_weekly_cron_status() to authenticated;
