do $$
declare
  v_row record;
  v_note text := '';
begin
  for v_row in
    select g.tier, m.slot, m.kind, m.club_name
    from public.weekly_league_members m
    join public.weekly_league_groups g on g.id = m.group_id
    where g.week_id = 'placement-2026-09-04' and m.kind = 'user'
    order by g.tier, m.slot
  loop
    v_note := v_note || format('t%s/%s:%s ', v_row.tier, v_row.slot, v_row.club_name);
  end loop;
  insert into public._debug_placement_check (note) values (v_note);
end $$;
