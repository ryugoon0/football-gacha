-- 포메이션 유형 세분화 (lib/formations.ts: 4-3-3 CAM, 4-4-2 다이아몬드, 4-2-4, 3-4-3 …).
-- 공개 클럽 프로필의 포메이션 검사를 고정 목록에서 "짧은 형태 문자열"로 푼다.
-- 목록은 클라이언트 코드가 소유하고, 여기서는 모양만 지킨다.
alter table public.public_club_squads drop constraint if exists public_club_squads_formation_check;
alter table public.public_club_squads
  add constraint public_club_squads_formation_check
  check (formation ~ '^[0-9]-[0-9](-[0-9])*(-[a-z0-9]+)?$' and char_length(formation) <= 20);

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
  if p_formation is null or p_formation !~ '^[0-9]-[0-9](-[0-9])*(-[a-z0-9]+)?$' or char_length(p_formation) > 20 then
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
