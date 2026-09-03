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
  v_leftover int;
  v_sample text;
begin
  select count(*) into v_leftover from public.weekly_league_members where club_name like 'AI 클럽 %';
  select string_agg(club_name, ', ') into v_sample from (
    select distinct club_name from public.weekly_league_members
    where kind = 'ai' order by club_name limit 8
  ) s;
  insert into public._debug_placement_check (note) values (
    format('leftoverPlaceholder=%s sampleAiNames=%s', v_leftover, v_sample)
  );
end $$;
