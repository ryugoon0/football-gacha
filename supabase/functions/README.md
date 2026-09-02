# Edge Functions

## draw-pack — 서버 권한 뽑기

난수와 확률이 서버에 있습니다. 클라이언트는 어느 팩을 열지만 말합니다.

확률 로직은 여기에 다시 쓰지 않습니다. `shared.js`는 게임이 쓰는
`lib/gacha.ts`에서 그대로 만들어진 번들이라, **확률이 한 벌뿐입니다.**
`lib/` 아래를 고치면 다시 만들어야 합니다:

```bash
npm run build:functions
```

### 배포

```bash
npx supabase login
npx supabase link --project-ref <프로젝트 ref>
npm run build:functions
npx supabase functions deploy draw-pack
```

`SUPABASE_URL` · `SUPABASE_ANON_KEY` · `SUPABASE_SERVICE_ROLE_KEY`는 Edge
Function 런타임이 자동으로 넣어 줍니다. **service_role 키는 이 함수 안에서만
쓰이며 브라우저에 절대 나가지 않습니다.**

### 확인

```bash
npx supabase functions logs draw-pack
```

```sql
-- 고지한 확률과 실제가 같은지
select
  count(*) as cards,
  round(100.0 * count(*) filter (where c->>'rarity' = 'Legend') / count(*), 3) as legend_pct
from public.pull_log, jsonb_array_elements(cards) c;
```
