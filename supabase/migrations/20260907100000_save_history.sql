-- 저장본 이력 — 되돌릴 수 없는 기능(일괄 합성·월드 합성·방출)이 늘어, 세이브의 이전 판을
-- 서버가 몇 개 갖고 있다가 운영자가 되돌릴 수 있게 한다.
--
-- 쓰기: saves 가 갱신될 때(put_save) 트리거가 **이전** 판을 save_history 에 남긴다.
--   · 마지막 스냅샷이 10분 안이면 건너뛴다(자동저장은 몇 초마다 오므로).
--   · 하루 첫 스냅샷은 'daily' 로 표시해 14개(약 2주)까지, 나머지 'auto' 는 30개까지 둔다.
--   · 복원 직전 판은 'pre-restore' 로 남겨 복원도 되돌릴 수 있다(20개).
-- 읽기·복원: 운영자 RPC 만. 유저에게는 보이지 않는다(정책 없음).
--
-- 복원은 saves.data 를 바꾸고 revision 을 올린다. 유저가 다음에 저장하면 revision 이
-- 어긋나 클라이언트가 서버 판을 다시 읽고, 진행도가 다르면 「충돌」 창에서 어느 쪽을
-- 쓸지 고른다(components/useAccountSync.ts). 복원 뒤에는 유저에게 새로고침을 안내한다.

create table if not exists public.save_history (
  id         bigserial primary key,
  user_id    uuid not null references auth.users on delete cascade,
  data       jsonb not null,
  revision   bigint,
  -- 'auto' 자동 스냅샷 · 'daily' 그날 첫 스냅샷 · 'pre-restore' 복원 직전 판 · 'manual' 운영자가 남김
  reason     text not null default 'auto',
  saved_at   timestamptz not null default now()
);
create index if not exists save_history_user_idx on public.save_history (user_id, id desc);
alter table public.save_history enable row level security;

create or replace function public.snapshot_save_before_update()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_recent boolean;
  v_today boolean;
  v_reason text;
begin
  -- 복원(admin_restore_save)은 직전 판을 직접 남기므로 여기서는 건너뛴다.
  if old.data is null or current_setting('football.skip_history', true) = '1' then
    return new;
  end if;
  select exists (select 1 from public.save_history h where h.user_id = old.user_id and h.reason in ('auto', 'daily') and h.saved_at > now() - interval '10 minutes')
    into v_recent;
  if v_recent then
    return new;
  end if;
  select exists (select 1 from public.save_history h where h.user_id = old.user_id and h.reason = 'daily' and h.saved_at >= date_trunc('day', now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul')
    into v_today;
  v_reason := case when v_today then 'auto' else 'daily' end;
  insert into public.save_history (user_id, data, revision, reason) values (old.user_id, old.data, old.revision, v_reason);
  -- 정리: auto 30 · daily 14 · pre-restore 20 · manual 20
  delete from public.save_history h
    where h.user_id = old.user_id and h.reason = 'auto'
      and h.id not in (select id from public.save_history where user_id = old.user_id and reason = 'auto' order by id desc limit 30);
  delete from public.save_history h
    where h.user_id = old.user_id and h.reason = 'daily'
      and h.id not in (select id from public.save_history where user_id = old.user_id and reason = 'daily' order by id desc limit 14);
  delete from public.save_history h
    where h.user_id = old.user_id and h.reason in ('pre-restore', 'manual')
      and h.id not in (select id from public.save_history where user_id = old.user_id and reason in ('pre-restore', 'manual') order by id desc limit 20);
  return new;
end $$;

drop trigger if exists save_history_trigger on public.saves;
create trigger save_history_trigger
  before update on public.saves
  for each row execute function public.snapshot_save_before_update();

-- 운영자: 한 유저의 이력 목록 (요약 숫자만).
create or replace function public.admin_save_history(p_user uuid)
  returns table (
    id bigint, saved_at timestamptz, reason text, revision bigint,
    gold numeric, cards int, played numeric, season numeric, club text
  )
  language sql
  stable
  security definer
  set search_path = public
as $$
  select h.id, h.saved_at, h.reason, h.revision,
         public.save_num(h.data, '{gold}') as gold,
         public.save_len(h.data, 'cards') as cards,
         coalesce(public.save_num(h.data, '{record,w}'), 0) + coalesce(public.save_num(h.data, '{record,d}'), 0) + coalesce(public.save_num(h.data, '{record,l}'), 0) as played,
         public.save_num(h.data, '{season,index}') as season,
         h.data->>'club' as club
  from public.save_history h
  where public.is_admin() and h.user_id = p_user
  order by h.id desc
  limit 80;
$$;
revoke all on function public.admin_save_history(uuid) from public;
grant execute on function public.admin_save_history(uuid) to authenticated;

-- 운영자: 지금 판을 'manual' 로 남긴다 (되돌릴 수 없는 작업 전에).
create or replace function public.admin_snapshot_save(p_user uuid)
  returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_row public.saves%rowtype;
begin
  if not public.is_admin() then
    return jsonb_build_object('ok', false, 'reason', 'not an operator');
  end if;
  select * into v_row from public.saves where user_id = p_user;
  if v_row.user_id is null then
    return jsonb_build_object('ok', false, 'reason', 'no save');
  end if;
  insert into public.save_history (user_id, data, revision, reason) values (p_user, v_row.data, v_row.revision, 'manual');
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.admin_snapshot_save(uuid) from public;
grant execute on function public.admin_snapshot_save(uuid) to authenticated;

-- 운영자: 이력 한 판으로 되돌린다. 직전 판은 'pre-restore' 로 남긴다.
create or replace function public.admin_restore_save(p_history_id bigint)
  returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_hist public.save_history%rowtype;
  v_cur  public.saves%rowtype;
  v_revision bigint;
begin
  if not public.is_admin() then
    return jsonb_build_object('ok', false, 'reason', 'not an operator');
  end if;
  select * into v_hist from public.save_history where id = p_history_id;
  if v_hist.id is null then
    return jsonb_build_object('ok', false, 'reason', 'unknown snapshot');
  end if;
  perform pg_advisory_xact_lock(hashtext('football-save'), hashtext(v_hist.user_id::text));
  select * into v_cur from public.saves where user_id = v_hist.user_id;
  if v_cur.user_id is not null then
    insert into public.save_history (user_id, data, revision, reason) values (v_cur.user_id, v_cur.data, v_cur.revision, 'pre-restore');
  end if;
  -- 직전 판은 위에서 'pre-restore' 로 남겼으니 트리거의 자동 스냅샷은 이 트랜잭션에서만 끈다.
  perform set_config('football.skip_history', '1', true);
  insert into public.saves (user_id, data, updated_at, revision)
  values (v_hist.user_id, v_hist.data, now(), coalesce(v_cur.revision, 0) + 1)
  on conflict (user_id) do update
    set data = excluded.data, updated_at = excluded.updated_at, revision = excluded.revision
  returning revision into v_revision;
  return jsonb_build_object('ok', true, 'revision', v_revision, 'restoredFrom', v_hist.saved_at);
end $$;
revoke all on function public.admin_restore_save(bigint) from public;
grant execute on function public.admin_restore_save(bigint) to authenticated;
