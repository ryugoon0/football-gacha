-- Supabase가 제공하는 것들을 흉내 내어 스키마를 그대로 돌려 보기 위한 받침대.
-- 배포에는 쓰지 않습니다. 로컬 Postgres에서만 씁니다.
create extension if not exists pgcrypto;

create schema if not exists auth;

create table if not exists auth.users (
  id    uuid primary key default gen_random_uuid(),
  email text unique
);

-- 지금 로그인한 사람. 테스트에서 set_config로 바꿔 가며 씁니다.
create or replace function auth.uid() returns uuid
  language sql stable
as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role;
  end if;
end $$;
