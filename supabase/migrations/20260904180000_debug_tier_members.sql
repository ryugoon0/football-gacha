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
  v_row record;
  v_note text := '';
begin
  for v_row in
    select g.tier, m.slot, m.kind, m.club_name, m.user_id
    from public.weekly_league_members m
    join public.weekly_league_groups g on g.id = m.group_id
    where g.week_id = 'placement-2026-09-04' and m.kind = 'user'
    order by g.tier, m.slot
  loop
    v_note := v_note || format('tier%s/slot%s:%s(%s) ', v_row.tier, v_row.slot, v_row.club_name, v_row.user_id);
  end loop;
  insert into public._debug_placement_check (note) values (v_note);
end $$;
