-- 9월 7일 공지 ② — 스쿼드 레벨 상한 기준 변경 (20260907010000 과 같은 방식).
-- 스카우트 지정권은 사용자 지시로 이번 공지에서 뺀다(배포 계획이 정해진 뒤 따로).
do $$
declare
  v_author uuid;
  v_nick text;
  v_body text := $body$■ 조정
· 스쿼드 레벨 상한의 기준이 캐주얼 디비전에서 경쟁 리그 등급으로 바뀝니다. 선발 11명 레벨 합 상한은 0등급 110 · 1등급 89 · 2등급 77 · 3등급 66이고, 아직 배정되지 않았으면 3등급 기준입니다. 캐주얼 모드·데일리 PvP·친선도 같은 상한을 씁니다.
· 등급은 접속할 때와 경쟁 리그 탭을 열 때 서버와 맞춰지고, 승격·강등하면 다음 주 리그가 열릴 때 반영됩니다. 스쿼드 화면의 「라인업 등록 제한」에 기준 등급이 같이 보입니다. 캐주얼 디비전은 상대 강도와 보상에만 남습니다.$body$;
begin
  select user_id into v_author from public.admins limit 1;
  if v_author is null then
    raise notice 'no admin account found, skipping patch note';
    return;
  end if;
  select nickname into v_nick from public.posts where user_id = v_author and notice order by created_at desc limit 1;
  v_nick := coalesce(v_nick, '내 클럽 FC');
  insert into public.posts (user_id, nickname, title, body, notice, patch_ids)
  values (v_author, v_nick, '[패치 노트] 9/7 ② 스쿼드 레벨 상한 기준 — 경쟁 리그 등급으로', v_body, true,
          array['2026-09-07-tier-level-cap']);
end $$;
