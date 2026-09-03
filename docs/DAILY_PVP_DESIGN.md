# 데일리 PvP 설계 (설계만, 코드 없음)

사용자 요청: "미니게임과 별도로 추가적인 데일리 PVP추가, 1일 3회 가능하며
실제 유저를 검색해서 가능, 그렇다면 다른 유저 프로필을 찾을 수 있는 페이지가
있어야겠지? 그 페이지를 통해 요청한 스쿼드가 보이면 되겠다" +
"다른 팀 선수 스쿼드 보이게도록(공개설정 없이 무조건 선발,교체 라인업
보이도록)". 후자는 "PvP 공개해"로 확정됨 — PvP 상대는 기존 스카우트
공개 설정과 무관하게 항상 보인다.

## 이미 있는 것 (재사용)

- `/clubs`, `/clubs/[id]` — 클럽 검색·프로필 페이지(`PublicClubDirectory`,
  `PublicSquadProfile`). 클럽명 검색, 디비전 필터까지 이미 됨.
- `public_club_squads` 테이블 + `set_public_club_squad` RPC — 다만 이건
  **옵트인 스냅샷**(본인이 "공개" 눌러야 나옴, 스냅샷이라 오래된 정보일 수
  있음)이라 PvP용으로 그대로 못 쓴다.

## PvP 전용으로 새로 필요한 것

### 1. 상대 라인업 조회 — 옵트인 우회, 실시간

기존 스카우트 공개 설정(`is_public`)과 완전히 별개 경로로, PvP 컨텍스트에서
호출되는 새 RPC 하나만 있으면 된다.

```sql
create or replace function public.pvp_opponent_squad(p_user_id uuid)
  returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_data jsonb;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'reason', 'not signed in');
  end if;
  select data into v_data from public.saves where user_id = p_user_id;
  if v_data is null then
    return jsonb_build_object('ok', false, 'reason', 'not found');
  end if;
  -- lib/publicClub.ts의 publicLineupOf()와 같은 모양을 SQL로 재현해야
  -- 한다(starters + bench, playerId/level/role/slot만). 이 부분이 유일한
  -- "로직이 두 벌" 지점 — TS 함수를 SQL로 복제하지 않고 대신 이 RPC
  -- 자체를 없애고 Edge Function으로 만들어 lib/publicClub.ts를 그대로
  -- import하는 쪽을 권장한다(draw-pack과 같은 번들 패턴).
end $$;
```

**권장**: RPC보다 Edge Function(`pvp-opponent-squad`)으로 만들어
`lib/publicClub.ts`의 `publicLineupOf()`를 그대로 번들 재사용한다 — 로직
중복을 피할 수 있다. 서버는 대상 유저의 `saves.data`를 service_role로 읽고,
`publicLineupOf(state)`를 그대로 호출해 반환한다. 클럽명·디비전·포메이션도
같이 내려준다. **team rating은 안 내려준다** — `evaluateSquad()`(팀컬러·케미
포함)를 서버에서 다시 계산하는 비용을 피하려면 생략하거나, 꼭 필요하면
저장된 `save.data`에 있는 마지막 계산값을 그대로 쓴다(신뢰 안 하고 표시만).

### 2. 유저 검색

`/clubs`의 클럽명 검색을 그대로 재사용 가능 — 다만 지금은
`public_club_squads`(옵트인 스냅샷)에서만 검색하므로, PvP 상대 검색은
`saves` 테이블 자체를 대상으로 하는 새 검색이 필요하다. `saves`에는
club 이름이 `data->>'club'`로 들어 있으니:

```sql
create or replace function public.search_pvp_opponents(p_query text)
  returns jsonb
  language sql
  security definer
  set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'userId', user_id, 'clubName', data->>'club'
  )), '[]'::jsonb)
  from public.saves
  where data->>'club' ilike '%' || p_query || '%'
  limit 20
$$;
```

`auth.uid()`가 로그인 상태인지만 확인하면 되고(누구나 검색 가능, 결과는
클럽명뿐이라 민감정보 아님), `is_admin()` 같은 제약은 필요 없다.

### 3. 하루 3회 제한

`lib/daily.ts`에 이미 있는 패턴(`miniGames`, 방금 추가한 `casualMatches`)과
완전히 같은 방식 — `DailyState`에 `pvpMatches: number` 추가,
`KNOBS.pvpDailyLimit`(기본 3) 노브 추가. **다만 PvP는 상대도 있는 매치라
"내가 하루 3회 걸었다"만으로 안 끝난다** — 상대방 입장에서도 자기 하루
한도를 소모하는지, 아니면 "받는 쪽은 무제한으로 응하는지" 결정이 필요하다.
권장: 도전한 쪽만 자기 한도를 쓰고, 받는 쪽(상대)은 소모하지 않는다 —
원작 PvP 친선전 관례과 같고, "인기 있는 상대는 계속 도전받는다"는 게임성도
자연스럽다.

### 4. 결과 판정 — 서버 권위 원칙 그대로

`SECURITY_ARCHITECTURE.md`의 원칙을 그대로 따라, PvP도 지금
`simulate-match`가 하는 것과 같은 패턴이어야 한다 — 다만 지금
`simulate-match`는 "요청한 본인의 세이브"만 읽는다. PvP는 **양쪽 세이브를
모두 읽어야** 하므로, `docs/WEEKLY_LIVE_MATCH_DESIGN.md`의 "양방향 엔진
확장"(`MatchSetup.opponentSquad`)을 그대로 재사용할 수 있는 지점이다 —
캐주얼 PvP를 실시간 개입 없이 "즉시 판정"으로 먼저 만들면(도전 버튼 →
서버가 양쪽 스쿼드로 즉시 시뮬레이션 → 결과 리플레이), 그 자체가 양방향
엔진 확장의 첫 실사용처가 되고, 나중에 경쟁 리그 실시간 개입으로 넘어갈
때 검증된 코드를 그대로 쓸 수 있다.

**따라서 순서 제안**: 데일리 PvP(즉시 판정, 개입 없음)를 먼저 만들어
양방향 엔진을 검증하고, 그 다음 경쟁 리그 실시간 개입(같은 엔진 + stoppage
개입)으로 확장하는 게 리스크가 작다.

## 결정 필요

1. 도전 비용(공짜인지, 티켓/골드 소모인지)
2. 보상(골드 지급 여부 — 있다면 캐주얼 모드와 같은 배율 노브 체계로)
3. 패배 시 페널티 유무(카드 손실 등은 절대 없어야 함 — 확인 차 명시)
