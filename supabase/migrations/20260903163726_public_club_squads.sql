-- Public, opt-in club profiles for the scouting board. This intentionally
-- stores only a small squad snapshot, never the private save or card uids.
create table if not exists public.public_club_squads (
  user_id     uuid primary key references auth.users on delete cascade,
  club_name   text not null check (char_length(club_name) between 1 and 30),
  division    smallint not null check (division between 1 and 5),
  rating      smallint not null check (rating between 0 and 200),
  formation   text not null check (formation in ('4-3-3', '4-4-2', '4-2-3-1', '3-5-2')),
  lineup      jsonb not null default '[]'::jsonb,
  is_public   boolean not null default false,
  updated_at  timestamptz not null default now(),
  constraint public_club_squads_lineup_array check (jsonb_typeof(lineup) = 'array'),
  constraint public_club_squads_lineup_size check (jsonb_array_length(lineup) <= 25)
);

create index if not exists public_club_squads_rating_idx
  on public.public_club_squads (rating desc, updated_at desc)
  where is_public;

alter table public.public_club_squads enable row level security;

drop policy if exists "public squads are readable" on public.public_club_squads;
create policy "public squads are readable" on public.public_club_squads
  for select using (is_public or auth.uid() = user_id);

grant select on public.public_club_squads to anon, authenticated;

create or replace function public.set_public_club_squad(
  p_visible boolean,
  p_club_name text,
  p_division integer,
  p_rating integer,
  p_formation text,
  p_lineup jsonb
) returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_member jsonb;
begin
  if v_user is null then
    return jsonb_build_object('ok', false, 'reason', 'not signed in');
  end if;
  if p_club_name is null or char_length(trim(p_club_name)) not between 1 and 30 then
    return jsonb_build_object('ok', false, 'reason', 'invalid club name');
  end if;
  if p_division not between 1 and 5 or p_rating not between 0 and 200 then
    return jsonb_build_object('ok', false, 'reason', 'invalid club rating');
  end if;
  if p_formation not in ('4-3-3', '4-4-2', '4-2-3-1', '3-5-2') then
    return jsonb_build_object('ok', false, 'reason', 'invalid formation');
  end if;
  if p_lineup is null or jsonb_typeof(p_lineup) <> 'array' or jsonb_array_length(p_lineup) > 25 then
    return jsonb_build_object('ok', false, 'reason', 'invalid lineup');
  end if;

  for v_member in select value from jsonb_array_elements(p_lineup)
  loop
    if jsonb_typeof(v_member) <> 'object'
       or not (v_member ? 'playerId' and v_member ? 'level' and v_member ? 'role' and v_member ? 'slot')
       or jsonb_typeof(v_member -> 'playerId') <> 'string'
       or jsonb_typeof(v_member -> 'level') <> 'number'
       or (v_member ->> 'role') not in ('starter', 'bench')
       or jsonb_typeof(v_member -> 'slot') <> 'string'
       or (v_member ->> 'level')::integer not between 1 and 10 then
      return jsonb_build_object('ok', false, 'reason', 'invalid lineup member');
    end if;
  end loop;

  insert into public.public_club_squads
    (user_id, club_name, division, rating, formation, lineup, is_public, updated_at)
  values
    (v_user, trim(p_club_name), p_division, p_rating, p_formation, p_lineup, p_visible, now())
  on conflict (user_id) do update
    set club_name = excluded.club_name,
        division = excluded.division,
        rating = excluded.rating,
        formation = excluded.formation,
        lineup = excluded.lineup,
        is_public = excluded.is_public,
        updated_at = excluded.updated_at;

  return jsonb_build_object('ok', true, 'visible', p_visible, 'updated_at', now());
end $$;

revoke all on function public.set_public_club_squad(boolean, text, integer, integer, text, jsonb) from public;
grant execute on function public.set_public_club_squad(boolean, text, integer, integer, text, jsonb) to authenticated;
