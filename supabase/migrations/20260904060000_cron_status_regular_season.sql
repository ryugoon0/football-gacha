-- 20260904050000에서 auto-bootstrap-regular-season 크론을 추가했지만
-- admin_weekly_cron_status()의 조회 대상 목록은 갱신하지 않아서, 운영자
-- 화면에서 이 크론의 상태가 보이지 않았다. 목록에 추가한다.
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
  where j.jobname in ('settle-weekly-fixtures', 'auto-bootstrap-placement', 'auto-bootstrap-regular-season');

  return jsonb_build_object('ok', true, 'jobs', coalesce(v_jobs, '[]'::jsonb));
end $$;
