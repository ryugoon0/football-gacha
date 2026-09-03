-- 밤새 반영된 변경사항을 유저 공지로 올린다. 게시판 글쓰기는 본인 계정
-- (auth.uid() = user_id)만 되게 막혀 있어 클라이언트에서는 못 넣고,
-- 마이그레이션(DB 소유자 권한)으로 운영자 계정 명의로 직접 넣는다.
do $$
declare
  v_author uuid;
  v_body text := $body$■ 추가
· 주간리그(경쟁 리그) 정식 이용 가능
   - 개막 배치 리그가 시작됐습니다. "경쟁 리그" 탭에서 내 경기 · 다른 경기 결과 · 순위표를 볼 수 있습니다.
   - 리그가 만들어진 뒤에 가입해도 계속 자동으로 배정됩니다.
· 화면 상단에 캐주얼 모드(경기)/경쟁 리그(주간리그) 표시를 넣었습니다.

■ 수정
· 스쿼드 자동 배치를 누르면 같은 선수 카드가 선발과 벤치에 동시에 등록돼 경기를 시작할 수 없던 문제를 고쳤습니다.
· 자동교체가 골키퍼를 공격수 자리 등 필드 포지션에 잘못 투입하던 문제를 고쳤습니다.
· 온라인 경기를 재생할 때 매 분 똑같은 장면(같은 선수 슈팅, 같은 결과)만 반복되던 문제를 고쳤습니다.
· 감독실 화면 배너가 화면 크기에 따라 이상하게 잘려 보이던 문제를 고쳤습니다.
· 주간리그 AI 클럽 이름이 "AI 클럽 1"처럼 나오던 것을 실제 클럽 이름으로 바꿨습니다.

■ 조정
· 보관함 기본 용량 60 → 80.
· 선수단 화면에 같은 클럽 · 같은 리그끼리 모아 보는 정렬을 추가했습니다.
· 배치 리그 최상위 등급은 실유저 인원 제한을 없앴습니다.$body$;
begin
  select user_id into v_author from public.admins limit 1;
  if v_author is null then
    raise notice 'no admin account found, skipping patch note';
    return;
  end if;

  insert into public.posts (user_id, nickname, title, body, notice)
  values (v_author, '내 클럽 FC', '[패치 노트] 2026-09-04', v_body, true);
end $$;
