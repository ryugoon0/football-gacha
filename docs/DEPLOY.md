# 반영하는 법 — PC 없이

휴대폰만 있어도 됩니다. 원격 접속도, 터미널도 필요 없습니다.

## 한 번만 해두는 준비

GitHub 저장소에 비밀 두 개를 넣습니다. 휴대폰 브라우저에서 됩니다.

**Settings → Secrets and variables → Actions → New repository secret**

| 이름 | 값 | 어디서 |
| --- | --- | --- |
| `SUPABASE_ACCESS_TOKEN` | 개인 액세스 토큰 | supabase.com/dashboard/account/tokens → Generate new token |
| `SUPABASE_DB_PASSWORD` | 데이터베이스 비밀번호 | Project Settings → Database → Database password (모르면 Reset) |

### 이 두 개가 무엇을 허용하는지

- **액세스 토큰**은 당신의 Supabase 계정 전체를 다룰 수 있습니다. 프로젝트
  설정 변경과 삭제까지 포함합니다.
- **DB 비밀번호**는 데이터베이스 전체에 대한 권한입니다.

둘 다 GitHub Actions 비밀로 저장되면 로그에 찍히지 않고, 저장소에 쓰기
권한이 있는 사람과 워크플로만 쓸 수 있습니다. 다만 **저장소에 쓰기 권한을
주는 것은 이 두 권한을 함께 주는 것**과 같아집니다. 협업자를 늘릴 때 기억해
두세요.

의심스러우면 언제든 토큰을 폐기(Revoke)하고 DB 비밀번호를 Reset하면 됩니다.
그러면 이 워크플로도 즉시 멈춥니다.

## 평소 — 아무것도 안 해도 됩니다

`main`에 스키마나 함수 관련 파일이 올라가면 **자동으로 반영**됩니다.
사람이 기억해야 하는 단계를 남겨두면 결국 잊고, 그러면 게임이 멈춥니다.

## 직접 돌리고 싶을 때 (휴대폰)

1. GitHub 저장소 → **Actions** 탭
2. 왼쪽에서 **Supabase** 선택
3. **Run workflow** → 무엇을 반영할지 고르고 실행
   - `both` — 스키마와 함수 모두 (기본)
   - `db` — 스키마만
   - `functions` — Edge Function만

실행이 끝나면 그 화면에서 성공·실패와 요약을 볼 수 있습니다.

## 확인

앱 화면 맨 아래의 빌드 커밋이 방금 올린 커밋과 같으면 웹은 최신입니다.
데이터베이스는 SQL Editor에서:

```sql
select
  to_regclass('public.game_config') is not null as game_config,
  to_regclass('public.gold_ledger') is not null as ledger,
  to_regproc('public.put_save')     is not null as put_save,
  to_regproc('public.commit_pull')  is not null as commit_pull;
```

## PC가 있을 때

예전 방식도 그대로 됩니다.

```powershell
git pull origin main
npx supabase db push
npm run build:functions && npx supabase functions deploy draw-pack
```
