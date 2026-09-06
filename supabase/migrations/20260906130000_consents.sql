-- 약관·개인정보처리방침 동의 기록. 버전이 오르면 다시 묻는다(클라이언트가 비교).
create table if not exists public.consents (
  user_id         uuid primary key references auth.users on delete cascade,
  terms_version   text not null,
  privacy_version text not null,
  agreed_at       timestamptz not null default now(),
  -- 동의 시점의 접속 정보는 두지 않는다(최소 수집). 버전과 시각이면 입증에 충분하다.
  history         jsonb not null default '[]'::jsonb
);

alter table public.consents enable row level security;
drop policy if exists "players read their own consent" on public.consents;
create policy "players read their own consent" on public.consents for select to authenticated using (auth.uid() = user_id);

create or replace function public.agree_terms(p_terms_version text, p_privacy_version text)
  returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then return jsonb_build_object('ok', false, 'reason', 'not signed in'); end if;
  if char_length(coalesce(p_terms_version, '')) = 0 or char_length(coalesce(p_privacy_version, '')) = 0 then
    return jsonb_build_object('ok', false, 'reason', 'bad version');
  end if;
  insert into public.consents (user_id, terms_version, privacy_version, agreed_at, history)
  values (v_user, p_terms_version, p_privacy_version, now(),
          jsonb_build_array(jsonb_build_object('terms', p_terms_version, 'privacy', p_privacy_version, 'at', now())))
  on conflict (user_id) do update
    set terms_version = excluded.terms_version,
        privacy_version = excluded.privacy_version,
        agreed_at = now(),
        history = consents.history || jsonb_build_object('terms', p_terms_version, 'privacy', p_privacy_version, 'at', now());
  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.agree_terms(text, text) from public;
grant execute on function public.agree_terms(text, text) to authenticated;
