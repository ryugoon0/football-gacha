-- 빅매치 예측 — 미니게임.
--
-- 운영자가 "이번 주 빅매치" 라운드를 만든다(제목, 마감 시각, 전부 맞힌 사람의
-- 골드, 경기 목록: 리그·홈·원정·킥오프). 유저는 마감 전에 경기마다 홈승·무·원정승을
-- 고른다. 경기가 끝나면 운영자가 결과를 적고, 마지막 결과가 들어가는 순간 라운드가
-- 정산된다: 전부 맞힌 감독에게 선물(gifts/gift_inbox, 기존 선물함·팝업 그대로)로
-- 골드가 간다. 부분 정답에는 보상이 없다 — "전부 맞추면"이 규칙이다.
--
-- 경기 이름은 운영자가 직접 적는다. 실제 경기를 맞히는 퀴즈라 리그·클럽 실명을
-- 써도 된다(사용자 결정 2026-09-06). 로고·엠블럼은 쓰지 않는다.

create table if not exists public.prediction_rounds (
  id          bigserial primary key,
  title       text not null check (char_length(title) between 1 and 60),
  note        text not null default '' check (char_length(note) <= 300),
  closes_at   timestamptz not null,
  reward_gold int not null check (reward_gold between 0 and 10000000),
  status      text not null default 'open' check (status in ('open', 'settled')),
  created_by  uuid references auth.users on delete set null,
  created_at  timestamptz not null default now(),
  settled_at  timestamptz,
  entrants    int not null default 0,
  winners     int not null default 0,
  gift_id     bigint references public.gifts(id) on delete set null
);

create table if not exists public.prediction_matches (
  id         bigserial primary key,
  round_id   bigint not null references public.prediction_rounds(id) on delete cascade,
  idx        smallint not null check (idx between 0 and 15),
  league     text not null default '' check (char_length(league) <= 30),
  home       text not null check (char_length(home) between 1 and 40),
  away       text not null check (char_length(away) between 1 and 40),
  kickoff_at timestamptz,
  -- 'H' 홈승 · 'D' 무 · 'A' 원정승. null 이면 아직 결과 없음.
  result     text check (result in ('H', 'D', 'A')),
  unique (round_id, idx)
);

create table if not exists public.prediction_picks (
  round_id     bigint not null references public.prediction_rounds(id) on delete cascade,
  user_id      uuid not null references auth.users on delete cascade,
  -- { "<match id>": "H" | "D" | "A" }
  picks        jsonb not null,
  submitted_at timestamptz not null default now(),
  correct      smallint,
  primary key (round_id, user_id)
);
create index if not exists prediction_picks_user_idx on public.prediction_picks (user_id);

alter table public.prediction_rounds enable row level security;
alter table public.prediction_matches enable row level security;
alter table public.prediction_picks enable row level security;

drop policy if exists "rounds are readable" on public.prediction_rounds;
create policy "rounds are readable" on public.prediction_rounds for select to authenticated using (true);
drop policy if exists "matches are readable" on public.prediction_matches;
create policy "matches are readable" on public.prediction_matches for select to authenticated using (true);
drop policy if exists "players read their own picks" on public.prediction_picks;
create policy "players read their own picks" on public.prediction_picks
  for select to authenticated using (auth.uid() = user_id or public.is_admin());

-- ---------------------------------------------------------------------------
-- 운영자: 라운드 생성
-- ---------------------------------------------------------------------------
create or replace function public.admin_create_prediction_round(
  p_title     text,
  p_note      text,
  p_closes_at timestamptz,
  p_reward    int,
  p_matches   jsonb
) returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_id bigint;
  v_match jsonb;
  v_idx int := 0;
begin
  if not public.is_admin() then
    return jsonb_build_object('ok', false, 'reason', 'not an operator');
  end if;
  if jsonb_typeof(p_matches) <> 'array' or jsonb_array_length(p_matches) = 0 then
    return jsonb_build_object('ok', false, 'reason', 'no matches');
  end if;
  if jsonb_array_length(p_matches) > 16 then
    return jsonb_build_object('ok', false, 'reason', 'too many matches');
  end if;
  if p_closes_at <= now() then
    return jsonb_build_object('ok', false, 'reason', 'closes in the past');
  end if;

  insert into public.prediction_rounds (title, note, closes_at, reward_gold, created_by)
  values (trim(p_title), coalesce(p_note, ''), p_closes_at, greatest(0, coalesce(p_reward, 0)), auth.uid())
  returning id into v_id;

  for v_match in select * from jsonb_array_elements(p_matches)
  loop
    insert into public.prediction_matches (round_id, idx, league, home, away, kickoff_at)
    values (v_id, v_idx, left(coalesce(v_match->>'league', ''), 30), left(trim(v_match->>'home'), 40), left(trim(v_match->>'away'), 40),
            nullif(v_match->>'kickoffAt', '')::timestamptz);
    v_idx := v_idx + 1;
  end loop;

  return jsonb_build_object('ok', true, 'roundId', v_id, 'matches', v_idx);
end $$;

revoke all on function public.admin_create_prediction_round(text, text, timestamptz, int, jsonb) from public;
grant execute on function public.admin_create_prediction_round(text, text, timestamptz, int, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- 유저: 예측 제출 (마감 전, 전 경기 필수, 다시 내면 덮어씀)
-- ---------------------------------------------------------------------------
create or replace function public.submit_prediction(p_round_id bigint, p_picks jsonb)
  returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_round record;
  v_match record;
  v_pick text;
  v_clean jsonb := '{}'::jsonb;
begin
  if v_user is null then
    return jsonb_build_object('ok', false, 'reason', 'not signed in');
  end if;
  select * into v_round from public.prediction_rounds where id = p_round_id;
  if v_round.id is null then
    return jsonb_build_object('ok', false, 'reason', 'no such round');
  end if;
  if v_round.status <> 'open' or v_round.closes_at <= now() then
    return jsonb_build_object('ok', false, 'reason', 'closed');
  end if;
  if jsonb_typeof(p_picks) <> 'object' then
    return jsonb_build_object('ok', false, 'reason', 'bad picks');
  end if;

  for v_match in select id from public.prediction_matches where round_id = p_round_id order by idx
  loop
    v_pick := p_picks->>(v_match.id::text);
    if v_pick is null or v_pick not in ('H', 'D', 'A') then
      return jsonb_build_object('ok', false, 'reason', 'incomplete');
    end if;
    v_clean := v_clean || jsonb_build_object(v_match.id::text, v_pick);
  end loop;

  insert into public.prediction_picks (round_id, user_id, picks, submitted_at)
  values (p_round_id, v_user, v_clean, now())
  on conflict (round_id, user_id) do update set picks = excluded.picks, submitted_at = now();

  update public.prediction_rounds r
    set entrants = (select count(*) from public.prediction_picks p where p.round_id = r.id)
    where r.id = p_round_id;

  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.submit_prediction(bigint, jsonb) from public;
grant execute on function public.submit_prediction(bigint, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- 운영자: 결과 입력 → 전부 들어오면 정산
-- ---------------------------------------------------------------------------
create or replace function public.admin_set_prediction_results(p_round_id bigint, p_results jsonb)
  returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_round record;
  v_key text;
  v_val text;
  v_missing int;
  v_total int;
  v_winner_ids jsonb;
  v_winners int := 0;
  v_gift jsonb := null;
begin
  if not public.is_admin() then
    return jsonb_build_object('ok', false, 'reason', 'not an operator');
  end if;
  select * into v_round from public.prediction_rounds where id = p_round_id;
  if v_round.id is null then
    return jsonb_build_object('ok', false, 'reason', 'no such round');
  end if;
  if v_round.status = 'settled' then
    return jsonb_build_object('ok', false, 'reason', 'already settled');
  end if;

  perform pg_advisory_xact_lock(hashtext('prediction_round:' || p_round_id::text));

  for v_key, v_val in select key, value from jsonb_each_text(coalesce(p_results, '{}'::jsonb))
  loop
    if v_val in ('H', 'D', 'A') then
      update public.prediction_matches set result = v_val where round_id = p_round_id and id = v_key::bigint;
    elsif v_val = '' then
      update public.prediction_matches set result = null where round_id = p_round_id and id = v_key::bigint;
    end if;
  end loop;

  select count(*) filter (where result is null), count(*) into v_missing, v_total
    from public.prediction_matches where round_id = p_round_id;

  -- 마감 전이거나 결과가 덜 들어왔으면 저장만 하고 끝.
  if v_missing > 0 or v_round.closes_at > now() then
    return jsonb_build_object('ok', true, 'settled', false, 'missing', v_missing);
  end if;

  update public.prediction_picks p
    set correct = (
      select count(*) from public.prediction_matches m
      where m.round_id = p.round_id and m.result is not null and p.picks->>(m.id::text) = m.result
    )
    where p.round_id = p_round_id;

  select coalesce(jsonb_agg(user_id::text), '[]'::jsonb), count(*) into v_winner_ids, v_winners
    from public.prediction_picks where round_id = p_round_id and correct = v_total;

  if v_winners > 0 and v_round.reward_gold > 0 then
    v_gift := public.send_gift(
      left('빅매치 예측 전부 정답! — ' || v_round.title, 40),
      format('「%s」 %s경기를 모두 맞혔습니다. 축하합니다!', v_round.title, v_total),
      v_round.reward_gold,
      '{}'::jsonb,
      jsonb_build_object('kind', 'users', 'userIds', v_winner_ids),
      null
    );
  end if;

  update public.prediction_rounds
    set status = 'settled', settled_at = now(), winners = v_winners,
        gift_id = nullif(v_gift->>'giftId', '')::bigint
    where id = p_round_id;

  return jsonb_build_object('ok', true, 'settled', true, 'winners', v_winners, 'entrants', v_round.entrants, 'gift', v_gift);
end $$;

revoke all on function public.admin_set_prediction_results(bigint, jsonb) from public;
grant execute on function public.admin_set_prediction_results(bigint, jsonb) to authenticated;

-- 운영자용 라운드 요약: 참가자 수와 선택 분포.
create or replace function public.admin_prediction_stats(p_round_id bigint)
  returns jsonb
  language sql
  stable
  security definer
  set search_path = public
as $$
  select case when not public.is_admin() then '{}'::jsonb else jsonb_build_object(
    'entrants', (select count(*) from public.prediction_picks where round_id = p_round_id),
    'perfect', (select count(*) from public.prediction_picks where round_id = p_round_id and correct = (select count(*) from public.prediction_matches where round_id = p_round_id)),
    'matches', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'matchId', m.id,
        'H', (select count(*) from public.prediction_picks p where p.round_id = p_round_id and p.picks->>(m.id::text) = 'H'),
        'D', (select count(*) from public.prediction_picks p where p.round_id = p_round_id and p.picks->>(m.id::text) = 'D'),
        'A', (select count(*) from public.prediction_picks p where p.round_id = p_round_id and p.picks->>(m.id::text) = 'A')
      ) order by m.idx), '[]'::jsonb)
      from public.prediction_matches m where m.round_id = p_round_id
    )
  ) end
$$;

revoke all on function public.admin_prediction_stats(bigint) from public;
grant execute on function public.admin_prediction_stats(bigint) to authenticated;
