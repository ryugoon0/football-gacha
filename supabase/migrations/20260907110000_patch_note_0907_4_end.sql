-- 리미티드 1차 종료 시각 변경: 9/15(화) 13:59 → 9/14(월) 09:00.
update public.posts
set title = replace(title, '8일(화) 14:00부터 일주일', '8일(화) 14:00 ~ 14일(월) 09:00'),
    body = replace(replace(body,
      '9월 8일(화) 14:00 ~ 15일(화) 13:59', '9월 8일(화) 14:00 ~ 14일(월) 09:00'),
      '기간이 끝나면 풀에서 빠지고', '14일(월) 오전 9시에 끝나며, 기간이 끝나면 풀에서 빠지고')
where notice and title like '[예고] 리미티드 1차%';
update public.posts
set body = replace(body, '첫 리미티드는 9월 8일(화) 14:00부터입니다.', '첫 리미티드는 9월 8일(화) 14:00 ~ 14일(월) 09:00입니다.')
where notice and title like '[패치 노트] 9/7 ③%';
