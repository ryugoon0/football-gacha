-- 세이브 되감기 방지: revision CAS + 진행도 단조 필드 거부.
--
-- 계기: 같은 계정으로 브라우저 탭 두 개를 열어둔 상태에서, 낡은 탭이
-- 뒤늦게 자동저장을 쏘면서 서버의 최신 진행도(played, gold 등)를 잠깐
-- 덮어쓴 사고가 실제로 있었다(감사 로그로 확인됨). 지금까지 judge_save는
-- 전적이 줄어드는 것을 "기록만 하고 통과"시켰으므로, 이 경로를 의도적으로
-- 악용하면(예: 골드를 쓴 뒤 예전 고골드 세이브를 재전송) 실제로 진행도를
-- 되돌릴 수 있었다. 이 마이그레이션은 두 층으로 막는다.
--
-- 1) saves.revision + put_save의 compare-and-swap: 클라이언트가 자신이
--    기반으로 삼은 revision을 함께 보내고, 그 사이 다른 저장이 있었으면
--    거부한다(다중 탭에서 낡은 상태가 최신 상태를 아예 밀어내지 못하게).
-- 2) judge_save의 단조 필드 비교: revision을 못 보내는 구버전 클라이언트나
--    revision이 우연히 맞아떨어지는 경우까지 대비해, played/pulls.total/
--    season.index/trophies.cup/trophies.promotions/capacity 중 하나라도
--    지금 저장된 값보다 낮으면 무조건 거부한다. 카드 수는 방출·합성으로
--    정상적으로 줄어들 수 있어 이 목록에서 뺐다.
--
-- 이 파일은 supabase/schema.sql의 해당 부분을 그대로 옮긴 것이다. 두 번
-- 실행해도 안전하다(모두 if not exists / drop ... if exists / create or
-- replace). schema.sql은 이 변경을 포함한 최신 전체 스냅샷으로 함께
-- 갱신했다.

-- ---------------------------------------------------------------------------
-- 1) saves.revision
-- ---------------------------------------------------------------------------
alter table public.saves
  add column if not exists revision bigint not null default 0;

-- ---------------------------------------------------------------------------
-- 2) judge_save — 진행도 단조 필드 비교 추가
-- ---------------------------------------------------------------------------
create or replace function public.judge_save(p_user uuid, p_data jsonb)
  returns table (out_rejected text, out_flagged text)
  language plpgsql
  stable
  security definer
  set search_path = public
as $$
declare
  v_gold    numeric := public.save_num(p_data, '{gold}');
  v_cards   int     := public.save_len(p_data, 'cards');
  v_pulls   numeric := public.save_num(p_data, '{pulls,total}');
  v_played  numeric := coalesce(public.save_num(p_data, '{record,w}'), 0)
                     + coalesce(public.save_num(p_data, '{record,d}'), 0)
                     + coalesce(public.save_num(p_data, '{record,l}'), 0);
  v_reason  text := null;
  v_flag    text := null;
  v_last    public.save_audit%rowtype;
  v_seconds numeric;
  v_jump    numeric;
  v_saved         jsonb;
  v_saved_played  numeric;
begin
  -- (1) 절대값: 어떤 플레이로도 도달할 수 없는 범위.
  if v_gold is null or v_gold < 0 or v_gold > 1e12 then
    v_reason := format('gold out of range: %s', coalesce(v_gold::text, 'null'));
  elsif v_cards > 5000 then
    v_reason := format('too many cards: %s', v_cards);
  end if;

  -- (2) 진행도 되감기: 정상 플레이라면 절대 줄지 않는 값들을 지금 저장된
  -- 세이브(public.saves)와 비교합니다. 카드 수는 방출·합성으로 정상적으로
  -- 줄어들 수 있어 여기 포함하지 않습니다. 다중 탭에서 낡은 세이브가
  -- 다시 올라오거나, 의도적으로 예전 고자원 세이브를 재전송하는 경로를
  -- 여기서 막습니다 — revision CAS(put_save)를 통과했더라도 한 번 더 봅니다.
  if v_reason is null then
    select data into v_saved from public.saves where user_id = p_user;
    if v_saved is not null then
      v_saved_played := coalesce(public.save_num(v_saved, '{record,w}'), 0)
                       + coalesce(public.save_num(v_saved, '{record,d}'), 0)
                       + coalesce(public.save_num(v_saved, '{record,l}'), 0);
      if v_played < v_saved_played then
        v_reason := format('progress rollback: played %s -> %s', v_saved_played, v_played);
      elsif coalesce(v_pulls, 0) < coalesce(public.save_num(v_saved, '{pulls,total}'), 0) then
        v_reason := format('progress rollback: pulls %s -> %s',
                            public.save_num(v_saved, '{pulls,total}'), v_pulls);
      elsif coalesce(public.save_num(p_data, '{season,index}'), 0)
            < coalesce(public.save_num(v_saved, '{season,index}'), 0) then
        v_reason := format('progress rollback: season %s -> %s',
                            public.save_num(v_saved, '{season,index}'),
                            public.save_num(p_data, '{season,index}'));
      elsif coalesce(public.save_num(p_data, '{trophies,cup}'), 0)
            < coalesce(public.save_num(v_saved, '{trophies,cup}'), 0) then
        v_reason := 'progress rollback: trophies.cup decreased';
      elsif coalesce(public.save_num(p_data, '{trophies,promotions}'), 0)
            < coalesce(public.save_num(v_saved, '{trophies,promotions}'), 0) then
        v_reason := 'progress rollback: trophies.promotions decreased';
      elsif coalesce(public.save_num(p_data, '{capacity}'), 0)
            < coalesce(public.save_num(v_saved, '{capacity}'), 0) then
        v_reason := 'progress rollback: capacity decreased';
      end if;
    end if;
  end if;

  -- (3) 증가 속도: 직전 통과 기록과 비교합니다.
  if v_reason is null then
    select sa.* into v_last
    from public.save_audit sa
    where sa.user_id = p_user and sa.rejected is null
    order by sa.at desc
    limit 1;

    if v_last.id is not null then
      v_seconds := greatest(extract(epoch from (now() - v_last.at)), 1);
      v_jump := v_gold - coalesce(v_last.gold, 0);

      -- 일괄 방출로 한 번에 크게 오를 수 있으므로 1천만 골드의 여유를 둡니다.
      if v_jump > (v_seconds * 100000) + 10000000 then
        v_reason := format('gold jumped %s in %s seconds', v_jump, v_seconds);
      end if;

      -- 아래는 거부하지 않고 기록만 합니다. 미니게임을 연달아 돌리면 짧은
      -- 시간에 여러 판이 쌓이는 것이 정상이기 때문입니다.
      if v_played - coalesce(v_last.played, 0) > greatest(v_seconds, 60) then
        v_flag := format('played %s matches in %s seconds',
                         v_played - coalesce(v_last.played, 0), v_seconds);
      end if;
    end if;
  end if;

  -- (4) 뽑기 대비 카드 수. 이적시장·합성으로도 늘어나므로 기록만 합니다.
  if v_reason is null and v_pulls is not null and v_cards > v_pulls + 1000 then
    v_flag := concat_ws(' / ', v_flag, format('cards %s vs pulls %s', v_cards, v_pulls));
  end if;

  return query select v_reason, v_flag;
end $$;

-- ---------------------------------------------------------------------------
-- 3) put_save — revision compare-and-swap 추가
-- ---------------------------------------------------------------------------
-- 예전 put_save(jsonb) 한 개짜리 시그니처를 두 개짜리로 완전히 대체한다.
-- 두 시그니처를 동시에 두면 PostgREST가 p_data만 보낸 호출을 어느 쪽으로
-- 연결할지 정하지 못해 에러가 난다.
drop function if exists public.put_save(jsonb);

create or replace function public.put_save(p_data jsonb, p_base_revision bigint default null)
  returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_user             uuid := auth.uid();
  v_current_revision bigint;
  v_j                record;
  v_gold             bigint;
  v_diff             bigint;
  v_revision         bigint;
begin
  if v_user is null then
    return jsonb_build_object('ok', false, 'reason', 'not signed in');
  end if;
  if pg_column_size(p_data) > 524288 then
    return jsonb_build_object('ok', false, 'reason', 'save too large');
  end if;

  perform pg_advisory_xact_lock(hashtext('football-save'), hashtext(v_user::text));

  select revision into v_current_revision from public.saves where user_id = v_user;

  if p_base_revision is not null and v_current_revision is not null
     and p_base_revision <> v_current_revision then
    insert into public.save_audit
      (user_id, gold, cards, pulls, played, season, rejected, flagged)
    values (
      v_user,
      public.save_num(p_data, '{gold}'),
      public.save_len(p_data, 'cards'),
      public.save_num(p_data, '{pulls,total}'),
      coalesce(public.save_num(p_data, '{record,w}'), 0)
        + coalesce(public.save_num(p_data, '{record,d}'), 0)
        + coalesce(public.save_num(p_data, '{record,l}'), 0),
      public.save_num(p_data, '{season,index}'),
      'stale_save_revision',
      null
    );
    return jsonb_build_object(
      'ok', false, 'reason', 'stale_save_revision', 'revision', v_current_revision
    );
  end if;

  select j.out_rejected as rejected, j.out_flagged as flagged
    into v_j
    from public.judge_save(v_user, p_data) j;

  insert into public.save_audit
    (user_id, gold, cards, pulls, played, season, rejected, flagged)
  values (
    v_user,
    public.save_num(p_data, '{gold}'),
    public.save_len(p_data, 'cards'),
    public.save_num(p_data, '{pulls,total}'),
    coalesce(public.save_num(p_data, '{record,w}'), 0)
      + coalesce(public.save_num(p_data, '{record,d}'), 0)
      + coalesce(public.save_num(p_data, '{record,l}'), 0),
    public.save_num(p_data, '{season,index}'),
    v_j.rejected,
    v_j.flagged
  );

  if v_j.rejected is not null then
    return jsonb_build_object('ok', false, 'reason', v_j.rejected);
  end if;

  insert into public.saves (user_id, data, updated_at, revision)
  values (v_user, p_data, now(), coalesce(v_current_revision, 0) + 1)
  on conflict (user_id) do update
    set data = excluded.data, updated_at = excluded.updated_at, revision = excluded.revision
  returning revision into v_revision;

  if coalesce((select seeded from public.economy where user_id = v_user), false) then
    v_gold := coalesce(public.save_num(p_data, '{gold}'), 0)::bigint;
    v_diff := v_gold - public.gold_balance(v_user);
    if v_diff <> 0 then
      insert into public.gold_ledger (user_id, delta, reason)
      values (v_user, v_diff, 'client');
    end if;
  end if;

  return jsonb_build_object('ok', true, 'revision', v_revision);
end $$;

revoke all on function public.put_save(jsonb, bigint) from public;
grant execute on function public.put_save(jsonb, bigint) to authenticated;

-- ---------------------------------------------------------------------------
-- 4) watch_rollback — 거부된 시도까지 신호에 잡히도록
-- ---------------------------------------------------------------------------
-- judge_save가 이제 진행도 되감기를 거부하므로(rejected로 남음), 통과한
-- 저장만 보면 이 신호가 무력화된다. 시도 전체를 보되, 비교 기준은 "그
-- 직전에 실제로 통과한 저장"으로 둔다.
create or replace view public.watch_rollback as
  with accepted as (
    select user_id, at, played
    from public.save_audit
    where rejected is null and at > now() - interval '30 days'
  ),
  attempts as (
    select sa.user_id, sa.at, sa.played,
           (
             select a.played from accepted a
             where a.user_id = sa.user_id and a.at < sa.at
             order by a.at desc
             limit 1
           ) as prev_played
    from public.save_audit sa
    where sa.at > now() - interval '30 days'
  )
  select user_id,
         count(*) as rollbacks,
         max(at) as last_at,
         max(prev_played - played) as biggest_drop
  from attempts
  where prev_played is not null and played < prev_played
  group by user_id;
