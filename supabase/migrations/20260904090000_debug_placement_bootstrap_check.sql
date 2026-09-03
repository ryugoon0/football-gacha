-- 임시 진단 테이블 — anon key로도 결과를 확인할 수 있게 잠깐 만든다.
-- 확인이 끝나면 다음 마이그레이션에서 지운다.
create table if not exists public._debug_placement_check (
  id bigserial primary key,
  note text,
  created_at timestamptz not null default now()
);
alter table public._debug_placement_check enable row level security;
drop policy if exists "debug readable" on public._debug_placement_check;
create policy "debug readable" on public._debug_placement_check for select using (true);

do $$
declare
  v_group_count int;
  v_member_count int;
  v_result jsonb;
begin
  select count(*) into v_group_count from public.weekly_league_groups where week_id = 'placement-2026-09-04';
  select count(*) into v_member_count from public.weekly_league_members m
    join public.weekly_league_groups g on g.id = m.group_id
    where g.week_id = 'placement-2026-09-04' and m.kind = 'user';

  if v_group_count = 0 then
    v_result := public.auto_bootstrap_placement_leagues();
  else
    v_result := jsonb_build_object('skipped', true);
  end if;

  insert into public._debug_placement_check (note) values (
    format('before: groups=%s userMembers=%s rerun=%s', v_group_count, v_member_count, v_result)
  );
end $$;
