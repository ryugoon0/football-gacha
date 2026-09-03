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
  v_dupes int;
  v_total_users int;
begin
  select count(*) into v_dupes from (
    select m.user_id
    from public.weekly_league_members m
    join public.weekly_league_groups g on g.id = m.group_id
    where g.week_id = 'placement-2026-09-04' and m.kind = 'user'
    group by m.user_id
    having count(*) > 1
  ) d;
  select count(*) into v_total_users from public.weekly_league_members m
    join public.weekly_league_groups g on g.id = m.group_id
    where g.week_id = 'placement-2026-09-04' and m.kind = 'user';

  insert into public._debug_placement_check (note) values (
    format('duplicateUsers=%s totalUserMembers=%s', v_dupes, v_total_users)
  );
end $$;
