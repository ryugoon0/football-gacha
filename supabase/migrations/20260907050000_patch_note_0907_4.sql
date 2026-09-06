-- 9월 7일 공지 ④ — 리미티드 1차 (20260907040000 과 같은 방식).
do $$
declare
  v_author uuid;
  v_nick text;
  v_body text := $body$■ 리미티드 1차 「9월 1주 MOM」 — 9월 8일(화) 14:00 ~ 15일(화) 13:59
· 9월 4~6일 실제 경기에서 눈에 띈 선수 13장이 리미티드 카드로 나옵니다.
· 발렌시아 원정 0-5의 2골 라민 야마르(92)와 1골 2도움 페르민 로페시(88), 오사수나전 해트트릭 루카스 보에(83), 첼시전 결승골 마르틴 외데고르(89), 풀럼전 2골 풀백 타이릭 미셸(84), 빌라전 무실점 골키퍼 콘스탄티노스 촐라키(78), 아탈란타전 추가시간 결승골 마티아스 술레이(84), 나폴리전 3-2 역전 결승골 라우타로 마르티노(90), 함부르크 원정 2골 필리프 티에츠(79), 프랑크푸르트 원정 역전 마무리 파비안 리데르(78), 마르세유 원정 해트트릭 라신 시나요쿠(80), 트루아 원정 2골 샘 아모아메요(76), PSG 원정 결승골 스타니스 이둠부(78).
· 기간 중에는 프리미엄 스카우트가 리미티드 스카우트로 바뀌고, 리미티드 칸(7%)에서만 이 카드들이 나옵니다. 그 주 픽업도 이 카드들 중 하나입니다. 조각(1회 80·10연속 720)이나 티켓으로도 열 수 있습니다.
· 기간이 끝나면 풀에서 빠지고 받은 카드는 남습니다. 앨범에 「리미티드 · 9월 1주 MOM」 특별 세트가 생겨 13장을 모두 모으면 보상이 있습니다.
· 리미티드 카드는 같은 선수의 정규 카드와 다른 카드지만 같은 인물이라 한 라인업에 한 장만 둘 수 있습니다.$body$;
begin
  select user_id into v_author from public.admins limit 1;
  if v_author is null then
    raise notice 'no admin account found, skipping patch note';
    return;
  end if;
  select nickname into v_nick from public.posts where user_id = v_author and notice order by created_at desc limit 1;
  v_nick := coalesce(v_nick, '내 클럽 FC');
  insert into public.posts (user_id, nickname, title, body, notice, patch_ids)
  values (v_author, v_nick, '[예고] 리미티드 1차 「9월 1주 MOM」 13장 — 8일(화) 14:00부터 일주일', v_body, true,
          array['2026-09-07-limited-w37']);
end $$;
