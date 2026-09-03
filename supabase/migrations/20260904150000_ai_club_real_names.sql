-- 주간리그 AI 클럽이 "AI 클럽 1", "AI 클럽 2"처럼 껍데기 이름으로 나오던
-- 문제를 고친다. lib/league.ts의 CLUB_POOL(기존 디비전 리그 AI 상대와
-- 같은 가상 클럽 24개)을 그대로 옮겨 SQL에서도 쓸 수 있게 저장해 두고,
-- 배치 리그 자동 생성이 이 표에서 이름·배지를 가져다 쓰게 한다.
create table if not exists public.weekly_ai_club_pool (
  idx   smallint primary key,
  name  text not null,
  badge text not null
);

insert into public.weekly_ai_club_pool (idx, name, badge) values
  (0, '인천 유나이트', 'IC'),
  (1, '대전 시티즌스', 'DJ'),
  (2, '광주 라이트', 'GJ'),
  (3, '강원 알펜', 'GW'),
  (4, '제주 오름', 'JJ'),
  (5, '성남 마그마', 'SN'),
  (6, '김천 밀리터리', 'GC'),
  (7, '수원 시티', 'SW'),
  (8, '부산 하버', 'BS'),
  (9, '안양 퓨마', 'AY'),
  (10, '부천 그린', 'BC'),
  (11, '전남 드래건', 'JN'),
  (12, '경남 다이너모', 'GN'),
  (13, '아산 무궁', 'AS'),
  (14, '서울 이스트', 'SE'),
  (15, '안산 그리너', 'AN'),
  (16, '천안 흥타령', 'CA'),
  (17, '청주 코어', 'CJ'),
  (18, '김포 필드', 'GP'),
  (19, '화성 스타즈', 'HS'),
  (20, '평택 포트', 'PT'),
  (21, '목포 세일러', 'MP'),
  (22, '통영 씨걸스', 'TY'),
  (23, '여수 오션스', 'YS')
on conflict (idx) do update set name = excluded.name, badge = excluded.badge;

-- 등급마다 시작 위치를 다르게 잡아서(간격 3칸) 같은 주에 도는 4개 등급이
-- 최대한 겹치지 않는 클럽 이름을 쓰게 한다. 풀이 24개뿐이라 등급을
-- 넘나드는 완전한 중복 방지는 안 되지만, 한 그룹(16자리) 안에서는
-- 겹치지 않는다(24 - 3*3 = 15 여유 + 16 ≤ 24는 아니라 tier 3에서 살짝
-- 겹칠 수 있으나 실제로는 실유저가 슬롯을 채워서 AI 자리가 16개 전부인
-- 경우는 드물다).
create or replace function public.auto_bootstrap_placement_leagues()
  returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_week_id text := 'placement-2026-09-04';
  v_first_match_at timestamptz := '2026-09-04T09:00:00+09:00'::timestamptz;
  v_tier record;
  v_existing_group bigint;
  v_group_id bigint;
  v_assigned_user_ids uuid[];
  v_candidate record;
  v_members jsonb;
  v_slot int;
  v_pool record;
  v_competitions jsonb;
  v_placement_id bigint;
  v_fixtures jsonb;
  v_created_tiers int[] := array[]::int[];
begin
  perform pg_advisory_xact_lock(hashtext('auto_bootstrap_placement:' || v_week_id));

  perform public.seed_weekly_schedule_slots(v_week_id, (
    select jsonb_agg(jsonb_build_object(
      'index', i,
      'day', (array['FRI', 'SAT', 'SUN'])[i / 15 + 1],
      'hour', 9 + (i % 15),
      'type', 'OPENING_PLACEMENT',
      'scheduledAtUtc', v_first_match_at + ((i / 15) * 24 + (i % 15)) * interval '1 hour'
    ))
    from generate_series(0, 44) i
  ));

  select coalesce(array_agg(m.user_id), array[]::uuid[]) into v_assigned_user_ids
  from public.weekly_league_members m
  join public.weekly_league_groups g on g.id = m.group_id
  where g.week_id = v_week_id and m.kind = 'user';

  for v_tier in select tier, max_real_users, ai_base_rating from public.weekly_tier_rules order by tier
  loop
    select id into v_existing_group from public.weekly_league_groups
      where tier = v_tier.tier and week_id = v_week_id limit 1;
    if v_existing_group is not null then
      continue;
    end if;

    v_members := '[]'::jsonb;
    v_slot := 0;

    for v_candidate in
      select s.user_id, s.data->>'club' as club_name
      from public.saves s
      where not (s.user_id = any(v_assigned_user_ids))
      order by s.user_id
    loop
      exit when v_slot >= v_tier.max_real_users;
      v_members := v_members || jsonb_build_object(
        'slot', v_slot,
        'kind', 'user',
        'userId', v_candidate.user_id,
        'clubName', coalesce(nullif(trim(v_candidate.club_name), ''), '유저클럽' || (v_slot + 1)),
        'badge', '',
        'rating', v_tier.ai_base_rating + 5
      );
      v_assigned_user_ids := v_assigned_user_ids || v_candidate.user_id;
      v_slot := v_slot + 1;
    end loop;

    while jsonb_array_length(v_members) < 16 loop
      select name, badge into v_pool
        from public.weekly_ai_club_pool
        where idx = (jsonb_array_length(v_members) + v_tier.tier * 3) % 24;
      v_members := v_members || jsonb_build_object(
        'slot', jsonb_array_length(v_members),
        'kind', 'ai',
        'userId', null,
        'clubName', v_pool.name,
        'badge', v_pool.badge,
        'rating', v_tier.ai_base_rating
      );
    end loop;

    v_group_id := public.create_weekly_league_group(v_tier.tier, v_week_id, v_members);
    v_competitions := public.seed_weekly_competitions(v_group_id);
    v_placement_id := (v_competitions->>'OPENING_PLACEMENT')::bigint;

    select jsonb_agg(jsonb_build_object(
      'round', t.round,
      'homeSlot', t.home_slot,
      'awaySlot', t.away_slot,
      'scheduledAtUtc', v_first_match_at + ((t.round / 15) * 24 + (t.round % 15)) * interval '1 hour'
    )) into v_fixtures
    from public.weekly_placement_fixture_template t;

    perform public.seed_league_fixtures(v_group_id, v_placement_id, v_fixtures);

    v_created_tiers := v_created_tiers || v_tier.tier;
  end loop;

  return jsonb_build_object('ok', true, 'weekId', v_week_id, 'createdTiers', v_created_tiers);
end $$;

-- 이미 "AI 클럽 N"으로 만들어져 있던 기존 AI 멤버도 지금 바로 실제
-- 클럽 이름으로 바꾼다.
update public.weekly_league_members m
  set club_name = p.name, badge = p.badge
  from public.weekly_ai_club_pool p
  where m.kind = 'ai'
    and m.club_name like 'AI 클럽 %'
    and p.idx = (m.slot + (
      select g.tier from public.weekly_league_groups g where g.id = m.group_id
    ) * 3) % 24;
