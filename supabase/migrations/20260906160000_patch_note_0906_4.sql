-- 9월 6일 저녁 변경분 공지 ④ (20260906100000 과 같은 방식).
do $$
declare
  v_author uuid;
  v_nick text;
  v_body text := $body$■ 추가
· 일괄 합성 — 선수관리 → 승급 합성이 모두에게 다시 열렸습니다. 위쪽 「일괄 합성」에서 등급을 고르면 잠그지 않은 카드가 등급별 장수(기본 3장)씩 묶여 한 단계 위 카드로 바뀝니다. 선발·벤치 18명과 잠근 카드는 건드리지 않고, 키운 카드(레벨 2 이상·경험치 있음)는 기본으로 제외합니다(체크 해제 가능). 실행 전에 등급별 대상·횟수·결과·남는 장수·비용이 표로 보이고 확인 창을 거칩니다. 결과 카드는 한 단계 위 등급 출시 카드 중 균등 무작위입니다.
· 포메이션 13종 — 스쿼드에서 4-3-3 같은 모양을 누르면 아래에 유형이 나옵니다. 4-3-3은 CM CDM CM · CM CM CAM · CDM CDM CAM · CM CM CM, 4-4-2는 플랫·다이아몬드·더블 볼란치, 4-2-3-1은 LM CAM RM · LW CAM RW, 3-5-2는 두 가지, 그리고 4-2-4와 3-4-3이 새로 생겼습니다. 같은 모양 안에서 유형을 바꾸면 선수 자리가 그대로 유지됩니다.
· 홈 이벤트 캘린더 — 컵·마스터스·핫타임·리미티드·빅매치 예측 마감이 날짜별로 보이고, 항목을 누르면 해당 탭으로 갑니다.
· 이용약관·개인정보처리방침 — 가입할 때 동의하고, 이미 가입한 분은 다음 로그인 때 한 번 동의 창이 뜹니다. 계정 창 아래에 약관·방침·확률 안내 링크가 있습니다.
· 계정 삭제(탈퇴), 게시판 신고·차단, 욕설 필터, 확률 안내 페이지(/odds).

■ 조정
· 경쟁 리그에도 체력 — 지금까지 경쟁 리그 경기는 체력을 건드리지 않았습니다. 이제 내 경기가 정산될 때마다 선발로 뛴 카드는 6, 교체로 들어온 카드는 3이 빠지고, 뛰지 않은 카드(벤치·보관함)는 8을 회복합니다. 접속하면 그동안 정산된 경기가 한꺼번에 반영되고, 시간이 지난다고 저절로 회복하지는 않습니다. 같은 11명으로 하루 15경기를 다 뛰면 90이 빠지니 로테이션을 돌리세요.
· 경쟁 리그 킥오프에서 부상·출전정지 카드는 선발에서도 벤치에서도 빠집니다. 부상 선발은 벤치에서 가장 잘 맞는 카드가 올라오고, 벤치에서 못 메우면 보관함에서 채웁니다. 벤치의 빈자리는 선발에 가장 많은 클럽의 카드로 채워 팀 컬러를 지킵니다(골키퍼 자리는 골키퍼). 자동 교체를 꺼 두어도 부상·정지 선수만은 빠집니다.$body$;
begin
  select user_id into v_author from public.admins limit 1;
  if v_author is null then
    raise notice 'no admin account found, skipping patch note';
    return;
  end if;
  select nickname into v_nick from public.posts where user_id = v_author and notice order by created_at desc limit 1;
  v_nick := coalesce(v_nick, '내 클럽 FC');
  insert into public.posts (user_id, nickname, title, body, notice, patch_ids)
  values (v_author, v_nick, '[패치 노트] 9/6 ④ 일괄 합성·포메이션 13종·경쟁 리그 체력·부상 자동 제외·캘린더·약관', v_body, true,
          array['2026-09-06-bulk-fusion', '2026-09-06-formation-variants', '2026-09-06-weekly-sidelined', '2026-09-06-weekly-wear',
                '2026-09-06-event-calendar', '2026-09-06-terms-consent', '2026-09-06-account-delete-board-moderation']);
end $$;
