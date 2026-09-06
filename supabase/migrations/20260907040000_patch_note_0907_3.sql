-- 9월 7일 공지 ③ — 월드 스카우트 · 리미티드 스카우트 · 조각 구매 (20260907020000 과 같은 방식).
do $$
declare
  v_author uuid;
  v_nick text;
  v_body text := $body$■ 월드 스카우트 신설 — 월드 카드는 여기서만
· 월드 스카우트팩이 생겼습니다. 상점에서 팔지 않고, 선물함으로 받거나 선수관리 → 승급 합성에서 월드 카드 3장을 합쳐 1개를 만듭니다(골드 없음). 열면 플래티넘 90% · 월드 10%입니다.
· 월드 카드는 이제 월드 스카우트에서만 나옵니다. 일반·프리미엄 스카우트에서는 나오지 않고, 조각 교환소의 「월드 확정」 항목도 내렸습니다. 이미 갖고 계신 월드 카드는 그대로입니다.
· 스카우트 탭에 「월드 스카우트」 칸이 생겼고, 보유 팩 수가 함께 보입니다.

■ 리미티드 스카우트 — 리미티드 기간에만
· 리미티드 카드가 열려 있는 동안(첫 회: 9월 8일 화 14:00 ~ 15일 화 13:59) 프리미엄 스카우트가 리미티드 스카우트로 바뀝니다. 가격·10연속 보장·천장·티켓은 같습니다.
· 리미티드 칸이 7% 생기고 그만큼 일반·실버·골드가 비율대로 줄어듭니다. 플래티넘 7%는 그대로입니다. 리미티드 카드는 이 칸에서만 나오고, 그 주 픽업은 리미티드 카드 중 하나입니다.

■ 조각으로 프리미엄 스카우트
· 방출로 모은 조각으로 프리미엄(리미티드) 스카우트를 열 수 있습니다. 1회 80조각, 10연속 720조각. 확률·보장·천장은 골드로 열 때와 같습니다.
· 조각 주머니는 상점에서 내렸습니다. 갖고 있던 것은 그대로 쓸 수 있습니다.

■ 확률 안내
· /odds 확률 안내에 리미티드 스카우트·월드 스카우트 열이 추가됐습니다.$body$;
begin
  select user_id into v_author from public.admins limit 1;
  if v_author is null then
    raise notice 'no admin account found, skipping patch note';
    return;
  end if;
  select nickname into v_nick from public.posts where user_id = v_author and notice order by created_at desc limit 1;
  v_nick := coalesce(v_nick, '내 클럽 FC');
  insert into public.posts (user_id, nickname, title, body, notice, patch_ids)
  values (v_author, v_nick, '[패치 노트] 9/7 ③ 월드 스카우트 신설 · 리미티드 스카우트 · 조각으로 프리미엄', v_body, true,
          array['2026-09-07-world-pack-limited-pack']);
end $$;
