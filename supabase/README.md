# 데이터베이스

## 바꾼 내용을 반영하는 법

웹 SQL 편집기에 붙여넣지 않아도 됩니다. 명령 한 줄입니다.

```powershell
git pull origin main
npx supabase db push
```

처음 한 번은 데이터베이스 비밀번호를 묻습니다. 모르시면
**Project Settings → Database → Database password → Reset**에서 새로 만들 수
있습니다. 한 번 입력하면 CLI가 기억합니다.

`db push`는 **아직 적용하지 않은 마이그레이션만** 실행합니다. 손으로 이미
돌린 부분이 있어도 안전합니다 — 모든 문장이 두 번 실행해도 되게 쓰여
있습니다(`if not exists` / `drop ... if exists` / `create or replace`).

## 파일이 왜 둘인가

| 파일 | 쓰임 |
| --- | --- |
| `schema.sql` | 지금 스키마 전체를 한눈에 보는 문서. 웹 편집기에 붙여넣을 때도 씀 |
| `migrations/*.sql` | `db push`가 순서대로 실행하는 것. 바뀔 때마다 새 파일이 하나씩 늘어남 |

두 파일의 내용은 같게 유지합니다. 스키마가 바뀌면 `schema.sql`을 고치고,
그 변경분을 새 타임스탬프 파일로 `migrations/`에 추가합니다.

## 잘 들어갔는지 확인

```sql
select
  to_regclass('public.game_config') is not null as game_config,
  to_regclass('public.gold_ledger') is not null as ledger,
  to_regclass('public.pull_log')    is not null as pull_log,
  to_regclass('public.save_audit')  is not null as audit,
  to_regproc('public.put_save')     is not null as put_save,
  to_regproc('public.commit_pull')  is not null as commit_pull;
```

전부 `true`여야 합니다.

## 운영자 등록

```sql
insert into public.admins (user_id)
select id from auth.users where email = '여기에 이메일'
on conflict do nothing;

-- 들어갔는지 반드시 확인 (한 줄 나와야 함)
select u.email from public.admins a join auth.users u on u.id = a.user_id;
```

## Edge Function

스키마와 별개입니다. 뽑기 로직을 고쳤을 때만 다시 배포합니다.

```powershell
npm run build:functions
npx supabase functions deploy draw-pack
```
