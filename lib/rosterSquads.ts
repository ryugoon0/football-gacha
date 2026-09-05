// scripts/build-squad-cards.mjs가 data/squads/*.json에서 만든다. 손으로 고치지 않는다.
import type { Rarity } from './types'
import type { ClubDef, RosterRow } from './players'

/** 실제 스쿼드 기반 카드 — ROSTER에서 LATE_ADDITIONS 뒤에 붙는다. */
export const SQUAD_ROSTER: Record<Rarity, RosterRow[]> = {
  Normal: [
    ['최주헌', 'GK', 60, '울산 호랑', '대한민국', {"squad":true,"unreleased":true}],
    ['류승민', 'GK', 64, '울산 호랑', '대한민국', {"squad":true,"unreleased":true}],
    ['황병건', 'GK', 67, '울산 호랑', '대한민국', {"squad":true,"unreleased":true}],
    ['조민석', 'CM', 65, '울산 호랑', '대한민국', {"squad":true,"unreleased":true}],
    ['백인유', 'CM', 66, '울산 호랑', '대한민국', {"squad":true,"unreleased":true}],
    ['최석헌', 'CB', 66, '울산 호랑', '대한민국', {"squad":true,"unreleased":true}],
    ['셰이 레이스', 'RW', 66, '맨체스 레즈', '잉글랜드', {"squad":true,"unreleased":false}],
    ['잭 플레쳐', 'CM', 65, '맨체스 레즈', '잉글랜드', {"squad":true,"unreleased":false}],
    ['타일러 플레쳐', 'CM', 63, '맨체스 레즈', '스코틀랜드', {"squad":true,"unreleased":false}],
    ['더못 미이', 'GK', 58, '맨체스 레즈', '북아일랜드', {"squad":true,"unreleased":false}],
    ['제임스 라이토', 'GK', 62, '아스톤 라이온', '잉글랜드', {"squad":true,"unreleased":false}],
    ['트래비스 패터손', 'RB', 63, '아스톤 라이온', '잉글랜드', {"squad":true,"unreleased":false}],
    ['자말딘 지모알로반', 'CM', 66, '아스톤 라이온', '잉글랜드', {"squad":true,"unreleased":false}],
    ['줄리안 아이스턴', 'GK', 62, '브렌트 벌', '미국', {"squad":true,"unreleased":false}],
    ['톰 맥길런', 'GK', 66, '브라이턴 걸스', '캐나다', {"squad":true,"unreleased":false}],
    ['자독 요한노', 'CM', 64, '브라이턴 걸스', '나이지리아', {"squad":true,"unreleased":false}],
    ['테디 샤먼루', 'GK', 62, '런던 블루스', '잉글랜드', {"squad":true,"unreleased":false}],
    ['댄 벤틀로', 'GK', 66, '코번트리 스카이', '잉글랜드', {"squad":true,"unreleased":false}],
    ['스티븐 음푸노', 'CB', 62, '코번트리 스카이', '잉글랜드', {"squad":true,"unreleased":false}],
    ['시디키 셰리포', 'ST', 66, '코번트리 스카이', '기니', {"squad":true,"unreleased":false}],
    ['레미 매슈손', 'GK', 66, '크리스탈 이글', '잉글랜드', {"squad":true,"unreleased":false}],
    ['자비에르 고즈', 'RW', 66, '크리스탈 이글', '미국', {"squad":true,"unreleased":false}],
    ['톰 킹스', 'GK', 65, '에버턴 토피', '웨일스', {"squad":true,"unreleased":false}],
    ['해리슨 암스트론', 'CM', 66, '에버턴 토피', '잉글랜드', {"squad":true,"unreleased":false}],
    ['알렉스 보르투', 'GK', 62, '풀럼 코티지', '미국', {"squad":true,"unreleased":false}],
    ['데이비드 버트나', 'GK', 64, '입스위치 트랙터', '잉글랜드', {"squad":true,"unreleased":false}],
    ['알렉스 케언손', 'GK', 66, '리즈 화이트', '잉글랜드', {"squad":true,"unreleased":false}],
    ['션 스퇴른', 'CM', 66, '뉴캐슬 매파이', '네덜란드', {"squad":true,"unreleased":false}],
    ['유언 자우에느', 'GK', 66, '뉴캐슬 매파이', '프랑스', {"squad":true,"unreleased":false}],
    ['마크 길레스핀', 'GK', 64, '뉴캐슬 매파이', '잉글랜드', {"squad":true,"unreleased":false}],
    ['슈테펜 벤단', 'GK', 66, '노팅엄 포레스터', '독일', {"squad":true,"unreleased":false}],
    ['사이먼 무언', 'GK', 64, '선덜랜드 블랙캣', '잉글랜드', {"squad":true,"unreleased":false}],
    ['쥘 아오칸', 'CM', 67, '선덜랜드 블랙캣', '콩고민주공화국', {"squad":true,"unreleased":false}],
    ['멜케르 엘보린', 'GK', 65, '선덜랜드 블랙캣', '스웨덴', {"squad":true,"unreleased":false}],
    ['브랜던 오스티느', 'GK', 64, '북런던 화이트', '미국', {"squad":true,"unreleased":false}],
    ['그레고이르 시비데르스칸', 'GK', 65, '알라베스 아술', '캐나다', {"squad":true,"unreleased":false}],
    ['살비 에스키베르', 'GK', 64, '마드리드 로히', '스페인', {"squad":true,"unreleased":false}],
    ['다니 마르티네노', 'CB', 67, '마드리드 로히', '스페인', {"squad":true,"unreleased":false}],
    ['브리안 파리냐노', 'CM', 66, '카탈루냐 블라우', '스페인', {"squad":true,"unreleased":false}],
    ['샤비 에스파르타', 'LB', 65, '카탈루냐 블라우', '스페인', {"squad":true,"unreleased":false}],
    ['존스 엘압델라윈', 'LW', 67, '비고 셀레스테', '모로코', {"squad":true,"unreleased":false}],
    ['빌 은송곤', 'ST', 66, '코루냐 블랑키아술', '카메룬', {"squad":true,"unreleased":false}],
    ['테윈 헤이설하르타', 'CM', 66, '코루냐 블랑키아술', '네덜란드', {"squad":true,"unreleased":false}],
    ['알리 우아린', 'CM', 66, '엘체 프란히베르데', '모로코', {"squad":true,"unreleased":false}],
    ['아담 보아야른', 'CM', 65, '엘체 프란히베르데', '모로코', {"squad":true,"unreleased":false}],
    ['알레한드로 이투르벤', 'GK', 65, '엘체 프란히베르데', '스페인', {"squad":true,"unreleased":false}],
    ['하비 모르시욘', 'CM', 64, '엘체 프란히베르데', '스페인', {"squad":true,"unreleased":false}],
    ['라펠 바우산', 'CM', 66, '에스파뇰 페리케', '스페인', {"squad":true,"unreleased":false}],
    ['하비 에르난데산', 'RW', 66, '에스파뇰 페리케', '스페인', {"squad":true,"unreleased":false}],
    ['장 이브 발룬', 'RB', 66, '헤타페 아술', '코트디부아르', {"squad":true,"unreleased":false}],
    ['이페아니 은두크웬', 'CB', 66, '레반테 그라노타', '오스트리아', {"squad":true,"unreleased":false}],
    ['야니스 무수아인', 'LW', 67, '레반테 그라노타', '벨기에', {"squad":true,"unreleased":false}],
    ['파코 코르테노', 'CM', 65, '레반테 그라노타', '스페인', {"squad":true,"unreleased":false}],
    ['나초 페레노', 'CB', 64, '레반테 그라노타', '스페인', {"squad":true,"unreleased":false}],
    ['알렉스 프리몬', 'GK', 64, '레반테 그라노타', '스페인', {"squad":true,"unreleased":false}],
    ['앙헬 레시온', 'RB', 67, '말라가 보케론', '스페인', {"squad":true,"unreleased":false}],
    ['이산 메리논', 'CM', 66, '말라가 보케론', '스페인', {"squad":true,"unreleased":false}],
    ['라피탄', 'RB', 66, '말라가 보케론', '스페인', {"squad":true,"unreleased":false}],
    ['아론 오초안', 'CM', 63, '말라가 보케론', '아일랜드', {"squad":true,"unreleased":false}],
    ['이니고 아르기비덴', 'CB', 66, '오사수나 로하', '스페인', {"squad":true,"unreleased":false}],
    ['아시에르 오삼벨란', 'CM', 66, '오사수나 로하', '스페인', {"squad":true,"unreleased":false}],
    ['록슨 예보안', 'CB', 66, '오사수나 로하', '가나', {"squad":true,"unreleased":false}],
    ['파블로 가르시안', 'LW', 66, '산탄데르 베르디블랑', '스페인', {"squad":true,"unreleased":false}],
    ['호르헤 살리나노', 'RB', 65, '산탄데르 베르디블랑', '스페인', {"squad":true,"unreleased":false}],
    ['이케르 루켄', 'ST', 67, '산탄데르 베르디블랑', '스페인', {"squad":true,"unreleased":false}],
    ['조주아 페르트라우트르', 'CB', 67, '라요 프랑코', '네덜란드', {"squad":true,"unreleased":false}],
    ['낭고로 부아렌', 'CM', 66, '라요 프랑코', '스페인', {"squad":true,"unreleased":false}],
    ['티아고 피타르친', 'CM', 65, '마드리드 블랑코', '스페인', {"squad":true,"unreleased":false}],
    ['잡 오치엥그', 'RW', 66, '도노스티 추리우르딘', '케냐', {"squad":true,"unreleased":false}],
    ['로비 유언', 'ST', 67, '세비야 로호', '스코틀랜드', {"squad":true,"unreleased":false}],
    ['니코 기옌드', 'CM', 63, '세비야 로호', '스페인', {"squad":true,"unreleased":false}],
    ['미겔 시에란', 'RW', 66, '세비야 로호', '스페인', {"squad":true,"unreleased":false}],
    ['카이너 판 오벌른', 'GK', 66, '발렌시아 무르시엘', '네덜란드', {"squad":true,"unreleased":false}],
    ['카를로스 마시안', 'CM', 63, '비야레 수브마리노', '스페인', {"squad":true,"unreleased":false}],
    ['프로스페르 페테른', 'ST', 64, '앙제 SCO', '프랑스', {"squad":true,"unreleased":false}],
    ['하루나 지비린드', 'LW', 65, '앙제 SCO', '카메룬', {"squad":true,"unreleased":false}],
    ['멜뱅 징간', 'GK', 66, '앙제 SCO', '프랑스', {"squad":true,"unreleased":false}],
    ['마리우스 루에른', 'CB', 63, '앙제 SCO', '프랑스', {"squad":true,"unreleased":false}],
    ['에마뉘엘 비움란', 'CB', 66, '앙제 SCO', '프랑스', {"squad":true,"unreleased":false}],
    ['앙토니 베르몽드', 'RW', 66, '앙제 SCO', '프랑스', {"squad":true,"unreleased":false}],
    ['우마르 포난', 'GK', 62, '앙제 SCO', '말리', {"squad":true,"unreleased":false}],
    ['텔리 시웬', 'LB', 67, '오세르 부르고', '프랑스', {"squad":true,"unreleased":false}],
    ['크리스트 마코손', 'CB', 67, '오세르 부르고', '콩고공화국', {"squad":true,"unreleased":false}],
    ['마마두 디오픈', 'GK', 66, '오세르 부르고', '모리타니', {"squad":true,"unreleased":false}],
    ['라민 시르', 'RB', 67, '오세르 부르고', '프랑스', {"squad":true,"unreleased":false}],
    ['리앙 로댕드', 'ST', 64, '오세르 부르고', '프랑스', {"squad":true,"unreleased":false}],
    ['아르튀르 피드포른', 'CM', 64, '오세르 부르고', '벨기에', {"squad":true,"unreleased":false}],
    ['아리스티드 조순', 'CM', 64, '오세르 부르고', '코트디부아르', {"squad":true,"unreleased":false}],
    ['클레망 아크판', 'CB', 67, '오세르 부르고', '코트디부아르', {"squad":true,"unreleased":false}],
    ['세쿠 포파난', 'CB', 66, '오세르 부르고', '코트디부아르', {"squad":true,"unreleased":false}],
    ['쥐스탱 부르곤', 'LB', 65, '브레스트 피라트', '프랑스', {"squad":true,"unreleased":false}],
    ['뤼크 조그벤', 'RB', 66, '브레스트 피라트', '코트디부아르', {"squad":true,"unreleased":false}],
    ['마티외 파투이옌', 'GK', 64, '브레스트 피라트', '프랑스', {"squad":true,"unreleased":false}],
    ['라파엘 르갱드', 'CB', 63, '브레스트 피라트', '프랑스', {"squad":true,"unreleased":false}],
    ['조앙 탱크른', 'LW', 64, '르아브르 시엘', '프랑스', {"squad":true,"unreleased":false}],
    ['시몽 에보노근', 'CM', 65, '르아브르 시엘', '프랑스', {"squad":true,"unreleased":false}],
    ['엔조 코핀', 'RW', 64, '르아브르 시엘', '프랑스', {"squad":true,"unreleased":false}],
    ['스테팡 자가둔', 'LB', 62, '르아브르 시엘', '프랑스', {"squad":true,"unreleased":false}],
    ['모크란 벤투민', 'CM', 64, '르아브르 시엘', '프랑스', {"squad":true,"unreleased":false}],
    ['이스마일 부네브스', 'CM', 63, '르아브르 시엘', '프랑스', {"squad":true,"unreleased":false}],
    ['폴 아르그넨', 'GK', 62, '르아브르 시엘', '프랑스', {"squad":true,"unreleased":false}],
    ['다렌 모셍곤', 'CM', 62, '르아브르 시엘', '프랑스', {"squad":true,"unreleased":false}],
    ['에완 아트푸르', 'GK', 66, '르망 시르퀴', '프랑스', {"squad":true,"unreleased":false}],
    ['아롤드 부아옌', 'CB', 66, '르망 시르퀴', '마르티니크', {"squad":true,"unreleased":false}],
    ['에드윈 쿠아르신', 'CDM', 67, '르망 시르퀴', '프랑스', {"squad":true,"unreleased":false}],
    ['알렉상드르 로렌', 'CM', 66, '르망 시르퀴', '프랑스', {"squad":true,"unreleased":false}],
    ['앙투안 라비야른', 'ST', 67, '르망 시르퀴', '프랑스', {"squad":true,"unreleased":false}],
    ['장 베르크루이손', 'CAM', 67, '르망 시르퀴', '프랑스', {"squad":true,"unreleased":false}],
    ['아딜 부라반', 'CM', 64, '르망 시르퀴', '알제리', {"squad":true,"unreleased":false}],
    ['노아 부아센', 'CB', 62, '르망 시르퀴', '프랑스', {"squad":true,"unreleased":false}],
    ['라울 토렌텐', 'CB', 67, '르망 시르퀴', '스페인', {"squad":true,"unreleased":false}],
    ['사뮈엘 요운', 'CB', 65, '르망 시르퀴', '프랑스', {"squad":true,"unreleased":false}],
    ['뤼카 부아든', 'CB', 65, '르망 시르퀴', '프랑스', {"squad":true,"unreleased":false}],
    ['윌리암 아르우준', 'LW', 66, '르망 시르퀴', '프랑스', {"squad":true,"unreleased":false}],
    ['테오 에유므', 'LB', 64, '르망 시르퀴', '프랑스', {"squad":true,"unreleased":false}],
    ['뤼카 칼로단', 'RB', 64, '르망 시르퀴', '프랑스', {"squad":true,"unreleased":false}],
    ['다우다 트라오렌', 'CM', 62, '르망 시르퀴', '프랑스', {"squad":true,"unreleased":false}],
    ['밀랑 로뱅드', 'CM', 65, '르망 시르퀴', '프랑스', {"squad":true,"unreleased":false}],
    ['담 게옌', 'ST', 66, '르망 시르퀴', '세네갈', {"squad":true,"unreleased":false}],
    ['라얀 밤반', 'LB', 63, '르망 시르퀴', '프랑스', {"squad":true,"unreleased":false}],
    ['마르탱 로시뇰라', 'CM', 64, '르망 시르퀴', '프랑스', {"squad":true,"unreleased":false}],
    ['에르완 콜란', 'LW', 65, '르망 시르퀴', '프랑스', {"squad":true,"unreleased":false}],
    ['뤼카 브르텔라', 'CDM', 64, '르망 시르퀴', '프랑스', {"squad":true,"unreleased":false}],
    ['야세르 라루신', 'LB', 67, '르망 시르퀴', '알제리', {"squad":true,"unreleased":false}],
    ['니콜라 코시큰', 'GK', 66, '르망 시르퀴', '프랑스', {"squad":true,"unreleased":false}],
    ['엔조 바그네른', 'ST', 62, '르망 시르퀴', '브라질', {"squad":true,"unreleased":false}],
    ['니달 첼리큰', 'CB', 66, '랑스 상글리에', '보스니아헤르체고비나', {"squad":true,"unreleased":false}],
    ['안드리야 불라토비츠', 'CM', 66, '랑스 상글리에', '몬테네그로', {"squad":true,"unreleased":false}],
    ['마티외 고르젤랭드', 'GK', 67, '랑스 상글리에', '프랑스', {"squad":true,"unreleased":false}],
    ['이스마엘로 가니운', 'CB', 66, '랑스 상글리에', '프랑스', {"squad":true,"unreleased":false}],
    ['쥐니오르 카딜라', 'LW', 67, '랑스 상글리에', '프랑스', {"squad":true,"unreleased":false}],
    ['술레이만 사냥드', 'CB', 65, '랑스 상글리에', '말리', {"squad":true,"unreleased":false}],
    ['룬 스르다노비츠', 'RB', 65, '릴 도그', '스위스', {"squad":true,"unreleased":false}],
    ['오를란도 힐라', 'GK', 67, '릴 도그', '파라과이', {"squad":true,"unreleased":false}],
    ['이자크 코시엔', 'CB', 65, '릴 도그', '프랑스', {"squad":true,"unreleased":false}],
    ['소리바 디아운드', 'LW', 64, '릴 도그', '프랑스', {"squad":true,"unreleased":false}],
    ['이브라히마 발덴', 'ST', 66, '로리앙 메를뤼', '프랑스', {"squad":true,"unreleased":false}],
    ['스르잔 쿠즈미츠', 'CB', 66, '로리앙 메를뤼', '슬로베니아', {"squad":true,"unreleased":false}],
    ['가뱅 베르나르돈', 'CM', 63, '로리앙 메를뤼', '프랑스', {"squad":true,"unreleased":false}],
    ['아르센 쿠아신', 'LB', 65, '로리앙 메를뤼', '부르키나파소', {"squad":true,"unreleased":false}],
    ['아르튀르 아보므', 'CM', 64, '로리앙 메를뤼', '카메룬', {"squad":true,"unreleased":false}],
  ],
  Rare: [
    ['윤중규', 'RB', 71, '울산 호랑', '대한민국', {"squad":true,"unreleased":true}],
    ['정선빈', 'CB', 68, '울산 호랑', '대한민국', {"squad":true,"unreleased":true}],
    ['서명권', 'CB', 72, '울산 호랑', '대한민국', {"squad":true,"unreleased":true}],
    ['이희근', 'RW', 74, '울산 호랑', '대한민국', {"squad":true,"unreleased":true}],
    ['이진헌', 'CM', 74, '울산 호랑', '대한민국', {"squad":true,"unreleased":true}],
    ['박우재', 'CM', 69, '울산 호랑', '대한민국', {"squad":true,"unreleased":true}],
    ['강상유', 'LB', 74, '울산 호랑', '대한민국', {"squad":true,"unreleased":true}],
    ['정재삼', 'ST', 71, '울산 호랑', '대한민국', {"squad":true,"unreleased":true}],
    ['문정일', 'GK', 68, '울산 호랑', '대한민국', {"squad":true,"unreleased":true}],
    ['이규선', 'CDM', 75, '울산 호랑', '대한민국', {"squad":true,"unreleased":true}],
    ['조현탁', 'LB', 73, '울산 호랑', '대한민국', {"squad":true,"unreleased":true}],
    ['페드리노', 'RW', 75, '울산 호랑', '브라질', {"squad":true,"unreleased":true}],
    ['이재억', 'CB', 71, '울산 호랑', '대한민국', {"squad":true,"unreleased":true}],
    ['장시연', 'RM', 70, '울산 호랑', '대한민국', {"squad":true,"unreleased":true}],
    ['토마스 오데코트', 'CB', 72, '울산 호랑', '네덜란드', {"squad":true,"unreleased":true}],
    ['밀로시 트로약', 'CB', 73, '울산 호랑', '폴란드', {"squad":true,"unreleased":true}],
    ['심상만', 'LB', 70, '울산 호랑', '대한민국', {"squad":true,"unreleased":true}],
    ['벤지 미셀', 'LM', 72, '울산 호랑', '미국', {"squad":true,"unreleased":true}],
    ['칼 다를로', 'GK', 72, '맨체스 레즈', '웨일스', {"squad":true,"unreleased":false}],
    ['톰 히튼', 'GK', 68, '맨체스 레즈', '잉글랜드', {"squad":true,"unreleased":false}],
    ['에이든 헤번', 'CB', 72, '맨체스 레즈', '잉글랜드', {"squad":true,"unreleased":false}],
    ['해리 아마즈', 'LB', 68, '맨체스 레즈', '잉글랜드', {"squad":true,"unreleased":false}],
    ['모두 케바 시소', 'CB', 68, '아스톤 라이온', '세네갈', {"squad":true,"unreleased":false}],
    ['라마레 보하르도', 'CDM', 69, '아스톤 라이온', '네덜란드', {"squad":true,"unreleased":false}],
    ['요한 만잠보', 'CM', 70, '아스톤 라이온', '스위스', {"squad":true,"unreleased":false}],
    ['이브라힘 음바여', 'RW', 70, '아스톤 라이온', '세네갈', {"squad":true,"unreleased":false}],
    ['알리손 주니오', 'LW', 70, '아스톤 라이온', '브라질', {"squad":true,"unreleased":false}],
    ['하콘 발디마르센', 'GK', 75, '브렌트 벌', '아이슬란드', {"squad":true,"unreleased":false}],
    ['제이든 메고모', 'LB', 68, '브렌트 벌', '잉글랜드', {"squad":true,"unreleased":false}],
    ['김지승', 'CB', 68, '브렌트 벌', '대한민국', {"squad":true,"unreleased":false}],
    ['조시 다실반', 'CAM', 74, '브렌트 벌', '잉글랜드', {"squad":true,"unreleased":false}],
    ['안토니 밀람바', 'CM', 74, '브렌트 벌', '네덜란드', {"squad":true,"unreleased":false}],
    ['마마두 상가로', 'CDM', 73, '브렌트 벌', '말리', {"squad":true,"unreleased":false}],
    ['유누스 코나키', 'CM', 68, '브렌트 벌', '튀르키예', {"squad":true,"unreleased":false}],
    ['칼럼 윌손', 'ST', 75, '브렌트 벌', '잉글랜드', {"squad":true,"unreleased":false}],
    ['제이든 앤서노', 'LW', 74, '브렌트 벌', '잉글랜드', {"squad":true,"unreleased":false}],
    ['구스타보 누네소', 'LW', 70, '브렌트 벌', '브라질', {"squad":true,"unreleased":false}],
    ['프레이저 포스톤', 'GK', 72, '본머스 체리', '잉글랜드', {"squad":true,"unreleased":false}],
    ['제임스 힐런', 'CB', 72, '본머스 체리', '잉글랜드', {"squad":true,"unreleased":false}],
    ['훌리오 솔레로', 'LB', 72, '본머스 체리', '아르헨티나', {"squad":true,"unreleased":false}],
    ['애덤 스미슨', 'RB', 73, '본머스 체리', '잉글랜드', {"squad":true,"unreleased":false}],
    ['맥스 애런손', 'RB', 73, '본머스 체리', '잉글랜드', {"squad":true,"unreleased":false}],
    ['벨코 밀로사블레빈', 'CB', 68, '본머스 체리', '세르비아', {"squad":true,"unreleased":false}],
    ['알렉스 토토', 'CM', 70, '본머스 체리', '헝가리', {"squad":true,"unreleased":false}],
    ['엘리 크루포', 'ST', 74, '본머스 체리', '프랑스', {"squad":true,"unreleased":false}],
    ['대니얼 제비손', 'ST', 70, '본머스 체리', '캐나다', {"squad":true,"unreleased":false}],
    ['알바로 로드리게소', 'ST', 72, '본머스 체리', '우루과이', {"squad":true,"unreleased":false}],
    ['하이안', 'LW', 72, '본머스 체리', '브라질', {"squad":true,"unreleased":false}],
    ['제이슨 스틸런', 'GK', 74, '브라이턴 걸스', '잉글랜드', {"squad":true,"unreleased":false}],
    ['자우엔 하자모', 'LB', 74, '브라이턴 걸스', '알제리', {"squad":true,"unreleased":false}],
    ['코스치노', 'RB', 74, '브라이턴 걸스', '포르투갈', {"squad":true,"unreleased":false}],
    ['미하엘 스보보도', 'CB', 70, '브라이턴 걸스', '오스트리아', {"squad":true,"unreleased":false}],
    ['루카 부슈코빈', 'CB', 74, '브라이턴 걸스', '크로아티아', {"squad":true,"unreleased":false}],
    ['체마 안드레소', 'CDM', 72, '브라이턴 걸스', '스페인', {"squad":true,"unreleased":false}],
    ['이브라힘 오스마노', 'RW', 72, '브라이턴 걸스', '가나', {"squad":true,"unreleased":false}],
    ['말리크 얄쿠여', 'CDM', 70, '브라이턴 걸스', '코트디부아르', {"squad":true,"unreleased":false}],
    ['페미 아지소', 'RW', 68, '브라이턴 걸스', '나이지리아', {"squad":true,"unreleased":false}],
    ['스테파노스 치마소', 'ST', 74, '브라이턴 걸스', '그리스', {"squad":true,"unreleased":false}],
    ['하랄람보스 코스툴라소', 'ST', 73, '브라이턴 걸스', '그리스', {"squad":true,"unreleased":false}],
    ['마이크 펜더손', 'GK', 72, '런던 블루스', '벨기에', {"squad":true,"unreleased":false}],
    ['가브리엘 슬로니노', 'GK', 70, '런던 블루스', '미국', {"squad":true,"unreleased":false}],
    ['펩 차바리오', 'LB', 74, '런던 블루스', '스페인', {"squad":true,"unreleased":false}],
    ['아론 안셀미나', 'CB', 74, '런던 블루스', '아르헨티나', {"squad":true,"unreleased":false}],
    ['조던 헨더손', 'CM', 75, '런던 블루스', '잉글랜드', {"squad":true,"unreleased":false}],
    ['대니 웰베크', 'ST', 74, '런던 블루스', '잉글랜드', {"squad":true,"unreleased":false}],
    ['벤 윌손', 'GK', 70, '코번트리 스카이', '잉글랜드', {"squad":true,"unreleased":false}],
    ['칼 러시워드', 'GK', 70, '코번트리 스카이', '잉글랜드', {"squad":true,"unreleased":false}],
    ['이선 피노크', 'CB', 73, '코번트리 스카이', '자메이카', {"squad":true,"unreleased":false}],
    ['제이 다실보', 'LB', 69, '코번트리 스카이', '웨일스', {"squad":true,"unreleased":false}],
    ['보비 토머슨', 'CB', 72, '코번트리 스카이', '잉글랜드', {"squad":true,"unreleased":false}],
    ['케인 케슬러헤이던', 'RB', 70, '코번트리 스카이', '잉글랜드', {"squad":true,"unreleased":false}],
    ['제이크 비드웰런', 'LB', 68, '코번트리 스카이', '잉글랜드', {"squad":true,"unreleased":false}],
    ['조엘 라티보디에', 'CB', 70, '코번트리 스카이', '자메이카', {"squad":true,"unreleased":false}],
    ['오렐 아멘도', 'CB', 71, '코번트리 스카이', '스위스', {"squad":true,"unreleased":false}],
    ['루크 울펜던', 'CB', 71, '코번트리 스카이', '잉글랜드', {"squad":true,"unreleased":false}],
    ['밀란 판 에베이코', 'RB', 73, '코번트리 스카이', '네덜란드', {"squad":true,"unreleased":false}],
    ['잭 루도노', 'CM', 74, '코번트리 스카이', '잉글랜드', {"squad":true,"unreleased":false}],
    ['맷 그라임손', 'CDM', 72, '코번트리 스카이', '잉글랜드', {"squad":true,"unreleased":false}],
    ['케일럽 이렌코', 'CM', 68, '코번트리 스카이', '가나', {"squad":true,"unreleased":false}],
    ['프랭크 오니에코', 'CDM', 72, '코번트리 스카이', '나이지리아', {"squad":true,"unreleased":false}],
    ['조시 에클손', 'CM', 68, '코번트리 스카이', '잉글랜드', {"squad":true,"unreleased":false}],
    ['빅토르 토르포', 'CM', 71, '코번트리 스카이', '덴마크', {"squad":true,"unreleased":false}],
    ['얀 그보후', 'CAM', 70, '코번트리 스카이', '프랑스', {"squad":true,"unreleased":false}],
    ['사카모토 다쓰히루', 'RW', 72, '코번트리 스카이', '일본', {"squad":true,"unreleased":false}],
    ['엘리스 심손', 'ST', 72, '코번트리 스카이', '잉글랜드', {"squad":true,"unreleased":false}],
    ['에프론 메이슨클라코', 'LW', 71, '코번트리 스카이', '자메이카', {"squad":true,"unreleased":false}],
    ['하지 라이토', 'ST', 73, '코번트리 스카이', '미국', {"squad":true,"unreleased":false}],
    ['타이워 아워니오', 'ST', 74, '코번트리 스카이', '나이지리아', {"squad":true,"unreleased":false}],
    ['룸 차우노', 'RW', 72, '코번트리 스카이', '프랑스', {"squad":true,"unreleased":false}],
    ['브랜던 토머스아산토', 'ST', 70, '코번트리 스카이', '가나', {"squad":true,"unreleased":false}],
    ['샤디 리아도', 'CB', 74, '크리스탈 이글', '모로코', {"squad":true,"unreleased":false}],
    ['제이디 캉보트', 'CB', 74, '크리스탈 이글', '프랑스', {"squad":true,"unreleased":false}],
    ['어니스트 아하노', 'LB', 70, '크리스탈 이글', '이탈리아', {"squad":true,"unreleased":false}],
    ['아난 칼라일로', 'RB', 72, '크리스탈 이글', '이스라엘', {"squad":true,"unreleased":false}],
    ['벤 칠웰런', 'LB', 75, '크리스탈 이글', '잉글랜드', {"squad":true,"unreleased":false}],
    ['에디 은케티오', 'ST', 75, '크리스탈 이글', '잉글랜드', {"squad":true,"unreleased":false}],
    ['마크 트래버손', 'GK', 72, '에버턴 토피', '아일랜드', {"squad":true,"unreleased":false}],
    ['메를린 뢸러', 'CM', 74, '에버턴 토피', '독일', {"squad":true,"unreleased":false}],
    ['타이리크 조지오', 'LW', 72, '에버턴 토피', '잉글랜드', {"squad":true,"unreleased":false}],
    ['뱅자맹 르콩테', 'GK', 72, '풀럼 코티지', '프랑스', {"squad":true,"unreleased":false}],
    ['호르헤 쿠엥코', 'CB', 75, '풀럼 코티지', '스페인', {"squad":true,"unreleased":false}],
    ['다비트 아펜그루베르', 'CB', 74, '풀럼 코티지', '오스트리아', {"squad":true,"unreleased":false}],
    ['뤽 드 푸제로', 'CB', 68, '풀럼 코티지', '캐나다', {"squad":true,"unreleased":false}],
    ['해리슨 리드슨', 'CM', 74, '풀럼 코티지', '잉글랜드', {"squad":true,"unreleased":false}],
    ['세사르 팔라시오', 'CM', 72, '풀럼 코티지', '스페인', {"squad":true,"unreleased":false}],
    ['톰 케어노', 'CM', 75, '풀럼 코티지', '스코틀랜드', {"squad":true,"unreleased":false}],
    ['셰이 찰손', 'CDM', 72, '풀럼 코티지', '북아일랜드', {"squad":true,"unreleased":false}],
    ['마누엘 앙헬로', 'CM', 70, '풀럼 코티지', '스페인', {"squad":true,"unreleased":false}],
    ['조시 킹거', 'CM', 70, '풀럼 코티지', '잉글랜드', {"squad":true,"unreleased":false}],
    ['라이언 세세뇨', 'LM', 74, '풀럼 코티지', '잉글랜드', {"squad":true,"unreleased":false}],
    ['요나 쿠시아사로', 'ST', 68, '풀럼 코티지', '스웨덴', {"squad":true,"unreleased":false}],
    ['루이 코일라', 'RB', 69, '헐 타이거', '잉글랜드', {"squad":true,"unreleased":false}],
    ['라이언 자일러', 'LB', 72, '헐 타이거', '잉글랜드', {"squad":true,"unreleased":false}],
    ['찰리 휴선', 'CB', 72, '헐 타이거', '잉글랜드', {"squad":true,"unreleased":false}],
    ['세미 아자인', 'CB', 72, '헐 타이거', '나이지리아', {"squad":true,"unreleased":false}],
    ['소르바 토머슨', 'RW', 73, '헐 타이거', '웨일스', {"squad":true,"unreleased":false}],
    ['엘리오 마타존', 'CM', 72, '헐 타이거', '벨기에', {"squad":true,"unreleased":false}],
    ['올리 맥버닌', 'ST', 72, '헐 타이거', '스코틀랜드', {"squad":true,"unreleased":false}],
    ['모하메드 벨루민', 'LW', 72, '헐 타이거', '알제리', {"squad":true,"unreleased":false}],
    ['조 겔하트르', 'CAM', 72, '헐 타이거', '잉글랜드', {"squad":true,"unreleased":false}],
    ['딜런 필립손', 'GK', 68, '헐 타이거', '잉글랜드', {"squad":true,"unreleased":false}],
    ['옌스 예르퇴달라', 'CM', 68, '헐 타이거', '노르웨이', {"squad":true,"unreleased":false}],
    ['존 이거른', 'CB', 71, '헐 타이거', '아일랜드', {"squad":true,"unreleased":false}],
    ['패디 맥네언', 'CB', 71, '헐 타이거', '북아일랜드', {"squad":true,"unreleased":false}],
    ['콘스탄티노스 촐라키손', 'GK', 73, '헐 타이거', '그리스', {"squad":true,"unreleased":false}],
    ['오스카르 삼브라논', 'CDM', 70, '헐 타이거', '에콰도르', {"squad":true,"unreleased":false}],
    ['엘리엇 스트라우든', 'LW', 69, '헐 타이거', '스웨덴', {"squad":true,"unreleased":false}],
    ['맷 타기트', 'LB', 71, '헐 타이거', '잉글랜드', {"squad":true,"unreleased":false}],
    ['다르코 갸빈', 'CM', 70, '헐 타이거', '잉글랜드', {"squad":true,"unreleased":false}],
    ['맷 크룩손', 'CM', 69, '헐 타이거', '잉글랜드', {"squad":true,"unreleased":false}],
    ['키어런 다웰라', 'CAM', 71, '헐 타이거', '잉글랜드', {"squad":true,"unreleased":false}],
    ['리건 슬레이터스', 'CDM', 70, '헐 타이거', '잉글랜드', {"squad":true,"unreleased":false}],
    ['루카스 구르나두아트르', 'CDM', 74, '헐 타이거', '프랑스', {"squad":true,"unreleased":false}],
    ['데이비드 아킨톨란', 'ST', 69, '헐 타이거', '나이지리아', {"squad":true,"unreleased":false}],
    ['노벨 멘딘', 'CB', 69, '헐 타이거', '세네갈', {"squad":true,"unreleased":false}],
    ['압뒬카디르 외뮈른', 'RM', 71, '헐 타이거', '튀르키예', {"squad":true,"unreleased":false}],
    ['팀 이로그분아르', 'CM', 74, '헐 타이거', '잉글랜드', {"squad":true,"unreleased":false}],
    ['모하메드알리 쇼른', 'LW', 74, '헐 타이거', '프랑스', {"squad":true,"unreleased":false}],
    ['알렉스 파머스', 'GK', 74, '입스위치 트랙터', '잉글랜드', {"squad":true,"unreleased":false}],
    ['다넬 펄롱크', 'RB', 72, '입스위치 트랙터', '잉글랜드', {"squad":true,"unreleased":false}],
    ['레이프 데이비손', 'LB', 74, '입스위치 트랙터', '잉글랜드', {"squad":true,"unreleased":false}],
    ['세드리크 키프렌', 'CB', 72, '입스위치 트랙터', '코트디부아르', {"squad":true,"unreleased":false}],
    ['아조르 마투시완', 'CDM', 74, '입스위치 트랙터', '네덜란드', {"squad":true,"unreleased":false}],
    ['이사 디오픈', 'CB', 74, '입스위치 트랙터', '모로코', {"squad":true,"unreleased":false}],
    ['신드레 발레 에겔린', 'LW', 70, '입스위치 트랙터', '노르웨이', {"squad":true,"unreleased":false}],
    ['지안 플레밍크', 'ST', 75, '입스위치 트랙터', '네덜란드', {"squad":true,"unreleased":false}],
    ['제이든 필로지느', 'LW', 75, '입스위치 트랙터', '잉글랜드', {"squad":true,"unreleased":false}],
    ['플로렌티누 루이손', 'CDM', 75, '입스위치 트랙터', '포르투갈', {"squad":true,"unreleased":false}],
    ['잭 테일러스', 'CM', 70, '입스위치 트랙터', '아일랜드', {"squad":true,"unreleased":false}],
    ['에메르손드', 'ST', 73, '입스위치 트랙터', '브라질', {"squad":true,"unreleased":false}],
    ['케이시 맥아티언', 'RW', 71, '입스위치 트랙터', '아일랜드', {"squad":true,"unreleased":false}],
    ['사샤 루키츠', 'CDM', 74, '입스위치 트랙터', '세르비아', {"squad":true,"unreleased":false}],
    ['제이컵 그리브손', 'CB', 74, '입스위치 트랙터', '잉글랜드', {"squad":true,"unreleased":false}],
    ['다라 오셰인', 'CB', 74, '입스위치 트랙터', '아일랜드', {"squad":true,"unreleased":false}],
    ['크리스천 월터느', 'GK', 69, '입스위치 트랙터', '잉글랜드', {"squad":true,"unreleased":false}],
    ['추바 아크포므', 'ST', 71, '입스위치 트랙터', '잉글랜드', {"squad":true,"unreleased":false}],
    ['마르셀리노 누녜노', 'CM', 73, '입스위치 트랙터', '칠레', {"squad":true,"unreleased":false}],
    ['아니스 메메틴', 'LW', 71, '입스위치 트랙터', '알바니아', {"squad":true,"unreleased":false}],
    ['켈 스헤르페느', 'GK', 71, '입스위치 트랙터', '네덜란드', {"squad":true,"unreleased":false}],
    ['압둘 우아타란', 'RB', 68, '입스위치 트랙터', '코트디부아르', {"squad":true,"unreleased":false}],
    ['잭 클라크르', 'LW', 73, '입스위치 트랙터', '잉글랜드', {"squad":true,"unreleased":false}],
    ['제이든 보글라', 'RB', 73, '리즈 화이트', '잉글랜드', {"squad":true,"unreleased":false}],
    ['가브리엘 구드문드슨드', 'LB', 74, '리즈 화이트', '스웨덴', {"squad":true,"unreleased":false}],
    ['타리크 무하레모비츠', 'CB', 74, '리즈 화이트', '보스니아헤르체고비나', {"squad":true,"unreleased":false}],
    ['브렌던 애런슨드', 'CAM', 74, '리즈 화이트', '미국', {"squad":true,"unreleased":false}],
    ['루카스 은메찬', 'ST', 75, '리즈 화이트', '독일', {"squad":true,"unreleased":false}],
    ['미하엘 체트런', 'GK', 73, '리즈 화이트', '독일', {"squad":true,"unreleased":false}],
    ['다나카 아온', 'CM', 75, '리즈 화이트', '일본', {"squad":true,"unreleased":false}],
    ['장마테오 바오얀', 'LW', 75, '리즈 화이트', '프랑스', {"squad":true,"unreleased":false}],
    ['제임스 저스티노', 'RB', 75, '리즈 화이트', '잉글랜드', {"squad":true,"unreleased":false}],
    ['멜뱅 바르드', 'LB', 74, '리즈 화이트', '프랑스', {"squad":true,"unreleased":false}],
    ['일리야 그루에브스', 'CM', 73, '리즈 화이트', '불가리아', {"squad":true,"unreleased":false}],
    ['엔도 와타룬', 'CDM', 75, '리버 머지', '일본', {"squad":true,"unreleased":false}],
    ['제레미 자켄', 'CB', 73, '리버 머지', '프랑스', {"squad":true,"unreleased":false}],
    ['코스타스 치미카손', 'LB', 75, '리버 머지', '그리스', {"squad":true,"unreleased":false}],
    ['빅토르 무뇨손', 'RW', 68, '리버 머지', '스페인', {"squad":true,"unreleased":false}],
    ['프레디 우드먼드', 'GK', 70, '리버 머지', '잉글랜드', {"squad":true,"unreleased":false}],
    ['트레이 뇨닌', 'CM', 69, '리버 머지', '잉글랜드', {"squad":true,"unreleased":false}],
    ['제임스 매코널라', 'CM', 70, '리버 머지', '잉글랜드', {"squad":true,"unreleased":false}],
    ['비테즐라프 야로신', 'GK', 68, '리버 머지', '체코', {"squad":true,"unreleased":false}],
    ['리오 응구모한', 'LW', 72, '리버 머지', '잉글랜드', {"squad":true,"unreleased":false}],
    ['마커스 베티넬린', 'GK', 68, '맨체스 블루', '잉글랜드', {"squad":true,"unreleased":false}],
    ['조시 윌슨에스브랜든', 'LB', 70, '맨체스 블루', '잉글랜드', {"squad":true,"unreleased":false}],
    ['알라지 밤반', 'CM', 69, '뉴캐슬 매파이', '프랑스', {"squad":true,"unreleased":false}],
    ['윌리엄 오술란', 'ST', 73, '뉴캐슬 매파이', '덴마크', {"squad":true,"unreleased":false}],
    ['바주마나 투렌', 'LW', 70, '뉴캐슬 매파이', '코트디부아르', {"squad":true,"unreleased":false}],
    ['마티아스 페르난데스파르돈', 'LW', 73, '뉴캐슬 매파이', '벨기에', {"squad":true,"unreleased":false}],
    ['루카시 호르니체큰', 'GK', 70, '뉴캐슬 매파이', '체코', {"squad":true,"unreleased":false}],
    ['루이스 마일린', 'CM', 73, '뉴캐슬 매파이', '잉글랜드', {"squad":true,"unreleased":false}],
    ['존 빅토른', 'GK', 73, '노팅엄 포레스터', '브라질', {"squad":true,"unreleased":false}],
    ['라이언 예이추', 'CDM', 74, '노팅엄 포레스터', '잉글랜드', {"squad":true,"unreleased":false}],
    ['자이르 쿠냔', 'CB', 73, '노팅엄 포레스터', '브라질', {"squad":true,"unreleased":false}],
    ['니콜로 사보난', 'CB', 75, '노팅엄 포레스터', '이탈리아', {"squad":true,"unreleased":false}],
    ['대니얼 밸러든', 'CB', 74, '선덜랜드 블랙캣', '북아일랜드', {"squad":true,"unreleased":false}],
    ['다얀 메탈린', 'CB', 69, '선덜랜드 블랙캣', '프랑스', {"squad":true,"unreleased":false}],
    ['앨런 브라운드', 'CM', 71, '선덜랜드 블랙캣', '아일랜드', {"squad":true,"unreleased":false}],
    ['닐손 앙굴론', 'LW', 74, '선덜랜드 블랙캣', '에콰도르', {"squad":true,"unreleased":false}],
    ['크리스 리근', 'CAM', 75, '선덜랜드 블랙캣', '잉글랜드', {"squad":true,"unreleased":false}],
    ['토마 뫼니엔', 'RB', 73, '선덜랜드 블랙캣', '벨기에', {"squad":true,"unreleased":false}],
    ['루크 오니언드', 'CM', 72, '선덜랜드 블랙캣', '잉글랜드', {"squad":true,"unreleased":false}],
    ['로메인 문들라', 'LW', 73, '선덜랜드 블랙캣', '잉글랜드', {"squad":true,"unreleased":false}],
    ['윌슨 이시도른', 'ST', 75, '선덜랜드 블랙캣', '아이티', {"squad":true,"unreleased":false}],
    ['트라이 흄드', 'RB', 74, '선덜랜드 블랙캣', '북아일랜드', {"squad":true,"unreleased":false}],
    ['조슬랭 타 빈', 'RW', 70, '선덜랜드 블랙캣', '코트디부아르', {"squad":true,"unreleased":false}],
    ['아지 알레센', 'LB', 70, '선덜랜드 블랙캣', '잉글랜드', {"squad":true,"unreleased":false}],
    ['압둘라 바르', 'CM', 70, '선덜랜드 블랙캣', '프랑스', {"squad":true,"unreleased":false}],
    ['미하일로 무드리큰', 'LW', 74, '북런던 화이트', '우크라이나', {"squad":true,"unreleased":false}],
    ['벤 데이비손', 'CB', 72, '북런던 화이트', '웨일스', {"squad":true,"unreleased":false}],
    ['마르틴 두브라프칸', 'GK', 74, '북런던 화이트', '슬로바키아', {"squad":true,"unreleased":false}],
    ['니콜라스 발렌티노', 'CB', 75, '알라베스 아술', '아르헨티나', {"squad":true,"unreleased":false}],
    ['유세프 엔리케르', 'RB', 71, '알라베스 아술', '모로코', {"squad":true,"unreleased":false}],
    ['파쿤도 가르세노', 'CB', 75, '알라베스 아술', '아르헨티나', {"squad":true,"unreleased":false}],
    ['안데르 게바로', 'CDM', 73, '알라베스 아술', '스페인', {"squad":true,"unreleased":false}],
    ['앙헬 페레노', 'CAM', 71, '알라베스 아술', '스페인', {"squad":true,"unreleased":false}],
    ['안토니오 블랑카', 'CM', 75, '알라베스 아술', '스페인', {"squad":true,"unreleased":false}],
    ['마리아노 디아노', 'ST', 72, '알라베스 아술', '도미니카공화국', {"squad":true,"unreleased":false}],
    ['카를레스 알레뇨', 'CAM', 75, '알라베스 아술', '스페인', {"squad":true,"unreleased":false}],
    ['우고 노보안', 'RB', 71, '알라베스 아술', '스페인', {"squad":true,"unreleased":false}],
    ['아드리안 로드리게노', 'GK', 68, '알라베스 아술', '아르헨티나', {"squad":true,"unreleased":false}],
    ['나우엘 테나글리오', 'RB', 74, '알라베스 아술', '아르헨티나', {"squad":true,"unreleased":false}],
    ['빌레 코스킨', 'CB', 70, '알라베스 아술', '핀란드', {"squad":true,"unreleased":false}],
    ['조니 오톤', 'LB', 74, '알라베스 아술', '스페인', {"squad":true,"unreleased":false}],
    ['미켈 로드리게르', 'CM', 69, '알라베스 아술', '스페인', {"squad":true,"unreleased":false}],
    ['파블로 이바네르', 'CM', 73, '알라베스 아술', '스페인', {"squad":true,"unreleased":false}],
    ['아이토르 마냐노', 'LW', 69, '알라베스 아술', '스페인', {"squad":true,"unreleased":false}],
    ['압데 레바흐', 'RW', 73, '알라베스 아술', '알제리', {"squad":true,"unreleased":false}],
    ['미겔 로드리게산', 'CM', 68, '알라베스 아술', '스페인', {"squad":true,"unreleased":false}],
    ['카를로스 프로테소닌', 'CDM', 71, '알라베스 아술', '우루과이', {"squad":true,"unreleased":false}],
    ['셀루 디알론', 'CM', 70, '알라베스 아술', '기니', {"squad":true,"unreleased":false}],
    ['알렉스 파디요', 'GK', 70, '바스크 아슬레', '멕시코', {"squad":true,"unreleased":false}],
    ['우고 린콘드', 'RB', 71, '바스크 아슬레', '스페인', {"squad":true,"unreleased":false}],
    ['미켈 하우레기사른', 'CDM', 74, '바스크 아슬레', '스페인', {"squad":true,"unreleased":false}],
    ['알레한드로 레곤', 'CM', 70, '바스크 아슬레', '스페인', {"squad":true,"unreleased":false}],
    ['마로안 산나딘', 'ST', 75, '바스크 아슬레', '모로코', {"squad":true,"unreleased":false}],
    ['니코 세라논', 'RW', 72, '바스크 아슬레', '스페인', {"squad":true,"unreleased":false}],
    ['로베르트 나바론', 'LW', 73, '바스크 아슬레', '스페인', {"squad":true,"unreleased":false}],
    ['베냐트 헤레나바레노', 'CM', 69, '바스크 아슬레', '스페인', {"squad":true,"unreleased":false}],
    ['알바로 자론', 'RW', 75, '바스크 아슬레', '기니비사우', {"squad":true,"unreleased":false}],
    ['페이오 카날레노', 'CAM', 72, '바스크 아슬레', '스페인', {"squad":true,"unreleased":false}],
    ['요아네코 루이잔', 'RB', 68, '바스크 아슬레', '프랑스', {"squad":true,"unreleased":false}],
    ['오베드 바르가노', 'CDM', 72, '마드리드 로히', '멕시코', {"squad":true,"unreleased":false}],
    ['로드리고 멘도산', 'CM', 73, '마드리드 로히', '스페인', {"squad":true,"unreleased":false}],
    ['아르나우 오르티노', 'CM', 70, '마드리드 로히', '스페인', {"squad":true,"unreleased":false}],
    ['제라르드 마르티노', 'LB', 75, '카탈루냐 블라우', '스페인', {"squad":true,"unreleased":false}],
    ['루니 바르그진', 'RW', 75, '카탈루냐 블라우', '스웨덴', {"squad":true,"unreleased":false}],
    ['마르크 베르낼', 'CDM', 72, '카탈루냐 블라우', '스페인', {"squad":true,"unreleased":false}],
    ['마르코스 알론사', 'LB', 74, '비고 셀레스테', '스페인', {"squad":true,"unreleased":false}],
    ['압둘라예 파옌', 'CB', 72, '비고 셀레스테', '세네갈', {"squad":true,"unreleased":false}],
    ['세르히오 카레이로', 'RB', 74, '비고 셀레스테', '스페인', {"squad":true,"unreleased":false}],
    ['일라시 모리반', 'CDM', 74, '비고 셀레스테', '기니', {"squad":true,"unreleased":false}],
    ['미겔 로마르', 'CM', 73, '비고 셀레스테', '스페인', {"squad":true,"unreleased":false}],
    ['파블로 두란드', 'ST', 73, '비고 셀레스테', '스페인', {"squad":true,"unreleased":false}],
    ['이오누츠 라둔', 'GK', 74, '비고 셀레스테', '루마니아', {"squad":true,"unreleased":false}],
    ['알레익스 페바노', 'CM', 73, '비고 셀레스테', '스페인', {"squad":true,"unreleased":false}],
    ['알바로 누녜노', 'RB', 73, '비고 셀레스테', '스페인', {"squad":true,"unreleased":false}],
    ['우고 곤살레노', 'RW', 70, '비고 셀레스테', '스페인', {"squad":true,"unreleased":false}],
    ['하비 루에단', 'RB', 72, '비고 셀레스테', '스페인', {"squad":true,"unreleased":false}],
    ['요엘 라곤', 'CB', 69, '비고 셀레스테', '스페인', {"squad":true,"unreleased":false}],
    ['윌리오트 스베드베린', 'LW', 75, '비고 셀레스테', '스웨덴', {"squad":true,"unreleased":false}],
    ['하비 로드리게노', 'CB', 68, '비고 셀레스테', '스페인', {"squad":true,"unreleased":false}],
    ['우고 알바레노', 'RW', 74, '비고 셀레스테', '스페인', {"squad":true,"unreleased":false}],
    ['쿠하입 드리우에신', 'LW', 73, '비고 셀레스테', '모로코', {"squad":true,"unreleased":false}],
    ['이반 비야른', 'GK', 73, '비고 셀레스테', '스페인', {"squad":true,"unreleased":false}],
    ['헤르만 파레뇬', 'GK', 73, '코루냐 블랑키아술', '스페인', {"squad":true,"unreleased":false}],
    ['아드리아 알티미로', 'RB', 70, '코루냐 블랑키아술', '스페인', {"squad":true,"unreleased":false}],
    ['아르나우 코마노', 'CB', 72, '코루냐 블랑키아술', '스페인', {"squad":true,"unreleased":false}],
    ['루카스 누빈', 'CB', 70, '코루냐 블랑키아술', '벨기에', {"squad":true,"unreleased":false}],
    ['다니 바르시안', 'CB', 71, '코루냐 블랑키아술', '스페인', {"squad":true,"unreleased":false}],
    ['피에르에메릭 오바메얀드', 'ST', 75, '코루냐 블랑키아술', '가봉', {"squad":true,"unreleased":false}],
    ['디에고 비야레노', 'CM', 72, '코루냐 블랑키아술', '스페인', {"squad":true,"unreleased":false}],
    ['자카리아 에다추린', 'ST', 73, '코루냐 블랑키아술', '네덜란드', {"squad":true,"unreleased":false}],
    ['다비드 메얀', 'RW', 73, '코루냐 블랑키아술', '스페인', {"squad":true,"unreleased":false}],
    ['자코모 콸리아토', 'LB', 70, '코루냐 블랑키아술', '이탈리아', {"squad":true,"unreleased":false}],
    ['레오 로마르', 'GK', 71, '코루냐 블랑키아술', '스페인', {"squad":true,"unreleased":false}],
    ['리키 로드리게노', 'CM', 70, '코루냐 블랑키아술', '스페인', {"squad":true,"unreleased":false}],
    ['미겔 로우레이론', 'CB', 70, '코루냐 블랑키아술', '스페인', {"squad":true,"unreleased":false}],
    ['로렌초 아마투친', 'CM', 70, '코루냐 블랑키아술', '이탈리아', {"squad":true,"unreleased":false}],
    ['요나탄 아스프 옌슨', 'CM', 68, '코루냐 블랑키아술', '덴마크', {"squad":true,"unreleased":false}],
    ['루이스미 크루손', 'LW', 71, '코루냐 블랑키아술', '스페인', {"squad":true,"unreleased":false}],
    ['마리오 소리아논', 'CAM', 71, '코루냐 블랑키아술', '스페인', {"squad":true,"unreleased":false}],
    ['시모 나바론', 'RB', 68, '코루냐 블랑키아술', '스페인', {"squad":true,"unreleased":false}],
    ['아다마 트라오렌', 'RW', 75, '코루냐 블랑키아술', '스페인', {"squad":true,"unreleased":false}],
    ['알바로 페르난데노', 'GK', 70, '코루냐 블랑키아술', '스페인', {"squad":true,"unreleased":false}],
    ['마티아스 디투론', 'GK', 72, '엘체 프란히베르데', '아르헨티나', {"squad":true,"unreleased":false}],
    ['부바 상가렌', 'RB', 72, '엘체 프란히베르데', '스페인', {"squad":true,"unreleased":false}],
    ['밤보 디아빈', 'CB', 71, '엘체 프란히베르데', '스페인', {"squad":true,"unreleased":false}],
    ['페데리코 레돈두', 'CDM', 75, '엘체 프란히베르데', '아르헨티나', {"squad":true,"unreleased":false}],
    ['페드로 비가노', 'LB', 71, '엘체 프란히베르데', '스페인', {"squad":true,"unreleased":false}],
    ['야고 산티아곤', 'RW', 70, '엘체 프란히베르데', '스페인', {"squad":true,"unreleased":false}],
    ['마르크 아과돈', 'CM', 72, '엘체 프란히베르데', '스페인', {"squad":true,"unreleased":false}],
    ['에세키엘 폰센', 'ST', 74, '엘체 프란히베르데', '아르헨티나', {"squad":true,"unreleased":false}],
    ['헤르만 발레란', 'LW', 70, '엘체 프란히베르데', '스페인', {"squad":true,"unreleased":false}],
    ['곤살로 비야른', 'CM', 73, '엘체 프란히베르데', '스페인', {"squad":true,"unreleased":false}],
    ['페르 니논', 'ST', 72, '엘체 프란히베르데', '스페인', {"squad":true,"unreleased":false}],
    ['마르팀 네툰', 'CM', 71, '엘체 프란히베르데', '포르투갈', {"squad":true,"unreleased":false}],
    ['호사르', 'RM', 71, '엘체 프란히베르데', '스페인', {"squad":true,"unreleased":false}],
    ['그레이디 디앙가노', 'LW', 73, '엘체 프란히베르데', '콩고민주공화국', {"squad":true,"unreleased":false}],
    ['테테 모렌토', 'RW', 73, '엘체 프란히베르데', '스페인', {"squad":true,"unreleased":false}],
    ['루카스 세페단', 'LW', 73, '엘체 프란히베르데', '칠레', {"squad":true,"unreleased":false}],
    ['빅토르 추스타', 'CB', 72, '엘체 프란히베르데', '스페인', {"squad":true,"unreleased":false}],
    ['아비엘 오소리온', 'ST', 69, '엘체 프란히베르데', '아르헨티나', {"squad":true,"unreleased":false}],
    ['마티야 바르지츠', 'CB', 68, '엘체 프란히베르데', '크로아티아', {"squad":true,"unreleased":false}],
    ['앙헬 포르투뇬', 'GK', 72, '에스파뇰 페리케', '스페인', {"squad":true,"unreleased":false}],
    ['안도니 고로사벨라', 'RB', 73, '에스파뇰 페리케', '스페인', {"squad":true,"unreleased":false}],
    ['킬린츠키 하르트마르', 'LB', 74, '에스파뇰 페리케', '네덜란드', {"squad":true,"unreleased":false}],
    ['우르코 곤살레스 데 사라텐', 'CDM', 73, '에스파뇰 페리케', '스페인', {"squad":true,"unreleased":false}],
    ['클레멘스 리델라', 'CB', 72, '에스파뇰 페리케', '독일', {"squad":true,"unreleased":false}],
    ['레안드로 카브레란', 'CB', 74, '에스파뇰 페리케', '우루과이', {"squad":true,"unreleased":false}],
    ['에두 엑스포시톤', 'CM', 74, '에스파뇰 페리케', '스페인', {"squad":true,"unreleased":false}],
    ['로베르토 페르난데노', 'ST', 73, '에스파뇰 페리케', '스페인', {"squad":true,"unreleased":false}],
    ['폴 로사논', 'CM', 73, '에스파뇰 페리케', '스페인', {"squad":true,"unreleased":false}],
    ['페레 미얀', 'ST', 71, '에스파뇰 페리케', '스페인', {"squad":true,"unreleased":false}],
    ['마르코 드미트로비츠', 'GK', 75, '에스파뇰 페리케', '세르비아', {"squad":true,"unreleased":false}],
    ['우나이 누녜노', 'CB', 73, '에스파뇰 페리케', '스페인', {"squad":true,"unreleased":false}],
    ['브라이안 사라고산', 'LW', 75, '에스파뇰 페리케', '스페인', {"squad":true,"unreleased":false}],
    ['반야 드르쿠시츠', 'CB', 72, '에스파뇰 페리케', '슬로베니아', {"squad":true,"unreleased":false}],
    ['호프레 카레라노', 'RW', 71, '에스파뇰 페리케', '스페인', {"squad":true,"unreleased":false}],
    ['마르코스 페르난데스코', 'LW', 69, '에스파뇰 페리케', '스페인', {"squad":true,"unreleased":false}],
    ['키케 가르시안', 'ST', 71, '에스파뇰 페리케', '스페인', {"squad":true,"unreleased":false}],
    ['가브리엘 모스카르돈', 'CDM', 73, '에스파뇰 페리케', '브라질', {"squad":true,"unreleased":false}],
    ['로제르 이노혼', 'RB', 68, '에스파뇰 페리케', '스페인', {"squad":true,"unreleased":false}],
    ['알렉스 칼라트라반', 'CM', 69, '에스파뇰 페리케', '스페인', {"squad":true,"unreleased":false}],
    ['오마르 엘 힐랄린', 'RB', 75, '에스파뇰 페리케', '모로코', {"squad":true,"unreleased":false}],
    ['티리스 돌란드', 'RW', 72, '에스파뇰 페리케', '잉글랜드', {"squad":true,"unreleased":false}],
    ['이르지 레타첸', 'GK', 72, '헤타페 아술', '체코', {"squad":true,"unreleased":false}],
    ['다코남 제넨', 'CB', 74, '헤타페 아술', '토고', {"squad":true,"unreleased":false}],
    ['다빈친', 'LB', 70, '헤타페 아술', '스페인', {"squad":true,"unreleased":false}],
    ['사바 사조노비', 'CB', 73, '헤타페 아술', '조지아', {"squad":true,"unreleased":false}],
    ['압델 압카른', 'CB', 73, '헤타페 아술', '모로코', {"squad":true,"unreleased":false}],
    ['마리오 마르티노', 'CM', 71, '헤타페 아술', '스페인', {"squad":true,"unreleased":false}],
    ['후안미르', 'LW', 74, '헤타페 아술', '스페인', {"squad":true,"unreleased":false}],
    ['네마냐 구델라', 'CDM', 75, '헤타페 아술', '세르비아', {"squad":true,"unreleased":false}],
    ['마르틴 사트리아논', 'ST', 74, '헤타페 아술', '우루과이', {"squad":true,"unreleased":false}],
    ['라몬 테라친', 'CM', 72, '헤타페 아술', '스페인', {"squad":true,"unreleased":false}],
    ['다비드 소리안', 'GK', 75, '헤타페 아술', '스페인', {"squad":true,"unreleased":false}],
    ['세바스티안 보셀린', 'CB', 70, '헤타페 아술', '우루과이', {"squad":true,"unreleased":false}],
    ['프란초 세라논', 'CM', 72, '헤타페 아술', '스페인', {"squad":true,"unreleased":false}],
    ['키코 페메니안', 'RB', 71, '헤타페 아술', '스페인', {"squad":true,"unreleased":false}],
    ['에네스 위날라', 'ST', 74, '헤타페 아술', '튀르키예', {"squad":true,"unreleased":false}],
    ['안드레스 가르시안', 'RB', 72, '헤타페 아술', '스페인', {"squad":true,"unreleased":false}],
    ['요한 모히칸', 'LB', 72, '헤타페 아술', '콜롬비아', {"squad":true,"unreleased":false}],
    ['오렐 망갈란', 'CM', 75, '헤타페 아술', '벨기에', {"squad":true,"unreleased":false}],
    ['사이드 로메론', 'CB', 71, '헤타페 아술', '아르헨티나', {"squad":true,"unreleased":false}],
    ['파블로 캄포노', 'GK', 70, '레반테 그라노타', '스페인', {"squad":true,"unreleased":false}],
    ['아이사 만딘', 'CB', 74, '레반테 그라노타', '알제리', {"squad":true,"unreleased":false}],
    ['아드리안 델란', 'CB', 71, '레반테 그라노타', '스페인', {"squad":true,"unreleased":false}],
    ['우고 소텔론', 'CM', 71, '레반테 그라노타', '스페인', {"squad":true,"unreleased":false}],
    ['다니 레케난', 'CM', 70, '레반테 그라노타', '스페인', {"squad":true,"unreleased":false}],
    ['로제르 브루겐', 'LW', 72, '레반테 그라노타', '스페인', {"squad":true,"unreleased":false}],
    ['욘 안데르 올라사가스틴', 'CDM', 71, '레반테 그라노타', '스페인', {"squad":true,"unreleased":false}],
    ['이반 로메로스', 'ST', 72, '레반테 그라노타', '스페인', {"squad":true,"unreleased":false}],
    ['매슈 라이어드', 'GK', 73, '레반테 그라노타', '호주', {"squad":true,"unreleased":false}],
    ['호르헤 카베욘', 'RB', 68, '레반테 그라노타', '스페인', {"squad":true,"unreleased":false}],
    ['빅토르 가르시안', 'RB', 70, '레반테 그라노타', '스페인', {"squad":true,"unreleased":false}],
    ['엔조 바르델린', 'CM', 72, '레반테 그라노타', '프랑스', {"squad":true,"unreleased":false}],
    ['오리올 레인', 'CDM', 70, '레반테 그라노타', '스페인', {"squad":true,"unreleased":false}],
    ['카를 에타 에욘', 'ST', 75, '레반테 그라노타', '카메룬', {"squad":true,"unreleased":false}],
    ['예레미 톨리안드', 'RB', 72, '레반테 그라노타', '독일', {"squad":true,"unreleased":false}],
    ['마누 산체노', 'LB', 71, '레반테 그라노타', '스페인', {"squad":true,"unreleased":false}],
    ['티아고 페르난데노', 'CAM', 70, '레반테 그라노타', '아르헨티나', {"squad":true,"unreleased":false}],
    ['알폰소 에레론', 'GK', 72, '말라가 보케론', '스페인', {"squad":true,"unreleased":false}],
    ['옌스 카유스텐', 'CM', 74, '말라가 보케론', '스웨덴', {"squad":true,"unreleased":false}],
    ['카를로스 푸간', 'RB', 69, '말라가 보케론', '스페인', {"squad":true,"unreleased":false}],
    ['에이나르 갈릴레안', 'CB', 70, '말라가 보케론', '스페인', {"squad":true,"unreleased":false}],
    ['알렉스 파스토른', 'CB', 70, '말라가 보케론', '스페인', {"squad":true,"unreleased":false}],
    ['라모른', 'CDM', 70, '말라가 보케론', '스페인', {"squad":true,"unreleased":false}],
    ['하이타름', 'RW', 70, '말라가 보케론', '모로코', {"squad":true,"unreleased":false}],
    ['카를로스 도토른', 'CM', 71, '말라가 보케론', '스페인', {"squad":true,"unreleased":false}],
    ['추페텐', 'ST', 69, '말라가 보케론', '스페인', {"squad":true,"unreleased":false}],
    ['다비드 라루비안', 'CAM', 72, '말라가 보케론', '스페인', {"squad":true,"unreleased":false}],
    ['호아킨 무뇨노', 'LW', 70, '말라가 보케론', '스페인', {"squad":true,"unreleased":false}],
    ['호세 살리나노', 'LB', 68, '말라가 보케론', '스페인', {"squad":true,"unreleased":false}],
    ['라파르', 'CM', 68, '말라가 보케론', '스페인', {"squad":true,"unreleased":false}],
    ['디에고 무리욘', 'CB', 68, '말라가 보케론', '스페인', {"squad":true,"unreleased":false}],
    ['에네코 하우레긴', 'ST', 70, '말라가 보케론', '스페인', {"squad":true,"unreleased":false}],
    ['파블로 마르티네산', 'CM', 69, '말라가 보케론', '스페인', {"squad":true,"unreleased":false}],
    ['후안 크루손', 'LW', 70, '말라가 보케론', '스페인', {"squad":true,"unreleased":false}],
    ['페르난도 칼레론', 'CB', 72, '말라가 보케론', '스페인', {"squad":true,"unreleased":false}],
    ['아드리안 니뇬', 'ST', 69, '말라가 보케론', '스페인', {"squad":true,"unreleased":false}],
    ['다니 로렌손', 'CAM', 71, '말라가 보케론', '스페인', {"squad":true,"unreleased":false}],
    ['훌렌 로베텐', 'LW', 69, '말라가 보케론', '스페인', {"squad":true,"unreleased":false}],
    ['후안 베로칼라', 'CB', 69, '말라가 보케론', '스페인', {"squad":true,"unreleased":false}],
    ['아담 아즈눈', 'LB', 69, '말라가 보케론', '모로코', {"squad":true,"unreleased":false}],
    ['세르히오 에레란', 'GK', 75, '오사수나 로하', '스페인', {"squad":true,"unreleased":false}],
    ['호르헤 에란돈', 'CB', 73, '오사수나 로하', '스페인', {"squad":true,"unreleased":false}],
    ['루카스 토론', 'CDM', 73, '오사수나 로하', '스페인', {"squad":true,"unreleased":false}],
    ['이케르 무뇨노', 'CM', 71, '오사수나 로하', '스페인', {"squad":true,"unreleased":false}],
    ['라울 가르시안', 'ST', 72, '오사수나 로하', '스페인', {"squad":true,"unreleased":false}],
    ['키케 바르한', 'LW', 73, '오사수나 로하', '스페인', {"squad":true,"unreleased":false}],
    ['아이토르 페르난데노', 'GK', 73, '오사수나 로하', '스페인', {"squad":true,"unreleased":false}],
    ['루벤 가르시안', 'RW', 73, '오사수나 로하', '스페인', {"squad":true,"unreleased":false}],
    ['디에고 리콘', 'LB', 73, '오사수나 로하', '스페인', {"squad":true,"unreleased":false}],
    ['모이 고메노', 'CAM', 73, '오사수나 로하', '스페인', {"squad":true,"unreleased":false}],
    ['라울 모론', 'LW', 72, '오사수나 로하', '스페인', {"squad":true,"unreleased":false}],
    ['발랑탱 로지엔', 'RB', 72, '오사수나 로하', '프랑스', {"squad":true,"unreleased":false}],
    ['조너선 두바생드', 'CM', 71, '오사수나 로하', '벨기에', {"squad":true,"unreleased":false}],
    ['엔조 보요몬', 'CB', 74, '오사수나 로하', '카메룬', {"squad":true,"unreleased":false}],
    ['아벨 브레토네노', 'LB', 71, '오사수나 로하', '스페인', {"squad":true,"unreleased":false}],
    ['알레한드로 카테난', 'CB', 72, '오사수나 로하', '스페인', {"squad":true,"unreleased":false}],
    ['시몬 에릭슨드', 'GK', 68, '산탄데르 베르디블랑', '스웨덴', {"squad":true,"unreleased":false}],
    ['알바로 만티얀', 'RB', 71, '산탄데르 베르디블랑', '스페인', {"squad":true,"unreleased":false}],
    ['아론 마르티노', 'LB', 72, '산탄데르 베르디블랑', '스페인', {"squad":true,"unreleased":false}],
    ['마누 에르난돈', 'CB', 71, '산탄데르 베르디블랑', '스페인', {"squad":true,"unreleased":false}],
    ['파블로 라모른', 'CB', 71, '산탄데르 베르디블랑', '스페인', {"squad":true,"unreleased":false}],
    ['이니고 사인스마산', 'CDM', 72, '산탄데르 베르디블랑', '스페인', {"squad":true,"unreleased":false}],
    ['기오르기 굴리아시빌린', 'RW', 70, '산탄데르 베르디블랑', '조지아', {"squad":true,"unreleased":false}],
    ['안드레 알메이단', 'CM', 72, '산탄데르 베르디블랑', '포르투갈', {"squad":true,"unreleased":false}],
    ['후안 카를로스 아라난', 'ST', 71, '산탄데르 베르디블랑', '스페인', {"squad":true,"unreleased":false}],
    ['이니고 비센텐', 'CAM', 75, '산탄데르 베르디블랑', '스페인', {"squad":true,"unreleased":false}],
    ['안드레스 마르티노', 'RW', 73, '산탄데르 베르디블랑', '스페인', {"squad":true,"unreleased":false}],
    ['아시에르 비야리브렌', 'ST', 71, '산탄데르 베르디블랑', '스페인', {"squad":true,"unreleased":false}],
    ['훌렌 아기레사발란', 'GK', 73, '산탄데르 베르디블랑', '스페인', {"squad":true,"unreleased":false}],
    ['마게트 게옌', 'CDM', 69, '산탄데르 베르디블랑', '세네갈', {"squad":true,"unreleased":false}],
    ['파쿤도 곤살레노', 'CB', 71, '산탄데르 베르디블랑', '우루과이', {"squad":true,"unreleased":false}],
    ['마테오 프라틴', 'CM', 71, '산탄데르 베르디블랑', '이탈리아', {"squad":true,"unreleased":false}],
    ['야시르 자비린', 'ST', 71, '산탄데르 베르디블랑', '모로코', {"squad":true,"unreleased":false}],
    ['페드로 펠리펜', 'CB', 68, '산탄데르 베르디블랑', '브라질', {"squad":true,"unreleased":false}],
    ['이반 마르티노', 'CM', 73, '산탄데르 베르디블랑', '스페인', {"squad":true,"unreleased":false}],
    ['자뉘엘 벨로시안드', 'CB', 72, '산탄데르 베르디블랑', '프랑스', {"squad":true,"unreleased":false}],
    ['다니 카르데나노', 'GK', 73, '라요 프랑코', '스페인', {"squad":true,"unreleased":false}],
    ['마라시 쿰불란', 'CB', 73, '라요 프랑코', '알바니아', {"squad":true,"unreleased":false}],
    ['페드로 디아노', 'CM', 72, '라요 프랑코', '스페인', {"squad":true,"unreleased":false}],
    ['루이스 펠리펜', 'CB', 75, '라요 프랑코', '이탈리아', {"squad":true,"unreleased":false}],
    ['파테 시손', 'CDM', 74, '라요 프랑코', '세네갈', {"squad":true,"unreleased":false}],
    ['우나이 로페노', 'CM', 73, '라요 프랑코', '스페인', {"squad":true,"unreleased":false}],
    ['알레망드', 'ST', 72, '라요 프랑코', '브라질', {"squad":true,"unreleased":false}],
    ['세르히오 카메욘', 'ST', 75, '라요 프랑코', '스페인', {"squad":true,"unreleased":false}],
    ['랜디 은테칸', 'LW', 72, '라요 프랑코', '앙골라', {"squad":true,"unreleased":false}],
    ['아우구스토 바탈란', 'GK', 73, '라요 프랑코', '아르헨티나', {"squad":true,"unreleased":false}],
    ['기오르기 치타이시빌린', 'CAM', 71, '라요 프랑코', '조지아', {"squad":true,"unreleased":false}],
    ['아드리아 페드로산', 'LB', 73, '라요 프랑코', '스페인', {"squad":true,"unreleased":false}],
    ['알바로 가르시안', 'LW', 75, '라요 프랑코', '스페인', {"squad":true,"unreleased":false}],
    ['이반 발리운', 'RB', 73, '라요 프랑코', '알바니아', {"squad":true,"unreleased":false}],
    ['프란 페레노', 'RW', 71, '라요 프랑코', '스페인', {"squad":true,"unreleased":false}],
    ['펠라요 페르난데노', 'CB', 69, '라요 프랑코', '스페인', {"squad":true,"unreleased":false}],
    ['오스카르 발렌티노', 'CDM', 74, '라요 프랑코', '스페인', {"squad":true,"unreleased":false}],
    ['플로리안 르죄른', 'CB', 73, '라요 프랑코', '프랑스', {"squad":true,"unreleased":false}],
    ['마르크 바르트란', 'CB', 75, '베티스 베르데', '스페인', {"squad":true,"unreleased":false}],
    ['파쿤도 베르날라', 'CDM', 74, '베티스 베르데', '우루과이', {"squad":true,"unreleased":false}],
    ['앙헬 오르티노', 'RB', 69, '베티스 베르데', '스페인', {"squad":true,"unreleased":false}],
    ['디에고 콘덴', 'GK', 73, '베티스 베르데', '스페인', {"squad":true,"unreleased":false}],
    ['이케르 로사단', 'LW', 73, '베티스 베르데', '스페인', {"squad":true,"unreleased":false}],
    ['발렌틴 고메노', 'CB', 75, '베티스 베르데', '아르헨티나', {"squad":true,"unreleased":false}],
    ['주니오르 피르폰', 'LB', 73, '베티스 베르데', '도미니카공화국', {"squad":true,"unreleased":false}],
    ['아이토르 루이발라', 'RW', 74, '베티스 베르데', '스페인', {"squad":true,"unreleased":false}],
    ['카를로스 에스핀', 'ST', 68, '마드리드 블랑코', '스페인', {"squad":true,"unreleased":false}],
    ['얀 디오망덴', 'RW', 72, '마드리드 블랑코', '코트디부아르', {"squad":true,"unreleased":false}],
    ['욘 아람부룬', 'RB', 74, '도노스티 추리우르딘', '베네수엘라', {"squad":true,"unreleased":false}],
    ['아이엔 무뇨노', 'LB', 74, '도노스티 추리우르딘', '스페인', {"squad":true,"unreleased":false}],
    ['욘 고로차테긴', 'CM', 73, '도노스티 추리우르딘', '스페인', {"squad":true,"unreleased":false}],
    ['욘 마르티노', 'CB', 70, '도노스티 추리우르딘', '스페인', {"squad":true,"unreleased":false}],
    ['베냐트 투리엔테노', 'CM', 75, '도노스티 추리우르딘', '스페인', {"squad":true,"unreleased":false}],
    ['우나이 마레론', 'GK', 69, '도노스티 추리우르딘', '스페인', {"squad":true,"unreleased":false}],
    ['파블로 마리노', 'CM', 72, '도노스티 추리우르딘', '스페인', {"squad":true,"unreleased":false}],
    ['마마두 사른', 'CB', 73, '도노스티 추리우르딘', '세네갈', {"squad":true,"unreleased":false}],
    ['알바로 오드리오솔란', 'RB', 74, '도노스티 추리우르딘', '스페인', {"squad":true,"unreleased":false}],
    ['엑토르 포르타', 'RB', 73, '도노스티 추리우르딘', '스페인', {"squad":true,"unreleased":false}],
    ['아르센 자하리안드', 'CAM', 74, '도노스티 추리우르딘', '러시아', {"squad":true,"unreleased":false}],
    ['후안 이글레시아노', 'RB', 73, '세비야 로호', '스페인', {"squad":true,"unreleased":false}],
    ['훌리오 디아노', 'LB', 68, '세비야 로호', '스페인', {"squad":true,"unreleased":false}],
    ['키케 살라노', 'CB', 74, '세비야 로호', '스페인', {"squad":true,"unreleased":false}],
    ['안드레스 카스트리노', 'CB', 69, '세비야 로호', '스페인', {"squad":true,"unreleased":false}],
    ['뤼시앵 아구멘', 'CDM', 75, '세비야 로호', '프랑스', {"squad":true,"unreleased":false}],
    ['알폰 곤살레노', 'LW', 73, '세비야 로호', '스페인', {"squad":true,"unreleased":false}],
    ['기오르기 코초라시빌린', 'CM', 74, '세비야 로호', '조지아', {"squad":true,"unreleased":false}],
    ['페케 페르난데노', 'CAM', 73, '세비야 로호', '스페인', {"squad":true,"unreleased":false}],
    ['아루나 상간텐', 'CB', 72, '세비야 로호', '세네갈', {"squad":true,"unreleased":false}],
    ['프란 곤살레산', 'GK', 68, '세비야 로호', '스페인', {"squad":true,"unreleased":false}],
    ['마누 부에논', 'CM', 72, '세비야 로호', '스페인', {"squad":true,"unreleased":false}],
    ['이사크 로메론', 'ST', 74, '세비야 로호', '스페인', {"squad":true,"unreleased":false}],
    ['욘 구리딘', 'CM', 73, '세비야 로호', '스페인', {"squad":true,"unreleased":false}],
    ['루카스 스타생드', 'ST', 74, '세비야 로호', '벨기에', {"squad":true,"unreleased":false}],
    ['펠릭스 코헤이안', 'RW', 73, '세비야 로호', '포르투갈', {"squad":true,"unreleased":false}],
    ['치데라 에주켄', 'LW', 74, '세비야 로호', '나이지리아', {"squad":true,"unreleased":false}],
    ['호세 앙헬 카르모난', 'RB', 74, '세비야 로호', '스페인', {"squad":true,"unreleased":false}],
    ['마르캉드', 'CB', 74, '세비야 로호', '브라질', {"squad":true,"unreleased":false}],
    ['스톨레 디미트리에프스킨', 'GK', 75, '발렌시아 무르시엘', '북마케도니아', {"squad":true,"unreleased":false}],
    ['호세 코페텐', 'CB', 72, '발렌시아 무르시엘', '스페인', {"squad":true,"unreleased":false}],
    ['무크타르 디아카빈', 'CB', 74, '발렌시아 무르시엘', '기니', {"squad":true,"unreleased":false}],
    ['세사르 타레간', 'CB', 74, '발렌시아 무르시엘', '스페인', {"squad":true,"unreleased":false}],
    ['우마르 사디큰', 'ST', 73, '발렌시아 무르시엘', '나이지리아', {"squad":true,"unreleased":false}],
    ['루이스 리오한', 'LW', 73, '발렌시아 무르시엘', '스페인', {"squad":true,"unreleased":false}],
    ['유스틴 더 하손', 'RB', 70, '발렌시아 무르시엘', '네덜란드', {"squad":true,"unreleased":false}],
    ['크리스티안 리베론', 'GK', 71, '발렌시아 무르시엘', '스페인', {"squad":true,"unreleased":false}],
    ['알리우 디엥그', 'CDM', 72, '발렌시아 무르시엘', '말리', {"squad":true,"unreleased":false}],
    ['디에고 로페노', 'RW', 74, '발렌시아 무르시엘', '스페인', {"squad":true,"unreleased":false}],
    ['다니 라반', 'RW', 72, '발렌시아 무르시엘', '스페인', {"squad":true,"unreleased":false}],
    ['디미트리 풀키엔', 'RB', 71, '발렌시아 무르시엘', '과들루프', {"squad":true,"unreleased":false}],
    ['헤수스 바스케노', 'LB', 72, '발렌시아 무르시엘', '스페인', {"squad":true,"unreleased":false}],
    ['아르나우 마르티네노', 'RB', 73, '발렌시아 무르시엘', '스페인', {"squad":true,"unreleased":false}],
    ['필리프 우그리니츠', 'CM', 74, '발렌시아 무르시엘', '스위스', {"squad":true,"unreleased":false}],
    ['파블로 마페온', 'CB', 73, '발렌시아 무르시엘', '아르헨티나', {"squad":true,"unreleased":false}],
    ['사토 류노스켄', 'CAM', 69, '발렌시아 무르시엘', '일본', {"squad":true,"unreleased":false}],
    ['알렉스 프리먼드', 'RB', 72, '비야레 수브마리노', '미국', {"squad":true,"unreleased":false}],
    ['알라산 디아탄', 'CDM', 71, '비야레 수브마리노', '세네갈', {"squad":true,"unreleased":false}],
    ['파우 나바론', 'CB', 72, '비야레 수브마리노', '스페인', {"squad":true,"unreleased":false}],
    ['일리아스 아코마친', 'RW', 75, '비야레 수브마리노', '모로코', {"squad":true,"unreleased":false}],
    ['루벤 고메노', 'GK', 68, '비야레 수브마리노', '스페인', {"squad":true,"unreleased":false}],
    ['산티아고 모우리뇬', 'CB', 74, '비야레 수브마리노', '우루과이', {"squad":true,"unreleased":false}],
    ['타종 뷰캐넌드', 'RW', 75, '비야레 수브마리노', '캐나다', {"squad":true,"unreleased":false}],
    ['카를로스 로메론', 'LB', 74, '비야레 수브마리노', '스페인', {"squad":true,"unreleased":false}],
    ['타니 올루와세인', 'ST', 74, '비야레 수브마리노', '캐나다', {"squad":true,"unreleased":false}],
    ['세르지 카르도난', 'LB', 74, '비야레 수브마리노', '스페인', {"squad":true,"unreleased":false}],
    ['네이선 살리반', 'CM', 69, '비야레 수브마리노', '캐나다', {"squad":true,"unreleased":false}],
    ['안토니 로페손', 'GK', 74, '앙제 SCO', '포르투갈', {"squad":true,"unreleased":false}],
    ['카를랑스 아르퀴손', 'RB', 68, '앙제 SCO', '아이티', {"squad":true,"unreleased":false}],
    ['우스만 카마란', 'CB', 69, '앙제 SCO', '말리', {"squad":true,"unreleased":false}],
    ['루이 무통드', 'CM', 70, '앙제 SCO', '프랑스', {"squad":true,"unreleased":false}],
    ['우스만 심바콜린', 'ST', 69, '앙제 SCO', '중앙아프리카공화국', {"squad":true,"unreleased":false}],
    ['브랑코 판덴보므', 'CAM', 72, '앙제 SCO', '네덜란드', {"squad":true,"unreleased":false}],
    ['아민 스바인', 'LW', 70, '앙제 SCO', '모로코', {"squad":true,"unreleased":false}],
    ['야신 벨크디므', 'CM', 69, '앙제 SCO', '모로코', {"squad":true,"unreleased":false}],
    ['조제프 칼룰룬', 'RB', 68, '앙제 SCO', '프랑스', {"squad":true,"unreleased":false}],
    ['짐 알레비난', 'RW', 69, '앙제 SCO', '가봉', {"squad":true,"unreleased":false}],
    ['아민 엘와자닌', 'ST', 69, '앙제 SCO', '모로코', {"squad":true,"unreleased":false}],
    ['조르당 르포른', 'LB', 68, '앙제 SCO', '모리타니', {"squad":true,"unreleased":false}],
    ['릴리앙 라올리소안', 'CB', 68, '앙제 SCO', '프랑스', {"squad":true,"unreleased":false}],
    ['아리스 벨케블란', 'CDM', 70, '앙제 SCO', '알제리', {"squad":true,"unreleased":false}],
    ['폴 나르딘', 'GK', 71, '오세르 부르고', '프랑스', {"squad":true,"unreleased":false}],
    ['레미 라보 라스카린', 'LW', 69, '오세르 부르고', '과들루프', {"squad":true,"unreleased":false}],
    ['악셀 투안제벤', 'CB', 70, '오세르 부르고', '콩고민주공화국', {"squad":true,"unreleased":false}],
    ['케뱅 다누안', 'CM', 69, '오세르 부르고', '프랑스', {"squad":true,"unreleased":false}],
    ['조쉬에 카시미른', 'RW', 68, '오세르 부르고', '아이티', {"squad":true,"unreleased":false}],
    ['나우이루 아하마단', 'CDM', 71, '오세르 부르고', '프랑스', {"squad":true,"unreleased":false}],
    ['캐머런 아처스', 'ST', 72, '오세르 부르고', '잉글랜드', {"squad":true,"unreleased":false}],
    ['대니 나마손', 'ST', 69, '오세르 부르고', '카메룬', {"squad":true,"unreleased":false}],
    ['에로스 마딘', 'LW', 68, '오세르 부르고', '네덜란드', {"squad":true,"unreleased":false}],
    ['피에르 에크완', 'CM', 71, '오세르 부르고', '프랑스', {"squad":true,"unreleased":false}],
    ['아산 디우센', 'CDM', 69, '오세르 부르고', '세네갈', {"squad":true,"unreleased":false}],
    ['시날리 디오망덴', 'CB', 71, '오세르 부르고', '코트디부아르', {"squad":true,"unreleased":false}],
    ['라소 쿨리발린', 'CM', 68, '오세르 부르고', '코트디부아르', {"squad":true,"unreleased":false}],
    ['프레드리크 오페고른', 'LB', 69, '오세르 부르고', '노르웨이', {"squad":true,"unreleased":false}],
    ['브라이언 오콘', 'CB', 68, '오세르 부르고', '스위스', {"squad":true,"unreleased":false}],
    ['로맹 파이브른', 'CAM', 72, '오세르 부르고', '프랑스', {"squad":true,"unreleased":false}],
    ['마르뱅 세나얀', 'RB', 68, '오세르 부르고', '가나', {"squad":true,"unreleased":false}],
    ['에길 셀비큰', 'GK', 70, '브레스트 피라트', '노르웨이', {"squad":true,"unreleased":false}],
    ['브래들리 로콘', 'LB', 72, '브레스트 피라트', '프랑스', {"squad":true,"unreleased":false}],
    ['고티에 요리손', 'CB', 70, '브레스트 피라트', '프랑스', {"squad":true,"unreleased":false}],
    ['브렌당 샤르도넨', 'CB', 72, '브레스트 피라트', '프랑스', {"squad":true,"unreleased":false}],
    ['마마디 디암분', 'CDM', 69, '브레스트 피라트', '말리', {"squad":true,"unreleased":false}],
    ['조제프 농젠', 'CM', 69, '브레스트 피라트', '벨기에', {"squad":true,"unreleased":false}],
    ['위고 마녜틴', 'CM', 71, '브레스트 피라트', '프랑스', {"squad":true,"unreleased":false}],
    ['파테 음부픈', 'ST', 69, '브레스트 피라트', '세네갈', {"squad":true,"unreleased":false}],
    ['조바니 베르시닌', 'CAM', 68, '브레스트 피라트', '프랑스', {"squad":true,"unreleased":false}],
    ['악셀 캉블랑드', 'LW', 70, '브레스트 피라트', '프랑스', {"squad":true,"unreleased":false}],
    ['조리스 쇼타른', 'CM', 71, '브레스트 피라트', '프랑스', {"squad":true,"unreleased":false}],
    ['마마 발덴', 'LW', 69, '브레스트 피라트', '기니비사우', {"squad":true,"unreleased":false}],
    ['뤼도비크 아조르큰', 'ST', 73, '브레스트 피라트', '프랑스', {"squad":true,"unreleased":false}],
    ['카모리 둠비안', 'CAM', 71, '브레스트 피라트', '말리', {"squad":true,"unreleased":false}],
    ['뤼카 투사른', 'CDM', 72, '브레스트 피라트', '프랑스', {"squad":true,"unreleased":false}],
    ['케니 랄란', 'RB', 69, '브레스트 피라트', '프랑스', {"squad":true,"unreleased":false}],
    ['아메드 투반', 'CB', 70, '르아브르 시엘', '알제리', {"squad":true,"unreleased":false}],
    ['쥐니오르 음완간', 'CDM', 70, '르아브르 시엘', '프랑스', {"squad":true,"unreleased":false}],
    ['아미르 리샤르송드', 'CM', 71, '르아브르 시엘', '모로코', {"squad":true,"unreleased":false}],
    ['조시 마잔', 'ST', 71, '르아브르 시엘', '나이지리아', {"squad":true,"unreleased":false}],
    ['펠릭스 맘빔빈', 'CAM', 69, '르아브르 시엘', '스위스', {"squad":true,"unreleased":false}],
    ['고드송 키에레멘', 'LW', 69, '르아브르 시엘', '프랑스', {"squad":true,"unreleased":false}],
    ['엘리아스 옐레르튼', 'RB', 71, '르아브르 시엘', '덴마크', {"squad":true,"unreleased":false}],
    ['포데 두쿠렌', 'CB', 68, '르아브르 시엘', '말리', {"squad":true,"unreleased":false}],
    ['라술 은디아옌', 'CM', 69, '르아브르 시엘', '세네갈', {"squad":true,"unreleased":false}],
    ['세코 아유문', 'CB', 70, '르아브르 시엘', '일본', {"squad":true,"unreleased":false}],
    ['미즈타 가이톤', 'CM', 69, '르아브르 시엘', '일본', {"squad":true,"unreleased":false}],
    ['야니스 주아윈', 'LB', 68, '르아브르 시엘', '프랑스', {"squad":true,"unreleased":false}],
    ['뱅상 사손', 'CB', 68, '르아브르 시엘', '프랑스', {"squad":true,"unreleased":false}],
    ['음브와나 사마탄', 'ST', 69, '르아브르 시엘', '탄자니아', {"squad":true,"unreleased":false}],
    ['나카무라 소탄', 'ST', 68, '르아브르 시엘', '일본', {"squad":true,"unreleased":false}],
    ['티모테 펨벨렌', 'RB', 70, '르아브르 시엘', '프랑스', {"squad":true,"unreleased":false}],
    ['리오넬 음파신', 'GK', 70, '르아브르 시엘', '콩고민주공화국', {"squad":true,"unreleased":false}],
    ['고티에 갈롱드', 'GK', 69, '르아브르 시엘', '프랑스', {"squad":true,"unreleased":false}],
    ['빌랄 브라히민', 'RW', 70, '르망 시르퀴', '알제리', {"squad":true,"unreleased":false}],
    ['루이 마푸탄', 'ST', 68, '르망 시르퀴', '중앙아프리카공화국', {"squad":true,"unreleased":false}],
    ['지브릴 시디벤', 'RB', 68, '르망 시르퀴', '프랑스', {"squad":true,"unreleased":false}],
    ['레지스 귀르트네른', 'GK', 72, '랑스 상글리에', '프랑스', {"squad":true,"unreleased":false}],
    ['뤼방 아길라른', 'RB', 72, '랑스 상글리에', '프랑스', {"squad":true,"unreleased":false}],
    ['마이크 나브로츠킨', 'CB', 73, '랑스 상글리에', '폴란드', {"squad":true,"unreleased":false}],
    ['삼손 바이돈', 'CB', 72, '랑스 상글리에', '오스트리아', {"squad":true,"unreleased":false}],
    ['플로리앙 소토칸', 'RW', 75, '랑스 상글리에', '프랑스', {"squad":true,"unreleased":false}],
    ['야신 티트라윈', 'CDM', 71, '랑스 상글리에', '알제리', {"squad":true,"unreleased":false}],
    ['토르강 아자른', 'LW', 74, '랑스 상글리에', '벨기에', {"squad":true,"unreleased":false}],
    ['오종 에두아른', 'ST', 75, '랑스 상글리에', '프랑스', {"squad":true,"unreleased":false}],
    ['조아네르 차베손', 'LB', 71, '랑스 상글리에', '에콰도르', {"squad":true,"unreleased":false}],
    ['마티외 위돌라', 'LB', 71, '랑스 상글리에', '프랑스', {"squad":true,"unreleased":false}],
    ['압달라 시만', 'LW', 74, '랑스 상글리에', '세네갈', {"squad":true,"unreleased":false}],
    ['미하우 스코라신', 'RW', 73, '랑스 상글리에', '폴란드', {"squad":true,"unreleased":false}],
    ['사우드 압둘하미든', 'RB', 71, '랑스 상글리에', '사우디아라비아', {"squad":true,"unreleased":false}],
    ['조나탕 그라딘', 'CB', 73, '랑스 상글리에', '프랑스', {"squad":true,"unreleased":false}],
    ['미카엘 퀴상손', 'CM', 72, '랑스 상글리에', '프랑스', {"squad":true,"unreleased":false}],
    ['프란요 이바노비츠', 'ST', 75, '랑스 상글리에', '크로아티아', {"squad":true,"unreleased":false}],
    ['로뱅 리세른', 'GK', 68, '랑스 상글리에', '프랑스', {"squad":true,"unreleased":false}],
    ['나탕 응고인', 'CB', 73, '릴 도그', '벨기에', {"squad":true,"unreleased":false}],
    ['나빌 벤탈레브스', 'CM', 74, '릴 도그', '알제리', {"squad":true,"unreleased":false}],
    ['딜란 바크완', 'RW', 75, '릴 도그', '프랑스', {"squad":true,"unreleased":false}],
    ['에탕 음바펜', 'CAM', 73, '릴 도그', '프랑스', {"squad":true,"unreleased":false}],
    ['하콘 하랄드손드', 'CAM', 75, '릴 도그', '아이슬란드', {"squad":true,"unreleased":false}],
    ['마우리츠 케르고른', 'CM', 74, '릴 도그', '덴마크', {"squad":true,"unreleased":false}],
    ['로맹 페론', 'LB', 74, '릴 도그', '프랑스', {"squad":true,"unreleased":false}],
    ['아르노 보다른', 'GK', 73, '릴 도그', '벨기에', {"squad":true,"unreleased":false}],
    ['응갈라옐 무카운', 'CDM', 74, '릴 도그', '콩고민주공화국', {"squad":true,"unreleased":false}],
    ['우에다 아야센', 'ST', 75, '릴 도그', '일본', {"squad":true,"unreleased":false}],
    ['바샤르 외날라', 'ST', 68, '릴 도그', '튀르키예', {"squad":true,"unreleased":false}],
    ['뱅자맹 앙드렌', 'CDM', 74, '릴 도그', '프랑스', {"squad":true,"unreleased":false}],
    ['티아구 산투손', 'RB', 74, '릴 도그', '포르투갈', {"squad":true,"unreleased":false}],
    ['칼빈 페르동큰', 'LB', 73, '릴 도그', '인도네시아', {"squad":true,"unreleased":false}],
    ['가에탕 페랭드', 'CAM', 71, '릴 도그', '프랑스', {"squad":true,"unreleased":false}],
    ['함자 이가마느', 'ST', 75, '릴 도그', '모로코', {"squad":true,"unreleased":false}],
    ['뱅자맹 르루안', 'GK', 69, '로리앙 메를뤼', '프랑스', {"squad":true,"unreleased":false}],
    ['알렉 조르장드', 'RB', 68, '로리앙 메를뤼', '프랑스', {"squad":true,"unreleased":false}],
    ['몬타사르 탈빈', 'CB', 72, '로리앙 메를뤼', '튀니지', {"squad":true,"unreleased":false}],
    ['포르모즈 멘딘', 'CB', 70, '로리앙 메를뤼', '세네갈', {"squad":true,"unreleased":false}],
    ['방디우구 파디간', 'CM', 69, '로리앙 메를뤼', '프랑스', {"squad":true,"unreleased":false}],
    ['노아 카디운', 'CM', 68, '로리앙 메를뤼', '과들루프', {"squad":true,"unreleased":false}],
    ['모하메드 밤반', 'ST', 70, '로리앙 메를뤼', '코트디부아르', {"squad":true,"unreleased":false}],
    ['이사크 옌센드', 'LW', 70, '로리앙 메를뤼', '덴마크', {"squad":true,"unreleased":false}],
    ['테오 르 브린', 'CAM', 70, '로리앙 메를뤼', '프랑스', {"squad":true,"unreleased":false}],
    ['아이예군 토시느', 'RW', 69, '로리앙 메를뤼', '베냉', {"squad":true,"unreleased":false}],
    ['장빅토르 마켕곤', 'CDM', 71, '로리앙 메를뤼', '프랑스', {"squad":true,"unreleased":false}],
    ['술레이만 파옌', 'LW', 68, '로리앙 메를뤼', '세네갈', {"squad":true,"unreleased":false}],
    ['뎀보 실란', 'RB', 68, '로리앙 메를뤼', '기니', {"squad":true,"unreleased":false}],
    ['빈구루 카마란', 'GK', 70, '로리앙 메를뤼', '세네갈', {"squad":true,"unreleased":false}],
    ['너새니얼 아제인', 'CB', 69, '로리앙 메를뤼', '가나', {"squad":true,"unreleased":false}],
    ['이봉 음보곤', 'GK', 71, '로리앙 메를뤼', '스위스', {"squad":true,"unreleased":false}],
    ['노사 에드워드 오바레티느', 'CB', 70, '로리앙 메를뤼', '이탈리아', {"squad":true,"unreleased":false}],
    ['노아 음밤반', 'CDM', 70, '로리앙 메를뤼', '벨기에', {"squad":true,"unreleased":false}],
    ['파노스 카체리손', 'CM', 69, '로리앙 메를뤼', '그리스', {"squad":true,"unreleased":false}],
    ['이자크 투렌', 'CB', 71, '로리앙 메를뤼', '프랑스', {"squad":true,"unreleased":false}],
  ],
  Legend: [
    ['다리안 보야닉', 'CM', 78, '울산 호랑', '스웨덴', {"squad":true,"unreleased":true}],
    ['마르카노', 'ST', 78, '울산 호랑', '브라질', {"squad":true,"unreleased":true}],
    ['이동겸', 'CAM', 79, '울산 호랑', '대한민국', {"squad":true,"unreleased":true}],
    ['에릭 파리스', 'LW', 77, '울산 호랑', '브라질', {"squad":true,"unreleased":true}],
    ['정승헌', 'CB', 77, '울산 호랑', '대한민국', {"squad":true,"unreleased":true}],
    ['김영궁', 'CB', 80, '울산 호랑', '대한민국', {"squad":true,"unreleased":true}],
    ['박용유', 'CDM', 76, '울산 호랑', '대한민국', {"squad":true,"unreleased":true}],
    ['야고 카리엘', 'ST', 76, '울산 호랑', '브라질', {"squad":true,"unreleased":true}],
    ['세네 라멘츠', 'GK', 79, '맨체스 레즈', '벨기에', {"squad":true,"unreleased":false}],
    ['디오고 달로', 'RB', 80, '맨체스 레즈', '포르투갈', {"squad":true,"unreleased":false}],
    ['누사이르 마즈라우', 'RB', 81, '맨체스 레즈', '모로코', {"squad":true,"unreleased":false}],
    ['해리 맥과이', 'CB', 79, '맨체스 레즈', '잉글랜드', {"squad":true,"unreleased":false}],
    ['메이슨 마운드', 'CM', 79, '맨체스 레즈', '잉글랜드', {"squad":true,"unreleased":false}],
    ['조슈아 지르크', 'ST', 78, '맨체스 레즈', '네덜란드', {"squad":true,"unreleased":false}],
    ['패트릭 도르그', 'LB', 77, '맨체스 레즈', '덴마크', {"squad":true,"unreleased":false}],
    ['레니 요루', 'CB', 80, '맨체스 레즈', '프랑스', {"squad":true,"unreleased":false}],
    ['안드레이 산토', 'CM', 78, '맨체스 레즈', '브라질', {"squad":true,"unreleased":false}],
    ['유리 틸레망', 'CM', 81, '맨체스 레즈', '벨기에', {"squad":true,"unreleased":false}],
    ['카를로스 발레브', 'CDM', 80, '맨체스 레즈', '카메룬', {"squad":true,"unreleased":false}],
    ['루크 쇼어', 'LB', 79, '맨체스 레즈', '잉글랜드', {"squad":true,"unreleased":false}],
    ['마누엘 우가르타', 'CDM', 79, '맨체스 레즈', '우루과이', {"squad":true,"unreleased":false}],
    ['코비 마이노', 'CM', 79, '맨체스 레즈', '잉글랜드', {"squad":true,"unreleased":false}],
    ['케파 아리사발라고', 'GK', 79, '북런던 건너스', '스페인', {"squad":true,"unreleased":false}],
    ['일랑 멜리어', 'GK', 76, '북런던 건너스', '프랑스', {"squad":true,"unreleased":false}],
    ['크리스티안 모스케로', 'CB', 78, '북런던 건너스', '스페인', {"squad":true,"unreleased":false}],
    ['에즈리 콘살', 'CB', 81, '북런던 건너스', '잉글랜드', {"squad":true,"unreleased":false}],
    ['마일스 루이스켈리', 'LB', 79, '북런던 건너스', '잉글랜드', {"squad":true,"unreleased":false}],
    ['흐리스토스 촐리소', 'LW', 79, '북런던 건너스', '그리스', {"squad":true,"unreleased":false}],
    ['노니 마두에코', 'RW', 81, '북런던 건너스', '잉글랜드', {"squad":true,"unreleased":false}],
    ['스즈키 자이언', 'GK', 80, '아스톤 라이온', '일본', {"squad":true,"unreleased":false}],
    ['마르코 비조', 'GK', 76, '아스톤 라이온', '네덜란드', {"squad":true,"unreleased":false}],
    ['매티 캐신', 'RB', 80, '아스톤 라이온', '폴란드', {"squad":true,"unreleased":false}],
    ['빅토르 린델로프', 'CB', 77, '아스톤 라이온', '스웨덴', {"squad":true,"unreleased":false}],
    ['테일러 하우드벨린', 'CB', 78, '아스톤 라이온', '잉글랜드', {"squad":true,"unreleased":false}],
    ['타이론 밍고', 'CB', 79, '아스톤 라이온', '잉글랜드', {"squad":true,"unreleased":false}],
    ['마테오 루제로', 'LB', 78, '아스톤 라이온', '이탈리아', {"squad":true,"unreleased":false}],
    ['이안 마트손', 'LB', 80, '아스톤 라이온', '네덜란드', {"squad":true,"unreleased":false}],
    ['애런 완비사코', 'RB', 79, '아스톤 라이온', '콩고민주공화국', {"squad":true,"unreleased":false}],
    ['로스 바클라', 'CM', 76, '아스톤 라이온', '잉글랜드', {"squad":true,"unreleased":false}],
    ['에밀리아노 부엔디오', 'CAM', 78, '아스톤 라이온', '아르헨티나', {"squad":true,"unreleased":false}],
    ['주앙 고메손', 'CM', 81, '아스톤 라이온', '브라질', {"squad":true,"unreleased":false}],
    ['니콜라 잭손', 'ST', 81, '아스톤 라이온', '세네갈', {"squad":true,"unreleased":false}],
    ['알레한드로 가르나쇼', 'LW', 81, '아스톤 라이온', '아르헨티나', {"squad":true,"unreleased":false}],
    ['태미 에이브러함', 'ST', 77, '아스톤 라이온', '잉글랜드', {"squad":true,"unreleased":false}],
    ['키빈 켈러하', 'GK', 81, '브렌트 벌', '아일랜드', {"squad":true,"unreleased":false}],
    ['애런 히코', 'RB', 77, '브렌트 벌', '스코틀랜드', {"squad":true,"unreleased":false}],
    ['리코 헨로', 'LB', 76, '브렌트 벌', '자메이카', {"squad":true,"unreleased":false}],
    ['세프 판덴베르크', 'CB', 78, '브렌트 벌', '네덜란드', {"squad":true,"unreleased":false}],
    ['크리스토페르 아예로', 'CB', 78, '브렌트 벌', '노르웨이', {"squad":true,"unreleased":false}],
    ['네이선 콜린손', 'CB', 81, '브렌트 벌', '아일랜드', {"squad":true,"unreleased":false}],
    ['말리크 디우포', 'LB', 76, '브렌트 벌', '세네갈', {"squad":true,"unreleased":false}],
    ['마이클 카요도', 'RB', 77, '브렌트 벌', '이탈리아', {"squad":true,"unreleased":false}],
    ['예고르 야르몰륙', 'CM', 78, '브렌트 벌', '우크라이나', {"squad":true,"unreleased":false}],
    ['마티아스 옌손', 'CM', 78, '브렌트 벌', '덴마크', {"squad":true,"unreleased":false}],
    ['파비우 카르발료', 'CAM', 76, '브렌트 벌', '포르투갈', {"squad":true,"unreleased":false}],
    ['미켈 담스고어', 'CAM', 80, '브렌트 벌', '덴마크', {"squad":true,"unreleased":false}],
    ['비탈리 야넬토', 'CDM', 78, '브렌트 벌', '독일', {"squad":true,"unreleased":false}],
    ['케빈 샤도', 'LW', 79, '브렌트 벌', '독일', {"squad":true,"unreleased":false}],
    ['이고르 치아고', 'ST', 80, '브렌트 벌', '브라질', {"squad":true,"unreleased":false}],
    ['당고 와타로', 'RW', 78, '브렌트 벌', '부르키나파소', {"squad":true,"unreleased":false}],
    ['킨 루이스포토', 'LW', 76, '브렌트 벌', '잉글랜드', {"squad":true,"unreleased":false}],
    ['미켈레 디 그레고로', 'GK', 81, '본머스 체리', '이탈리아', {"squad":true,"unreleased":false}],
    ['훌리안 아라우조', 'RB', 76, '본머스 체리', '멕시코', {"squad":true,"unreleased":false}],
    ['아드리앵 트뤼페로', 'LB', 78, '본머스 체리', '프랑스', {"squad":true,"unreleased":false}],
    ['안토니우 실반', 'CB', 80, '본머스 체리', '포르투갈', {"squad":true,"unreleased":false}],
    ['바포데 디아키토', 'CB', 80, '본머스 체리', '프랑스', {"squad":true,"unreleased":false}],
    ['후안루 산체소', 'RB', 76, '본머스 체리', '스페인', {"squad":true,"unreleased":false}],
    ['루이스 쿡스', 'CM', 78, '본머스 체리', '잉글랜드', {"squad":true,"unreleased":false}],
    ['데이비드 브룩손', 'RW', 76, '본머스 체리', '웨일스', {"squad":true,"unreleased":false}],
    ['알렉스 스코트', 'CM', 78, '본머스 체리', '잉글랜드', {"squad":true,"unreleased":false}],
    ['라이언 크리스토', 'CM', 78, '본머스 체리', '스코틀랜드', {"squad":true,"unreleased":false}],
    ['타일러 애덤손', 'CDM', 79, '본머스 체리', '미국', {"squad":true,"unreleased":false}],
    ['마커스 태버니오', 'LW', 78, '본머스 체리', '잉글랜드', {"squad":true,"unreleased":false}],
    ['아민 아들로', 'LW', 78, '본머스 체리', '모로코', {"squad":true,"unreleased":false}],
    ['에바닐손', 'ST', 81, '본머스 체리', '브라질', {"squad":true,"unreleased":false}],
    ['벤 개넌독', 'RW', 77, '본머스 체리', '스코틀랜드', {"squad":true,"unreleased":false}],
    ['저스틴 클라위베르', 'LW', 80, '본머스 체리', '네덜란드', {"squad":true,"unreleased":false}],
    ['파스칼 스트라위코', 'CB', 78, '브라이턴 걸스', '네덜란드', {"squad":true,"unreleased":false}],
    ['루이스 덩크스', 'CB', 80, '브라이턴 걸스', '잉글랜드', {"squad":true,"unreleased":false}],
    ['올리비에 보스칼로', 'CB', 79, '브라이턴 걸스', '프랑스', {"squad":true,"unreleased":false}],
    ['페르디 카디오글로', 'LB', 78, '브라이턴 걸스', '튀르키예', {"squad":true,"unreleased":false}],
    ['마츠 비페르', 'CDM', 78, '브라이턴 걸스', '네덜란드', {"squad":true,"unreleased":false}],
    ['막심 더 카위페르', 'LB', 77, '브라이턴 걸스', '벨기에', {"squad":true,"unreleased":false}],
    ['잭 힌셸우즈', 'CM', 76, '브라이턴 걸스', '잉글랜드', {"squad":true,"unreleased":false}],
    ['얀쿠바 민테흐', 'RW', 80, '브라이턴 걸스', '감비아', {"squad":true,"unreleased":false}],
    ['파스칼 그로소', 'CM', 79, '브라이턴 걸스', '독일', {"squad":true,"unreleased":false}],
    ['디에고 고메소', 'CM', 78, '브라이턴 걸스', '파라과이', {"squad":true,"unreleased":false}],
    ['야신 아야로', 'CM', 77, '브라이턴 걸스', '스웨덴', {"squad":true,"unreleased":false}],
    ['맷 오라일로', 'CAM', 79, '브라이턴 걸스', '덴마크', {"squad":true,"unreleased":false}],
    ['조르지니오 뤼테로', 'CAM', 80, '브라이턴 걸스', '프랑스', {"squad":true,"unreleased":false}],
    ['에반 퍼거손', 'ST', 77, '브라이턴 걸스', '아일랜드', {"squad":true,"unreleased":false}],
    ['마르코 팔레스트로', 'RB', 77, '런던 블루스', '이탈리아', {"squad":true,"unreleased":false}],
    ['웨슬리 포파노', 'CB', 80, '런던 블루스', '프랑스', {"squad":true,"unreleased":false}],
    ['발렌틴 바르카', 'LB', 76, '런던 블루스', '아르헨티나', {"squad":true,"unreleased":false}],
    ['막상스 라크루오', 'CB', 81, '런던 블루스', '프랑스', {"squad":true,"unreleased":false}],
    ['조렐 하투', 'LB', 80, '런던 블루스', '네덜란드', {"squad":true,"unreleased":false}],
    ['말로 귀스투', 'RB', 81, '런던 블루스', '프랑스', {"squad":true,"unreleased":false}],
    ['조시 아쳄포', 'CB', 76, '런던 블루스', '잉글랜드', {"squad":true,"unreleased":false}],
    ['로메오 라비오', 'CDM', 80, '런던 블루스', '벨기에', {"squad":true,"unreleased":false}],
    ['제이미 기튼손', 'LW', 79, '런던 블루스', '잉글랜드', {"squad":true,"unreleased":false}],
    ['에마뉘엘 에메호', 'ST', 78, '런던 블루스', '네덜란드', {"squad":true,"unreleased":false}],
    ['제오바니 켄도', 'RW', 76, '런던 블루스', '포르투갈', {"squad":true,"unreleased":false}],
    ['구스타보 하메르', 'CAM', 76, '코번트리 스카이', '네덜란드', {"squad":true,"unreleased":false}],
    ['발테르 베니테소', 'GK', 78, '크리스탈 이글', '아르헨티나', {"squad":true,"unreleased":false}],
    ['타이릭 미첼런', 'LB', 79, '크리스탈 이글', '잉글랜드', {"squad":true,"unreleased":false}],
    ['악셀 디사소', 'CB', 78, '크리스탈 이글', '프랑스', {"squad":true,"unreleased":false}],
    ['도미야스 다케히루', 'RB', 78, '크리스탈 이글', '일본', {"squad":true,"unreleased":false}],
    ['크리스 리처드', 'CB', 80, '크리스탈 이글', '미국', {"squad":true,"unreleased":false}],
    ['오스카르 밍게소', 'RB', 78, '크리스탈 이글', '스페인', {"squad":true,"unreleased":false}],
    ['헤페르손 레르모', 'CDM', 78, '크리스탈 이글', '콜롬비아', {"squad":true,"unreleased":false}],
    ['가마다 다이지', 'CAM', 79, '크리스탈 이글', '일본', {"squad":true,"unreleased":false}],
    ['윌 휴스', 'CM', 76, '크리스탈 이글', '잉글랜드', {"squad":true,"unreleased":false}],
    ['퀸턴 팀베르', 'CM', 78, '크리스탈 이글', '네덜란드', {"squad":true,"unreleased":false}],
    ['셰이크 두쿠로', 'CDM', 77, '크리스탈 이글', '말리', {"squad":true,"unreleased":false}],
    ['이스마일라 사로', 'RW', 81, '크리스탈 이글', '세네갈', {"squad":true,"unreleased":false}],
    ['예레미 피나', 'RW', 79, '크리스탈 이글', '스페인', {"squad":true,"unreleased":false}],
    ['드와이트 맥닐런', 'LW', 77, '크리스탈 이글', '잉글랜드', {"squad":true,"unreleased":false}],
    ['예르겐 스트란 라르손', 'ST', 80, '크리스탈 이글', '노르웨이', {"squad":true,"unreleased":false}],
    ['다리오 오소리아', 'LW', 76, '크리스탈 이글', '칠레', {"squad":true,"unreleased":false}],
    ['에반 게상드', 'ST', 77, '크리스탈 이글', '코트디부아르', {"squad":true,"unreleased":false}],
    ['에인슬리 메이틀랜드나일손', 'RB', 76, '에버턴 토피', '잉글랜드', {"squad":true,"unreleased":false}],
    ['마이클 킨스', 'CB', 76, '에버턴 토피', '잉글랜드', {"squad":true,"unreleased":false}],
    ['제임스 타코스코', 'CB', 80, '에버턴 토피', '잉글랜드', {"squad":true,"unreleased":false}],
    ['제이크 오브라이엔', 'CB', 78, '에버턴 토피', '아일랜드', {"squad":true,"unreleased":false}],
    ['비탈리 미콜렌카', 'LB', 78, '에버턴 토피', '우크라이나', {"squad":true,"unreleased":false}],
    ['키어넌 듀스버리홀런', 'CM', 78, '에버턴 토피', '잉글랜드', {"squad":true,"unreleased":false}],
    ['크리스티안 뇌르고어', 'CDM', 79, '에버턴 토피', '덴마크', {"squad":true,"unreleased":false}],
    ['찰리 알카라소', 'CAM', 78, '에버턴 토피', '아르헨티나', {"squad":true,"unreleased":false}],
    ['헤이든 해크노', 'CM', 76, '에버턴 토피', '잉글랜드', {"squad":true,"unreleased":false}],
    ['제임스 가너스', 'CM', 78, '에버턴 토피', '잉글랜드', {"squad":true,"unreleased":false}],
    ['잭 그릴리소', 'LW', 81, '에버턴 토피', '잉글랜드', {"squad":true,"unreleased":false}],
    ['티에르노 바로', 'ST', 76, '에버턴 토피', '프랑스', {"squad":true,"unreleased":false}],
    ['타일러 디블린', 'RW', 76, '에버턴 토피', '잉글랜드', {"squad":true,"unreleased":false}],
    ['브레넌 존손', 'RW', 80, '에버턴 토피', '웨일스', {"squad":true,"unreleased":false}],
    ['케니 테토', 'RB', 77, '풀럼 코티지', '네덜란드', {"squad":true,"unreleased":false}],
    ['캘빈 배소', 'CB', 79, '풀럼 코티지', '나이지리아', {"squad":true,"unreleased":false}],
    ['요아킴 아네르손', 'CB', 81, '풀럼 코티지', '덴마크', {"squad":true,"unreleased":false}],
    ['티모시 카스타뇨', 'RB', 78, '풀럼 코티지', '벨기에', {"squad":true,"unreleased":false}],
    ['휴고 라르센', 'CM', 80, '풀럼 코티지', '스웨덴', {"squad":true,"unreleased":false}],
    ['산데르 베르고', 'CDM', 79, '풀럼 코티지', '노르웨이', {"squad":true,"unreleased":false}],
    ['알렉스 이워보', 'CAM', 79, '풀럼 코티지', '나이지리아', {"squad":true,"unreleased":false}],
    ['에밀 스미스 로웨', 'CAM', 79, '풀럼 코티지', '잉글랜드', {"squad":true,"unreleased":false}],
    ['곤살로 가르시오', 'ST', 76, '풀럼 코티지', '스페인', {"squad":true,"unreleased":false}],
    ['로드리구 무니소', 'ST', 78, '풀럼 코티지', '브라질', {"squad":true,"unreleased":false}],
    ['케비노', 'LW', 78, '풀럼 코티지', '브라질', {"squad":true,"unreleased":false}],
    ['오스카르 보브', 'RW', 78, '풀럼 코티지', '노르웨이', {"squad":true,"unreleased":false}],
    ['잭 버틀런더', 'GK', 77, '헐 타이거', '잉글랜드', {"squad":true,"unreleased":false}],
    ['모리타 히데마산', 'CDM', 78, '헐 타이거', '일본', {"squad":true,"unreleased":false}],
    ['압둘 파타운', 'RW', 76, '입스위치 트랙터', '가나', {"squad":true,"unreleased":false}],
    ['훌리오 엔시손', 'CAM', 77, '입스위치 트랙터', '파라과이', {"squad":true,"unreleased":false}],
    ['에세키엘 팔라시오손', 'CM', 78, '입스위치 트랙터', '아르헨티나', {"squad":true,"unreleased":false}],
    ['마에다 다이제느', 'LW', 76, '입스위치 트랙터', '일본', {"squad":true,"unreleased":false}],
    ['제임스 트래퍼든', 'GK', 79, '리즈 화이트', '잉글랜드', {"squad":true,"unreleased":false}],
    ['이선 암파둔', 'CDM', 77, '리즈 화이트', '웨일스', {"squad":true,"unreleased":false}],
    ['조 로더른', 'CB', 76, '리즈 화이트', '웨일스', {"squad":true,"unreleased":false}],
    ['대니얼 제임슨', 'RW', 76, '리즈 화이트', '웨일스', {"squad":true,"unreleased":false}],
    ['션 롱스태프르', 'CM', 76, '리즈 화이트', '잉글랜드', {"squad":true,"unreleased":false}],
    ['도미닉 캘버트르위르', 'ST', 76, '리즈 화이트', '잉글랜드', {"squad":true,"unreleased":false}],
    ['해리 윌슨드', 'CAM', 77, '리즈 화이트', '웨일스', {"squad":true,"unreleased":false}],
    ['야카 비욜라', 'CB', 76, '리즈 화이트', '슬로베니아', {"squad":true,"unreleased":false}],
    ['안톤 슈타흐르', 'CDM', 76, '리즈 화이트', '독일', {"squad":true,"unreleased":false}],
    ['노아 오카포른', 'LW', 77, '리즈 화이트', '스위스', {"squad":true,"unreleased":false}],
    ['니코 엘베딘', 'CB', 76, '리즈 화이트', '스위스', {"squad":true,"unreleased":false}],
    ['조 고메손', 'CB', 79, '리버 머지', '잉글랜드', {"squad":true,"unreleased":false}],
    ['코너 브래들린', 'RB', 80, '리버 머지', '북아일랜드', {"squad":true,"unreleased":false}],
    ['페데리코 키에산', 'RW', 78, '리버 머지', '이탈리아', {"squad":true,"unreleased":false}],
    ['조반니 레오닌', 'CB', 76, '리버 머지', '이탈리아', {"squad":true,"unreleased":false}],
    ['일리만 은디아옌', 'LW', 80, '맨체스 블루', '세네갈', {"squad":true,"unreleased":false}],
    ['비토르 헤이손', 'CB', 76, '맨체스 블루', '브라질', {"squad":true,"unreleased":false}],
    ['마테우스 누네손', 'RB', 80, '맨체스 블루', '포르투갈', {"squad":true,"unreleased":false}],
    ['헤로니모 룰린', 'GK', 76, '맨체스 블루', '아르헨티나', {"squad":true,"unreleased":false}],
    ['아유브 부아딘', 'CDM', 76, '맨체스 블루', '모로코', {"squad":true,"unreleased":false}],
    ['니코 오라일린', 'CM', 78, '맨체스 블루', '잉글랜드', {"squad":true,"unreleased":false}],
    ['알란드', 'LW', 76, '맨체스 블루', '브라질', {"squad":true,"unreleased":false}],
    ['압두코디르 후사노브스', 'CB', 80, '맨체스 블루', '우즈베키스탄', {"squad":true,"unreleased":false}],
    ['리코 루이손', 'RB', 80, '맨체스 블루', '잉글랜드', {"squad":true,"unreleased":false}],
    ['닉 포픈', 'GK', 80, '뉴캐슬 매파이', '잉글랜드', {"squad":true,"unreleased":false}],
    ['티노 리브라멘톤', 'RB', 80, '뉴캐슬 매파이', '잉글랜드', {"squad":true,"unreleased":false}],
    ['루이스 홀라', 'LB', 79, '뉴캐슬 매파이', '잉글랜드', {"squad":true,"unreleased":false}],
    ['스벤 보트마르', 'CB', 81, '뉴캐슬 매파이', '네덜란드', {"squad":true,"unreleased":false}],
    ['파비안 셰언', 'CB', 79, '뉴캐슬 매파이', '스위스', {"squad":true,"unreleased":false}],
    ['니코 곤살레손', 'CM', 78, '뉴캐슬 매파이', '스페인', {"squad":true,"unreleased":false}],
    ['하비 반손', 'LW', 80, '뉴캐슬 매파이', '잉글랜드', {"squad":true,"unreleased":false}],
    ['말리크 티아운', 'CB', 80, '뉴캐슬 매파이', '독일', {"squad":true,"unreleased":false}],
    ['안토니 엘랑간', 'RW', 81, '뉴캐슬 매파이', '스웨덴', {"squad":true,"unreleased":false}],
    ['제이컵 머핀', 'RW', 76, '뉴캐슬 매파이', '잉글랜드', {"squad":true,"unreleased":false}],
    ['조 윌로큰', 'CM', 77, '뉴캐슬 매파이', '잉글랜드', {"squad":true,"unreleased":false}],
    ['댄 버느', 'CB', 78, '뉴캐슬 매파이', '잉글랜드', {"squad":true,"unreleased":false}],
    ['아마르 데디츠', 'RB', 76, '뉴캐슬 매파이', '보스니아헤르체고비나', {"squad":true,"unreleased":false}],
    ['제이컵 램진', 'CAM', 79, '뉴캐슬 매파이', '잉글랜드', {"squad":true,"unreleased":false}],
    ['우스만 디오망덴', 'CB', 80, '노팅엄 포레스터', '코트디부아르', {"squad":true,"unreleased":false}],
    ['네코 윌리엄손', 'RB', 76, '노팅엄 포레스터', '웨일스', {"squad":true,"unreleased":false}],
    ['무릴룬', 'CB', 81, '노팅엄 포레스터', '브라질', {"squad":true,"unreleased":false}],
    ['이브라힘 상가렌', 'CDM', 79, '노팅엄 포레스터', '코트디부아르', {"squad":true,"unreleased":false}],
    ['칼럼 허드슨오도인', 'LW', 78, '노팅엄 포레스터', '잉글랜드', {"squad":true,"unreleased":false}],
    ['니콜라스 도밍게노', 'CM', 77, '노팅엄 포레스터', '아르헨티나', {"squad":true,"unreleased":false}],
    ['크리스 우든', 'ST', 78, '노팅엄 포레스터', '뉴질랜드', {"squad":true,"unreleased":false}],
    ['이고르 제주손', 'ST', 76, '노팅엄 포레스터', '브라질', {"squad":true,"unreleased":false}],
    ['단 은도옌', 'RW', 79, '노팅엄 포레스터', '스위스', {"squad":true,"unreleased":false}],
    ['아르노 칼리무엔돈', 'ST', 78, '노팅엄 포레스터', '프랑스', {"squad":true,"unreleased":false}],
    ['리암 델라픈', 'ST', 78, '노팅엄 포레스터', '잉글랜드', {"squad":true,"unreleased":false}],
    ['크사버 슐라거스', 'CM', 77, '노팅엄 포레스터', '오스트리아', {"squad":true,"unreleased":false}],
    ['제임스 매카틴', 'CAM', 78, '노팅엄 포레스터', '잉글랜드', {"squad":true,"unreleased":false}],
    ['루카 네추', 'LB', 76, '노팅엄 포레스터', '독일', {"squad":true,"unreleased":false}],
    ['마츠 셀손', 'GK', 79, '노팅엄 포레스터', '벨기에', {"squad":true,"unreleased":false}],
    ['다니엘 무뇨손', 'RB', 80, '노팅엄 포레스터', '콜롬비아', {"squad":true,"unreleased":false}],
    ['니콜라 밀렌코비츠', 'CB', 81, '노팅엄 포레스터', '세르비아', {"squad":true,"unreleased":false}],
    ['올라 아이난', 'RB', 77, '노팅엄 포레스터', '나이지리아', {"squad":true,"unreleased":false}],
    ['케빈 단손', 'CB', 77, '선덜랜드 블랙캣', '오스트리아', {"squad":true,"unreleased":false}],
    ['솀스딘 탈빈', 'RW', 76, '선덜랜드 블랙캣', '모로코', {"squad":true,"unreleased":false}],
    ['브라이언 브로베인', 'ST', 78, '선덜랜드 블랙캣', '네덜란드', {"squad":true,"unreleased":false}],
    ['오마르 알데레텐', 'CB', 76, '선덜랜드 블랙캣', '파라과이', {"squad":true,"unreleased":false}],
    ['레이닐둔', 'LB', 77, '선덜랜드 블랙캣', '모잠비크', {"squad":true,"unreleased":false}],
    ['하비브 디아란', 'CM', 78, '선덜랜드 블랙캣', '세네갈', {"squad":true,"unreleased":false}],
    ['노르디 무키엘렌', 'RB', 77, '선덜랜드 블랙캣', '프랑스', {"squad":true,"unreleased":false}],
    ['로빈 루프손', 'GK', 77, '선덜랜드 블랙캣', '네덜란드', {"squad":true,"unreleased":false}],
    ['노아 사디킨', 'CM', 78, '선덜랜드 블랙캣', '콩고민주공화국', {"squad":true,"unreleased":false}],
    ['엔조 르 펜', 'CAM', 76, '선덜랜드 블랙캣', '프랑스', {"squad":true,"unreleased":false}],
    ['말리크 포파난', 'LW', 78, '선덜랜드 블랙캣', '벨기에', {"squad":true,"unreleased":false}],
    ['앤디 로버트슨드', 'LB', 80, '북런던 화이트', '스코틀랜드', {"squad":true,"unreleased":false}],
    ['토신 아다라비오욘', 'CB', 78, '북런던 화이트', '잉글랜드', {"squad":true,"unreleased":false}],
    ['마르코스 세네신', 'CB', 78, '북런던 화이트', '아르헨티나', {"squad":true,"unreleased":false}],
    ['얀 파울 판헤켄', 'CB', 78, '북런던 화이트', '네덜란드', {"squad":true,"unreleased":false}],
    ['코너 갤러거스', 'CM', 80, '북런던 화이트', '잉글랜드', {"squad":true,"unreleased":false}],
    ['히샤를리송드', 'ST', 78, '북런던 화이트', '브라질', {"squad":true,"unreleased":false}],
    ['마티스 텔라', 'ST', 78, '북런던 화이트', '프랑스', {"squad":true,"unreleased":false}],
    ['데스티니 우도긴', 'LB', 80, '북런던 화이트', '이탈리아', {"squad":true,"unreleased":false}],
    ['아치 그레인', 'CM', 78, '북런던 화이트', '잉글랜드', {"squad":true,"unreleased":false}],
    ['루카스 베리발라', 'CM', 79, '북런던 화이트', '스웨덴', {"squad":true,"unreleased":false}],
    ['사비운', 'LW', 81, '북런던 화이트', '브라질', {"squad":true,"unreleased":false}],
    ['마테우스 페르난드손', 'CM', 77, '북런던 화이트', '포르투갈', {"squad":true,"unreleased":false}],
    ['도미닉 솔란켄', 'ST', 78, '북런던 화이트', '잉글랜드', {"squad":true,"unreleased":false}],
    ['페드로 포론', 'RB', 80, '북런던 화이트', '스페인', {"squad":true,"unreleased":false}],
    ['윌슨 오도베른', 'LW', 76, '북런던 화이트', '프랑스', {"squad":true,"unreleased":false}],
    ['로드리고 벤탄쿠른', 'CM', 78, '북런던 화이트', '우루과이', {"squad":true,"unreleased":false}],
    ['안토닌 킨스킨', 'GK', 76, '북런던 화이트', '체코', {"squad":true,"unreleased":false}],
    ['안토니오 시베로', 'GK', 76, '알라베스 아술', '스페인', {"squad":true,"unreleased":false}],
    ['데니스 수아레노', 'CM', 76, '알라베스 아술', '스페인', {"squad":true,"unreleased":false}],
    ['토니 마르티네르', 'ST', 76, '알라베스 아술', '스페인', {"squad":true,"unreleased":false}],
    ['루카스 보옌', 'ST', 77, '알라베스 아술', '아르헨티나', {"squad":true,"unreleased":false}],
    ['다니 비비앙', 'CB', 80, '바스크 아슬레', '스페인', {"squad":true,"unreleased":false}],
    ['아이토르 파레데노', 'CB', 78, '바스크 아슬레', '스페인', {"squad":true,"unreleased":false}],
    ['예라이 알바레노', 'CB', 79, '바스크 아슬레', '스페인', {"squad":true,"unreleased":false}],
    ['베냐트 프라도르', 'CDM', 76, '바스크 아슬레', '스페인', {"squad":true,"unreleased":false}],
    ['알렉스 베렝게로', 'LW', 79, '바스크 아슬레', '스페인', {"squad":true,"unreleased":false}],
    ['이냐키 윌리엄슨', 'ST', 80, '바스크 아슬레', '가나', {"squad":true,"unreleased":false}],
    ['고르카 구루세토', 'ST', 78, '바스크 아슬레', '스페인', {"squad":true,"unreleased":false}],
    ['헤수스 아레손', 'RB', 78, '바스크 아슬레', '스페인', {"squad":true,"unreleased":false}],
    ['에므리크 라포르타', 'CB', 81, '바스크 아슬레', '스페인', {"squad":true,"unreleased":false}],
    ['이니고 루이스 데 갈라레토', 'CM', 77, '바스크 아슬레', '스페인', {"squad":true,"unreleased":false}],
    ['유리 베르치첸', 'LB', 76, '바스크 아슬레', '스페인', {"squad":true,"unreleased":false}],
    ['후안 무손', 'GK', 80, '마드리드 로히', '아르헨티나', {"squad":true,"unreleased":false}],
    ['자니 카르도손', 'CDM', 77, '마드리드 로히', '미국', {"squad":true,"unreleased":false}],
    ['코켄', 'CM', 80, '마드리드 로히', '스페인', {"squad":true,"unreleased":false}],
    ['파블로 바리오노', 'CM', 81, '마드리드 로히', '스페인', {"squad":true,"unreleased":false}],
    ['마르코스 요렌토', 'CM', 80, '마드리드 로히', '스페인', {"squad":true,"unreleased":false}],
    ['마르크 푸비요', 'RB', 76, '마드리드 로히', '스페인', {"squad":true,"unreleased":false}],
    ['줄리아노 시메오나', 'RW', 80, '마드리드 로히', '아르헨티나', {"squad":true,"unreleased":false}],
    ['모르텐 율마르', 'CDM', 81, '마드리드 로히', '덴마크', {"squad":true,"unreleased":false}],
    ['주앙 칸셀로', 'RB', 80, '카탈루냐 블라우', '포르투갈', {"squad":true,"unreleased":false}],
    ['가브리엘 제주노', 'ST', 81, '카탈루냐 블라우', '브라질', {"squad":true,"unreleased":false}],
    ['보이치에흐 슈쳉스노', 'GK', 78, '카탈루냐 블라우', '폴란드', {"squad":true,"unreleased":false}],
    ['안드레아스 크리스텐센드', 'CB', 78, '카탈루냐 블라우', '덴마크', {"squad":true,"unreleased":false}],
    ['에리크 가르시안', 'CB', 78, '카탈루냐 블라우', '스페인', {"squad":true,"unreleased":false}],
    ['도미니크 리바코비츠', 'GK', 76, '카탈루냐 블라우', '크로아티아', {"squad":true,"unreleased":false}],
    ['알타이 바이은드론', 'GK', 77, '비고 셀레스테', '튀르키예', {"squad":true,"unreleased":false}],
    ['칼 스타르펠타', 'CB', 76, '비고 셀레스테', '스웨덴', {"squad":true,"unreleased":false}],
    ['보르하 이글레시아노', 'ST', 78, '비고 셀레스테', '스페인', {"squad":true,"unreleased":false}],
    ['페란 후트글란', 'ST', 78, '비고 셀레스테', '스페인', {"squad":true,"unreleased":false}],
    ['이아고 아스파노', 'CAM', 80, '비고 셀레스테', '스페인', {"squad":true,"unreleased":false}],
    ['세바스티안 카세레노', 'CB', 77, '비고 셀레스테', '우루과이', {"squad":true,"unreleased":false}],
    ['하비 갈란드', 'LB', 76, '비고 셀레스테', '스페인', {"squad":true,"unreleased":false}],
    ['마르크 카사돈', 'CDM', 77, '코루냐 블랑키아술', '스페인', {"squad":true,"unreleased":false}],
    ['예레마이 에르난데노', 'LW', 79, '코루냐 블랑키아술', '스페인', {"squad":true,"unreleased":false}],
    ['안헬리노', 'LB', 76, '코루냐 블랑키아술', '스페인', {"squad":true,"unreleased":false}],
    ['호세 마리아 히메네노', 'CB', 80, '코루냐 블랑키아술', '우루과이', {"squad":true,"unreleased":false}],
    ['파쿤도 부오나노텐', 'CAM', 77, '엘체 프란히베르데', '아르헨티나', {"squad":true,"unreleased":false}],
    ['하비 푸아돈', 'LW', 78, '에스파뇰 페리케', '스페인', {"squad":true,"unreleased":false}],
    ['보르하 마요란', 'ST', 76, '헤타페 아술', '스페인', {"squad":true,"unreleased":false}],
    ['크리스탄투스 우첸', 'CM', 76, '헤타페 아술', '나이지리아', {"squad":true,"unreleased":false}],
    ['카를로스 알바레산', 'CAM', 76, '레반테 그라노타', '스페인', {"squad":true,"unreleased":false}],
    ['욘 몬카욜란', 'CM', 76, '오사수나 로하', '스페인', {"squad":true,"unreleased":false}],
    ['아이마르 오로산', 'CAM', 77, '오사수나 로하', '스페인', {"squad":true,"unreleased":false}],
    ['안테 부디미른', 'ST', 77, '오사수나 로하', '크로아티아', {"squad":true,"unreleased":false}],
    ['세르히오 카날레노', 'CAM', 76, '산탄데르 베르디블랑', '스페인', {"squad":true,"unreleased":false}],
    ['안드레이 라치운', 'RB', 77, '라요 프랑코', '루마니아', {"squad":true,"unreleased":false}],
    ['이시 팔라손드', 'RW', 77, '라요 프랑코', '스페인', {"squad":true,"unreleased":false}],
    ['호르헤 데 프루토노', 'RW', 76, '라요 프랑코', '스페인', {"squad":true,"unreleased":false}],
    ['알바로 바예노', 'GK', 79, '베티스 베르데', '스페인', {"squad":true,"unreleased":false}],
    ['엑토르 베예리노', 'RB', 76, '베티스 베르데', '스페인', {"squad":true,"unreleased":false}],
    ['디에고 요렌토', 'CB', 77, '베티스 베르데', '스페인', {"squad":true,"unreleased":false}],
    ['나타른', 'CB', 77, '베티스 베르데', '브라질', {"squad":true,"unreleased":false}],
    ['파블로 포르날손', 'CM', 79, '베티스 베르데', '스페인', {"squad":true,"unreleased":false}],
    ['쿠초 에르난데노', 'ST', 79, '베티스 베르데', '콜롬비아', {"squad":true,"unreleased":false}],
    ['압데 에살술린', 'LW', 80, '베티스 베르데', '모로코', {"squad":true,"unreleased":false}],
    ['프란 가르시안', 'LB', 78, '베티스 베르데', '스페인', {"squad":true,"unreleased":false}],
    ['알바로 피달곤', 'CM', 77, '베티스 베르데', '멕시코', {"squad":true,"unreleased":false}],
    ['로드리고 리켈멘', 'RW', 77, '베티스 베르데', '스페인', {"squad":true,"unreleased":false}],
    ['넬손 데오산', 'CM', 76, '베티스 베르데', '콜롬비아', {"squad":true,"unreleased":false}],
    ['트로이 패러트', 'ST', 77, '베티스 베르데', '아일랜드', {"squad":true,"unreleased":false}],
    ['조반니 로 셀손', 'CAM', 80, '베티스 베르데', '아르헨티나', {"squad":true,"unreleased":false}],
    ['마르크 로칸', 'CDM', 77, '베티스 베르데', '스페인', {"squad":true,"unreleased":false}],
    ['다니 세바요노', 'CM', 79, '베티스 베르데', '스페인', {"squad":true,"unreleased":false}],
    ['라울 아센시온', 'CB', 78, '마드리드 블랑코', '스페인', {"squad":true,"unreleased":false}],
    ['엔드리코', 'ST', 79, '마드리드 블랑코', '브라질', {"squad":true,"unreleased":false}],
    ['안드리 루니르', 'GK', 76, '마드리드 블랑코', '우크라이나', {"squad":true,"unreleased":false}],
    ['알바로 카레라노', 'LB', 79, '마드리드 블랑코', '스페인', {"squad":true,"unreleased":false}],
    ['브라힘 디아노', 'RW', 81, '마드리드 블랑코', '모로코', {"squad":true,"unreleased":false}],
    ['페를랑 멘딘', 'LB', 78, '마드리드 블랑코', '프랑스', {"squad":true,"unreleased":false}],
    ['알렉스 레미론', 'GK', 81, '도노스티 추리우르딘', '스페인', {"squad":true,"unreleased":false}],
    ['이고르 수벨디안', 'CB', 79, '도노스티 추리우르딘', '스페인', {"squad":true,"unreleased":false}],
    ['안데르 바레네체안', 'LW', 79, '도노스티 추리우르딘', '스페인', {"squad":true,"unreleased":false}],
    ['오리 오스카르손드', 'ST', 76, '도노스티 추리우르딘', '아이슬란드', {"squad":true,"unreleased":false}],
    ['곤살루 게데노', 'LW', 78, '도노스티 추리우르딘', '포르투갈', {"squad":true,"unreleased":false}],
    ['욘 파체콘', 'CB', 76, '도노스티 추리우르딘', '스페인', {"squad":true,"unreleased":false}],
    ['세르히오 고메노', 'LM', 77, '도노스티 추리우르딘', '스페인', {"squad":true,"unreleased":false}],
    ['카를로스 솔레른', 'CM', 78, '도노스티 추리우르딘', '스페인', {"squad":true,"unreleased":false}],
    ['양헬 에레란', 'CDM', 77, '도노스티 추리우르딘', '베네수엘라', {"squad":true,"unreleased":false}],
    ['루카 수치츠', 'CM', 77, '도노스티 추리우르딘', '크로아티아', {"squad":true,"unreleased":false}],
    ['오디세아스 블라호디모노', 'GK', 76, '세비야 로호', '그리스', {"squad":true,"unreleased":false}],
    ['루벤 바르가노', 'LW', 77, '세비야 로호', '스위스', {"squad":true,"unreleased":false}],
    ['가브리엘 수아손', 'LB', 76, '세비야 로호', '칠레', {"squad":true,"unreleased":false}],
    ['유수프 포파난', 'CDM', 79, '세비야 로호', '프랑스', {"squad":true,"unreleased":false}],
    ['기도 로드리게노', 'CDM', 78, '발렌시아 무르시엘', '아르헨티나', {"squad":true,"unreleased":false}],
    ['아르나우트 단주만', 'LW', 76, '발렌시아 무르시엘', '네덜란드', {"squad":true,"unreleased":false}],
    ['하비 게란', 'CM', 78, '발렌시아 무르시엘', '스페인', {"squad":true,"unreleased":false}],
    ['우고 두론', 'ST', 76, '발렌시아 무르시엘', '스페인', {"squad":true,"unreleased":false}],
    ['하비 엘리어트', 'CAM', 78, '발렌시아 무르시엘', '잉글랜드', {"squad":true,"unreleased":false}],
    ['호세 가얀', 'LB', 78, '발렌시아 무르시엘', '스페인', {"squad":true,"unreleased":false}],
    ['페펠룬', 'CM', 76, '발렌시아 무르시엘', '스페인', {"squad":true,"unreleased":false}],
    ['루이스 주니오른', 'GK', 79, '비야레 수브마리노', '브라질', {"squad":true,"unreleased":false}],
    ['로강 코스탄', 'CB', 76, '비야레 수브마리노', '카보베르데', {"squad":true,"unreleased":false}],
    ['제라르드 모레논', 'ST', 80, '비야레 수브마리노', '스페인', {"squad":true,"unreleased":false}],
    ['후안 포이손', 'CB', 80, '비야레 수브마리노', '아르헨티나', {"squad":true,"unreleased":false}],
    ['조르제스 미카우타젠', 'ST', 80, '비야레 수브마리노', '조지아', {"squad":true,"unreleased":false}],
    ['알베르토 몰레이론', 'CAM', 79, '비야레 수브마리노', '스페인', {"squad":true,"unreleased":false}],
    ['레나투 베이간', 'CB', 78, '비야레 수브마리노', '포르투갈', {"squad":true,"unreleased":false}],
    ['산티 코메사뇬', 'CM', 76, '비야레 수브마리노', '스페인', {"squad":true,"unreleased":false}],
    ['파페 게옌드', 'CDM', 76, '비야레 수브마리노', '세네갈', {"squad":true,"unreleased":false}],
    ['니콜라 페펜', 'RW', 76, '비야레 수브마리노', '코트디부아르', {"squad":true,"unreleased":false}],
    ['아요세 페레노', 'CAM', 79, '비야레 수브마리노', '스페인', {"squad":true,"unreleased":false}],
    ['페테르 굴라친', 'GK', 76, '비야레 수브마리노', '헝가리', {"squad":true,"unreleased":false}],
    ['플로리앙 토뱅드', 'CAM', 79, '랑스 상글리에', '프랑스', {"squad":true,"unreleased":false}],
    ['장클레르 토디본', 'CB', 79, '랑스 상글리에', '프랑스', {"squad":true,"unreleased":false}],
    ['아마두 아이다란', 'CM', 76, '랑스 상글리에', '말리', {"squad":true,"unreleased":false}],
    ['베르케 외제른', 'GK', 76, '릴 도그', '튀르키예', {"squad":true,"unreleased":false}],
    ['알렉산드룬', 'CB', 78, '릴 도그', '브라질', {"squad":true,"unreleased":false}],
    ['올리비에 지룬', 'ST', 76, '릴 도그', '프랑스', {"squad":true,"unreleased":false}],
    ['오사메 사라윈', 'LW', 76, '릴 도그', '모로코', {"squad":true,"unreleased":false}],
    ['탕기 니앙준', 'CB', 76, '릴 도그', '프랑스', {"squad":true,"unreleased":false}],
  ],
  Live: [
    ['조현운', 'GK', 84, '울산 호랑', '대한민국', {"squad":true,"unreleased":true}],
    ['마테이스 데 리트', 'CB', 83, '맨체스 레즈', '네덜란드', {"squad":true,"unreleased":false}],
    ['리산드로 마르티노', 'CB', 84, '맨체스 레즈', '아르헨티나', {"squad":true,"unreleased":false}],
    ['마커스 래시포', 'LW', 82, '맨체스 레즈', '잉글랜드', {"squad":true,"unreleased":false}],
    ['마테우스 쿠뉴', 'CAM', 84, '맨체스 레즈', '브라질', {"squad":true,"unreleased":false}],
    ['아마드 디알', 'RW', 82, '맨체스 레즈', '코트디부아르', {"squad":true,"unreleased":false}],
    ['브라이언 음보모', 'RW', 84, '맨체스 레즈', '카메룬', {"squad":true,"unreleased":false}],
    ['벤야민 셰스코', 'ST', 82, '맨체스 레즈', '슬로베니아', {"squad":true,"unreleased":false}],
    ['벤 화이터', 'RB', 82, '북런던 건너스', '잉글랜드', {"squad":true,"unreleased":false}],
    ['피에로 인카피오', 'CB', 82, '북런던 건너스', '에콰도르', {"squad":true,"unreleased":false}],
    ['유리엔 팀베르', 'RB', 84, '북런던 건너스', '네덜란드', {"squad":true,"unreleased":false}],
    ['리카르도 칼라피오레', 'LB', 82, '북런던 건너스', '이탈리아', {"squad":true,"unreleased":false}],
    ['에베레치 에젬', 'CAM', 84, '북런던 건너스', '잉글랜드', {"squad":true,"unreleased":false}],
    ['미켈 메리나', 'CM', 82, '북런던 건너스', '스페인', {"squad":true,"unreleased":false}],
    ['마르틴 수비멘도', 'CDM', 85, '북런던 건너스', '스페인', {"squad":true,"unreleased":false}],
    ['카이 하베르치', 'ST', 83, '북런던 건너스', '독일', {"squad":true,"unreleased":false}],
    ['파우 토레소', 'CB', 84, '아스톤 라이온', '스페인', {"squad":true,"unreleased":false}],
    ['존 맥기너', 'CM', 82, '아스톤 라이온', '스코틀랜드', {"squad":true,"unreleased":false}],
    ['부바카르 카마로', 'CDM', 82, '아스톤 라이온', '프랑스', {"squad":true,"unreleased":false}],
    ['아마두 오나노', 'CDM', 82, '아스톤 라이온', '벨기에', {"squad":true,"unreleased":false}],
    ['레온 고레츠코', 'CM', 82, '아스톤 라이온', '독일', {"squad":true,"unreleased":false}],
    ['조르제 페트로빈', 'GK', 82, '본머스 체리', '세르비아', {"squad":true,"unreleased":false}],
    ['바르트 페르브뤼헌', 'GK', 82, '브라이턴 걸스', '네덜란드', {"squad":true,"unreleased":false}],
    ['미토마 가오로', 'LW', 83, '브라이턴 걸스', '일본', {"squad":true,"unreleased":false}],
    ['레비 콜윈', 'CB', 83, '런던 블루스', '잉글랜드', {"squad":true,"unreleased":false}],
    ['리스 제임손', 'RB', 83, '런던 블루스', '잉글랜드', {"squad":true,"unreleased":false}],
    ['모건 로저손', 'CAM', 84, '런던 블루스', '잉글랜드', {"squad":true,"unreleased":false}],
    ['페드루 네토', 'RW', 82, '런던 블루스', '포르투갈', {"squad":true,"unreleased":false}],
    ['주앙 페드로', 'ST', 83, '런던 블루스', '브라질', {"squad":true,"unreleased":false}],
    ['이스테반', 'RW', 84, '런던 블루스', '브라질', {"squad":true,"unreleased":false}],
    ['딘 헨더손', 'GK', 82, '크리스탈 이글', '잉글랜드', {"squad":true,"unreleased":false}],
    ['애덤 워톤', 'CM', 83, '크리스탈 이글', '잉글랜드', {"squad":true,"unreleased":false}],
    ['장필리프 마테토', 'ST', 82, '크리스탈 이글', '프랑스', {"squad":true,"unreleased":false}],
    ['조던 픽포르', 'GK', 84, '에버턴 토피', '잉글랜드', {"squad":true,"unreleased":false}],
    ['재러드 브랜스웨이터', 'CB', 84, '에버턴 토피', '잉글랜드', {"squad":true,"unreleased":false}],
    ['베른트 레노어', 'GK', 82, '풀럼 코티지', '독일', {"squad":true,"unreleased":false}],
    ['앤토니 로빈손', 'LB', 82, '풀럼 코티지', '미국', {"squad":true,"unreleased":false}],
    ['밀로시 케르케주', 'LB', 82, '리버 머지', '헝가리', {"squad":true,"unreleased":false}],
    ['코디 학폰', 'LW', 84, '리버 머지', '네덜란드', {"squad":true,"unreleased":false}],
    ['위고 에키티켄', 'ST', 85, '리버 머지', '프랑스', {"squad":true,"unreleased":false}],
    ['기오르기 마마르다시빌린', 'GK', 82, '리버 머지', '조지아', {"squad":true,"unreleased":false}],
    ['브래들리 바르콜란', 'LW', 84, '리버 머지', '프랑스', {"squad":true,"unreleased":false}],
    ['제레미 프림퐁그', 'RB', 83, '리버 머지', '네덜란드', {"squad":true,"unreleased":false}],
    ['로날드 아라우혼', 'CB', 83, '리버 머지', '우루과이', {"squad":true,"unreleased":false}],
    ['라이언 흐라번베르흐트', 'CM', 84, '리버 머지', '네덜란드', {"squad":true,"unreleased":false}],
    ['엘리엇 앤더슨드', 'CM', 83, '맨체스 블루', '잉글랜드', {"squad":true,"unreleased":false}],
    ['마크 게힌', 'CB', 84, '맨체스 블루', '잉글랜드', {"squad":true,"unreleased":false}],
    ['마테오 코바치츠', 'CM', 82, '맨체스 블루', '크로아티아', {"squad":true,"unreleased":false}],
    ['라얀 셰르킨', 'CAM', 84, '맨체스 블루', '프랑스', {"squad":true,"unreleased":false}],
    ['제레미 도쿤', 'LW', 84, '맨체스 블루', '벨기에', {"squad":true,"unreleased":false}],
    ['엔소 페르난데손', 'CM', 85, '맨체스 블루', '아르헨티나', {"squad":true,"unreleased":false}],
    ['라얀 아이트누린', 'LB', 82, '맨체스 블루', '알제리', {"squad":true,"unreleased":false}],
    ['요슈코 그바르디올라', 'CB', 85, '맨체스 블루', '크로아티아', {"squad":true,"unreleased":false}],
    ['앙투안 세메뇬', 'RW', 83, '맨체스 블루', '가나', {"squad":true,"unreleased":false}],
    ['조엘린토느', 'CM', 82, '뉴캐슬 매파이', '브라질', {"squad":true,"unreleased":false}],
    ['요안 위산', 'ST', 82, '뉴캐슬 매파이', '콩고민주공화국', {"squad":true,"unreleased":false}],
    ['모건 깁스화이튼', 'CAM', 83, '노팅엄 포레스터', '잉글랜드', {"squad":true,"unreleased":false}],
    ['그라니트 자칸', 'CDM', 82, '선덜랜드 블랙캣', '스위스', {"squad":true,"unreleased":false}],
    ['사비 시몬손', 'CAM', 85, '북런던 화이트', '네덜란드', {"squad":true,"unreleased":false}],
    ['제임스 매디슨드', 'CAM', 82, '북런던 화이트', '잉글랜드', {"squad":true,"unreleased":false}],
    ['산드로 토날린', 'CDM', 83, '북런던 화이트', '이탈리아', {"squad":true,"unreleased":false}],
    ['모하메드 쿠두손', 'RW', 84, '북런던 화이트', '가나', {"squad":true,"unreleased":false}],
    ['데얀 쿨루셉스킨', 'RW', 83, '북런던 화이트', '스웨덴', {"squad":true,"unreleased":false}],
    ['오마르 마르무신', 'RW', 82, '북런던 화이트', '이집트', {"squad":true,"unreleased":false}],
    ['미키 판더페느', 'CB', 84, '북런던 화이트', '네덜란드', {"squad":true,"unreleased":false}],
    ['우나이 시몬드', 'GK', 85, '바스크 아슬레', '스페인', {"squad":true,"unreleased":false}],
    ['오이안 산세타', 'CAM', 83, '바스크 아슬레', '스페인', {"squad":true,"unreleased":false}],
    ['이간인', 'CAM', 83, '마드리드 로히', '대한민국', {"squad":true,"unreleased":false}],
    ['알렉산데르 쇠를로타', 'ST', 82, '마드리드 로히', '노르웨이', {"squad":true,"unreleased":false}],
    ['알렉스 바에노', 'CAM', 84, '마드리드 로히', '스페인', {"squad":true,"unreleased":false}],
    ['아데몰라 루크몬', 'RW', 84, '마드리드 로히', '나이지리아', {"squad":true,"unreleased":false}],
    ['조너선 데이비스', 'ST', 83, '마드리드 로히', '캐나다', {"squad":true,"unreleased":false}],
    ['다비드 한츠콘', 'CB', 84, '마드리드 로히', '슬로바키아', {"squad":true,"unreleased":false}],
    ['크리스티안 로메론', 'CB', 85, '마드리드 로히', '아르헨티나', {"squad":true,"unreleased":false}],
    ['알레한드로 그리말두', 'LB', 83, '마드리드 로히', '스페인', {"squad":true,"unreleased":false}],
    ['로뱅 르 노르만드', 'CB', 83, '마드리드 로히', '스페인', {"squad":true,"unreleased":false}],
    ['조안 가르시안', 'GK', 83, '카탈루냐 블라우', '스페인', {"squad":true,"unreleased":false}],
    ['알레한드로 발덴', 'LB', 82, '카탈루냐 블라우', '스페인', {"squad":true,"unreleased":false}],
    ['파우 쿠바르신', 'CB', 85, '카탈루냐 블라우', '스페인', {"squad":true,"unreleased":false}],
    ['가빈', 'CM', 84, '카탈루냐 블라우', '스페인', {"squad":true,"unreleased":false}],
    ['페르민 로페노', 'CAM', 84, '카탈루냐 블라우', '스페인', {"squad":true,"unreleased":false}],
    ['카림 아데예민', 'LW', 83, '카탈루냐 블라우', '독일', {"squad":true,"unreleased":false}],
    ['앤서니 고돈', 'LW', 83, '카탈루냐 블라우', '잉글랜드', {"squad":true,"unreleased":false}],
    ['다니 올모르', 'CAM', 84, '카탈루냐 블라우', '스페인', {"squad":true,"unreleased":false}],
    ['프렌키 더 요른', 'CM', 85, '카탈루냐 블라우', '네덜란드', {"squad":true,"unreleased":false}],
    ['쥘 쿤덴', 'CB', 85, '카탈루냐 블라우', '프랑스', {"squad":true,"unreleased":false}],
    ['안토닌', 'RW', 84, '베티스 베르데', '브라질', {"squad":true,"unreleased":false}],
    ['이스콘', 'CAM', 83, '베티스 베르데', '스페인', {"squad":true,"unreleased":false}],
    ['에데르 밀리당', 'CB', 84, '마드리드 블랑코', '브라질', {"squad":true,"unreleased":false}],
    ['딘 하위섬', 'CB', 82, '마드리드 블랑코', '스페인', {"squad":true,"unreleased":false}],
    ['에두아르도 카마빙간', 'CM', 84, '마드리드 블랑코', '프랑스', {"squad":true,"unreleased":false}],
    ['호드리군', 'RW', 85, '마드리드 블랑코', '브라질', {"squad":true,"unreleased":false}],
    ['트렌트 알렉산더아널든', 'RB', 84, '마드리드 블랑코', '잉글랜드', {"squad":true,"unreleased":false}],
    ['오렐리앵 추아메닌', 'CDM', 84, '마드리드 블랑코', '프랑스', {"squad":true,"unreleased":false}],
    ['아르다 귈레른', 'CAM', 84, '마드리드 블랑코', '튀르키예', {"squad":true,"unreleased":false}],
    ['이브라히마 코나텐', 'CB', 84, '마드리드 블랑코', '프랑스', {"squad":true,"unreleased":false}],
    ['마르크 쿠쿠레얀', 'LB', 82, '마드리드 블랑코', '스페인', {"squad":true,"unreleased":false}],
    ['베르나르두 실반', 'RW', 85, '마드리드 블랑코', '포르투갈', {"squad":true,"unreleased":false}],
    ['안토니오 뤼디건', 'CB', 84, '마드리드 블랑코', '독일', {"squad":true,"unreleased":false}],
    ['덴젤 뒴프리손', 'RB', 82, '마드리드 블랑코', '네덜란드', {"squad":true,"unreleased":false}],
    ['미켈 오야르사발라', 'ST', 84, '도노스티 추리우르딘', '스페인', {"squad":true,"unreleased":false}],
    ['쿠보 다케후산', 'RW', 83, '도노스티 추리우르딘', '일본', {"squad":true,"unreleased":false}],
  ],
  World: [
    ['브루노 페르난도', 'CAM', 88, '맨체스 레즈', '포르투갈', {"squad":true,"unreleased":false}],
    ['다비드 라얀', 'GK', 87, '북런던 건너스', '스페인', {"squad":true,"unreleased":false}],
    ['윌리엄 살리반', 'CB', 88, '북런던 건너스', '프랑스', {"squad":true,"unreleased":false}],
    ['가브리엘 마갈량스', 'CB', 87, '북런던 건너스', '브라질', {"squad":true,"unreleased":false}],
    ['마르틴 외데가르', 'CAM', 87, '북런던 건너스', '노르웨이', {"squad":true,"unreleased":false}],
    ['브루누 기마랑스', 'CM', 86, '북런던 건너스', '브라질', {"squad":true,"unreleased":false}],
    ['데클란 라이슨', 'CM', 88, '북런던 건너스', '잉글랜드', {"squad":true,"unreleased":false}],
    ['부카요 사칸', 'RW', 89, '북런던 건너스', '잉글랜드', {"squad":true,"unreleased":false}],
    ['빅토르 요케레손', 'ST', 87, '북런던 건너스', '스웨덴', {"squad":true,"unreleased":false}],
    ['에밀리아노 마르티네소', 'GK', 86, '런던 블루스', '아르헨티나', {"squad":true,"unreleased":false}],
    ['콜 파메르', 'CAM', 89, '런던 블루스', '잉글랜드', {"squad":true,"unreleased":false}],
    ['모이세스 카이세두', 'CDM', 89, '런던 블루스', '에콰도르', {"squad":true,"unreleased":false}],
    ['알리송 베케른', 'GK', 87, '리버 머지', '브라질', {"squad":true,"unreleased":false}],
    ['버질 판다이큰', 'CB', 88, '리버 머지', '네덜란드', {"squad":true,"unreleased":false}],
    ['플로리안 비르추', 'CAM', 89, '리버 머지', '독일', {"squad":true,"unreleased":false}],
    ['도미니크 소보슬러인', 'CM', 86, '리버 머지', '헝가리', {"squad":true,"unreleased":false}],
    ['알렉산데르 이사큰', 'ST', 88, '리버 머지', '스웨덴', {"squad":true,"unreleased":false}],
    ['알렉시스 맥알리스턴', 'CM', 86, '리버 머지', '아르헨티나', {"squad":true,"unreleased":false}],
    ['잔루이지 돈나룸만', 'GK', 88, '맨체스 블루', '이탈리아', {"squad":true,"unreleased":false}],
    ['후벵 디아손', 'CB', 86, '맨체스 블루', '포르투갈', {"squad":true,"unreleased":false}],
    ['엘링 홀란드', 'ST', 92, '맨체스 블루', '노르웨이', {"squad":true,"unreleased":false}],
    ['필 포드느', 'CAM', 86, '맨체스 블루', '잉글랜드', {"squad":true,"unreleased":false}],
    ['니코 윌리엄슨', 'LW', 87, '바스크 아슬레', '스페인', {"squad":true,"unreleased":false}],
    ['얀 오블라킨', 'GK', 86, '마드리드 로히', '슬로베니아', {"squad":true,"unreleased":false}],
    ['훌리안 알바레노', 'ST', 88, '마드리드 로히', '아르헨티나', {"squad":true,"unreleased":false}],
    ['페드린', 'CM', 89, '카탈루냐 블라우', '스페인', {"squad":true,"unreleased":false}],
    ['라민 야멀', 'RW', 91, '카탈루냐 블라우', '스페인', {"squad":true,"unreleased":false}],
    ['하피뇨', 'LW', 88, '카탈루냐 블라우', '브라질', {"squad":true,"unreleased":false}],
    ['로드린', 'CDM', 87, '카탈루냐 블라우', '스페인', {"squad":true,"unreleased":false}],
    ['티보 쿠르투안', 'GK', 88, '마드리드 블랑코', '벨기에', {"squad":true,"unreleased":false}],
    ['주드 벨링험', 'CAM', 89, '마드리드 블랑코', '잉글랜드', {"squad":true,"unreleased":false}],
    ['비니시우스 주니오른', 'LW', 89, '마드리드 블랑코', '브라질', {"squad":true,"unreleased":false}],
    ['페데리코 발베르덴', 'CM', 87, '마드리드 블랑코', '우루과이', {"squad":true,"unreleased":false}],
    ['킬리안 음바펜', 'ST', 92, '마드리드 블랑코', '프랑스', {"squad":true,"unreleased":false}],
  ],
}

/** 실제 스쿼드가 있는 클럽과 그 리그 — CLUBS에 없는 클럽(승격팀 등)을 보탠다. */
export const SQUAD_CLUBS: ClubDef[] = [
  {
    "name": "울산 호랑",
    "league": "코리아 리그"
  },
  {
    "name": "맨체스 레즈",
    "league": "킹덤 리그"
  },
  {
    "name": "북런던 건너스",
    "league": "킹덤 리그"
  },
  {
    "name": "아스톤 라이온",
    "league": "킹덤 리그"
  },
  {
    "name": "브렌트 벌",
    "league": "킹덤 리그"
  },
  {
    "name": "본머스 체리",
    "league": "킹덤 리그"
  },
  {
    "name": "브라이턴 걸스",
    "league": "킹덤 리그"
  },
  {
    "name": "런던 블루스",
    "league": "킹덤 리그"
  },
  {
    "name": "코번트리 스카이",
    "league": "킹덤 리그"
  },
  {
    "name": "크리스탈 이글",
    "league": "킹덤 리그"
  },
  {
    "name": "에버턴 토피",
    "league": "킹덤 리그"
  },
  {
    "name": "풀럼 코티지",
    "league": "킹덤 리그"
  },
  {
    "name": "헐 타이거",
    "league": "이베리아 리가"
  },
  {
    "name": "입스위치 트랙터",
    "league": "이베리아 리가"
  },
  {
    "name": "리즈 화이트",
    "league": "이베리아 리가"
  },
  {
    "name": "리버 머지",
    "league": "이베리아 리가"
  },
  {
    "name": "맨체스 블루",
    "league": "이베리아 리가"
  },
  {
    "name": "뉴캐슬 매파이",
    "league": "이베리아 리가"
  },
  {
    "name": "노팅엄 포레스터",
    "league": "이베리아 리가"
  },
  {
    "name": "선덜랜드 블랙캣",
    "league": "이베리아 리가"
  },
  {
    "name": "북런던 화이트",
    "league": "이베리아 리가"
  },
  {
    "name": "알라베스 아술",
    "league": "이베리아 리가"
  },
  {
    "name": "바스크 아슬레",
    "league": "이베리아 리가"
  },
  {
    "name": "마드리드 로히",
    "league": "이베리아 리가"
  },
  {
    "name": "카탈루냐 블라우",
    "league": "이베리아 리가"
  },
  {
    "name": "비고 셀레스테",
    "league": "이베리아 리가"
  },
  {
    "name": "코루냐 블랑키아술",
    "league": "이베리아 리가"
  },
  {
    "name": "엘체 프란히베르데",
    "league": "이베리아 리가"
  },
  {
    "name": "에스파뇰 페리케",
    "league": "이베리아 리가"
  },
  {
    "name": "헤타페 아술",
    "league": "이베리아 리가"
  },
  {
    "name": "레반테 그라노타",
    "league": "이베리아 리가"
  },
  {
    "name": "말라가 보케론",
    "league": "이베리아 리가"
  },
  {
    "name": "오사수나 로하",
    "league": "이베리아 리가"
  },
  {
    "name": "산탄데르 베르디블랑",
    "league": "이베리아 리가"
  },
  {
    "name": "라요 프랑코",
    "league": "이베리아 리가"
  },
  {
    "name": "베티스 베르데",
    "league": "이베리아 리가"
  },
  {
    "name": "마드리드 블랑코",
    "league": "이베리아 리가"
  },
  {
    "name": "도노스티 추리우르딘",
    "league": "이베리아 리가"
  },
  {
    "name": "세비야 로호",
    "league": "이베리아 리가"
  },
  {
    "name": "발렌시아 무르시엘",
    "league": "이베리아 리가"
  },
  {
    "name": "비야레 수브마리노",
    "league": "이베리아 리가"
  },
  {
    "name": "앙제 SCO",
    "league": "이베리아 리가"
  },
  {
    "name": "오세르 부르고",
    "league": "이베리아 리가"
  },
  {
    "name": "브레스트 피라트",
    "league": "이베리아 리가"
  },
  {
    "name": "르아브르 시엘",
    "league": "이베리아 리가"
  },
  {
    "name": "르망 시르퀴",
    "league": "이베리아 리가"
  },
  {
    "name": "랑스 상글리에",
    "league": "이베리아 리가"
  },
  {
    "name": "릴 도그",
    "league": "이베리아 리가"
  },
  {
    "name": "로리앙 메를뤼",
    "league": "이베리아 리가"
  }
]

/** 공개된(pilot 아님) 실제 스쿼드 클럽 — 같은 클럽의 옛 생성 카드는 뽑기 풀에서 빠진다. */
export const SQUAD_REPLACED_CLUBS: string[] = [
  "맨체스 레즈",
  "북런던 건너스",
  "아스톤 라이온",
  "브렌트 벌",
  "본머스 체리",
  "브라이턴 걸스",
  "런던 블루스",
  "코번트리 스카이",
  "크리스탈 이글",
  "에버턴 토피",
  "풀럼 코티지",
  "헐 타이거",
  "입스위치 트랙터",
  "리즈 화이트",
  "리버 머지",
  "맨체스 블루",
  "뉴캐슬 매파이",
  "노팅엄 포레스터",
  "선덜랜드 블랙캣",
  "북런던 화이트",
  "알라베스 아술",
  "바스크 아슬레",
  "마드리드 로히",
  "카탈루냐 블라우",
  "비고 셀레스테",
  "코루냐 블랑키아술",
  "엘체 프란히베르데",
  "에스파뇰 페리케",
  "헤타페 아술",
  "레반테 그라노타",
  "말라가 보케론",
  "오사수나 로하",
  "산탄데르 베르디블랑",
  "라요 프랑코",
  "베티스 베르데",
  "마드리드 블랑코",
  "도노스티 추리우르딘",
  "세비야 로호",
  "발렌시아 무르시엘",
  "비야레 수브마리노",
  "앙제 SCO",
  "오세르 부르고",
  "브레스트 피라트",
  "르아브르 시엘",
  "르망 시르퀴",
  "랑스 상글리에",
  "릴 도그",
  "로리앙 메를뤼"
]

/** 운영자 전용 — 가명 → 실명 (실제 클럽 #등번호). 정확한 1:1 매핑. */
export const SQUAD_REAL_HINTS: Record<string, string> = {
  "최주헌": "최주호 (울산 HD FC #1)",
  "윤중규": "윤종규 (울산 HD FC #2)",
  "정선빈": "정성빈 (울산 HD FC #3)",
  "서명권": "서명관 (울산 HD FC #4)",
  "다리안 보야닉": "다리얀 보야니치 (울산 HD FC #6)",
  "이희근": "이희균 (울산 HD FC #8)",
  "마르카노": "마르캉 (울산 HD FC #9)",
  "이동겸": "이동경 (울산 HD FC #10)",
  "에릭 파리스": "에릭 파리아스 (울산 HD FC #11)",
  "류승민": "류성민 (울산 HD FC #13)",
  "이진헌": "이진현 (울산 HD FC #14)",
  "정승헌": "정승현 (울산 HD FC #15)",
  "박우재": "박우진 (울산 HD FC #16)",
  "강상유": "강상우 (울산 HD FC #17)",
  "김영궁": "김영권 (울산 HD FC #19)",
  "정재삼": "정재상 (울산 HD FC #20)",
  "조현운": "조현우 (울산 HD FC #21)",
  "문정일": "문정인 (울산 HD FC #23)",
  "이규선": "이규성 (울산 HD FC #24)",
  "조현탁": "조현택 (울산 HD FC #26)",
  "페드리노": "페드리뉴 (울산 HD FC #27)",
  "이재억": "이재익 (울산 HD FC #28)",
  "황병건": "황병근 (울산 HD FC #31)",
  "장시연": "장시영 (울산 HD FC #33)",
  "박용유": "박용우 (울산 HD FC #38)",
  "조민석": "조민서 (울산 HD FC #43)",
  "토마스 오데코트": "토마스 아우더 코터 (울산 HD FC #55)",
  "밀로시 트로약": "미워시 트로야크 (울산 HD FC #66)",
  "백인유": "백인우 (울산 HD FC #72)",
  "심상만": "심상민 (울산 HD FC #77)",
  "벤지 미셀": "벤지 미셸 (울산 HD FC #91)",
  "최석헌": "최석현 (울산 HD FC #96)",
  "야고 카리엘": "야고 카리엘로 (울산 HD FC #99)",
  "세네 라멘츠": "세너 라멘스 (맨체스터 유나이티드 #1)",
  "디오고 달로": "디오구 달롯 (맨체스터 유나이티드 #2)",
  "누사이르 마즈라우": "누사이르 마즈라위 (맨체스터 유나이티드 #3)",
  "마테이스 데 리트": "마테이스 더 리흐트 (맨체스터 유나이티드 #4)",
  "해리 맥과이": "해리 매과이어 (맨체스터 유나이티드 #5)",
  "리산드로 마르티노": "리산드로 마르티네스 (맨체스터 유나이티드 #6)",
  "메이슨 마운드": "메이슨 마운트 (맨체스터 유나이티드 #7)",
  "브루노 페르난도": "브루노 페르난데스 (맨체스터 유나이티드 #8)",
  "마커스 래시포": "마커스 래시퍼드 (맨체스터 유나이티드 #9)",
  "마테우스 쿠뉴": "마테우스 쿠냐 (맨체스터 유나이티드 #10)",
  "조슈아 지르크": "조슈아 지르크지 (맨체스터 유나이티드 #11)",
  "칼 다를로": "칼 달로 (맨체스터 유나이티드 #12)",
  "패트릭 도르그": "패트릭 도르구 (맨체스터 유나이티드 #13)",
  "레니 요루": "레니 요로 (맨체스터 유나이티드 #15)",
  "아마드 디알": "아마드 디알로 (맨체스터 유나이티드 #16)",
  "안드레이 산토": "안드레이 산투스 (맨체스터 유나이티드 #17)",
  "유리 틸레망": "유리 틸레만스 (맨체스터 유나이티드 #18)",
  "브라이언 음보모": "브라이언 음뵈모 (맨체스터 유나이티드 #19)",
  "카를로스 발레브": "카를로스 발레바 (맨체스터 유나이티드 #20)",
  "톰 히튼": "톰 히턴 (맨체스터 유나이티드 #22)",
  "루크 쇼어": "루크 쇼 (맨체스터 유나이티드 #23)",
  "마누엘 우가르타": "마누엘 우가르테 (맨체스터 유나이티드 #25)",
  "에이든 헤번": "에이든 헤븐 (맨체스터 유나이티드 #26)",
  "벤야민 셰스코": "벤야민 셰슈코 (맨체스터 유나이티드 #30)",
  "셰이 레이스": "셰이 레이시 (맨체스터 유나이티드 #31)",
  "코비 마이노": "코비 마이누 (맨체스터 유나이티드 #37)",
  "잭 플레쳐": "잭 플레처 (맨체스터 유나이티드 #38)",
  "타일러 플레쳐": "타일러 플레처 (맨체스터 유나이티드 #39)",
  "해리 아마즈": "해리 아마스 (맨체스터 유나이티드 #41)",
  "더못 미이": "더못 미 (맨체스터 유나이티드 #45)",
  "다비드 라얀": "다비드 라야 (아스널 #1)",
  "케파 아리사발라고": "케파 아리사발라가 (아스널 #13)",
  "일랑 멜리어": "일랑 멜리에 (아스널 #30)",
  "윌리엄 살리반": "윌리앙 살리바 (아스널 #2)",
  "크리스티안 모스케로": "크리스티안 모스케라 (아스널 #3)",
  "벤 화이터": "벤 화이트 (아스널 #4)",
  "피에로 인카피오": "피에로 인카피에 (아스널 #5)",
  "가브리엘 마갈량스": "가브리엘 마갈량이스 (아스널 #6)",
  "유리엔 팀베르": "유리엔 팀버 (아스널 #12)",
  "에즈리 콘살": "에즈리 콘사 (아스널 #15)",
  "리카르도 칼라피오레": "리카르도 칼라피오리 (아스널 #33)",
  "마일스 루이스켈리": "마일스 루이스스켈리 (아스널 #49)",
  "마르틴 외데가르": "마르틴 외데가르드 (아스널 #8)",
  "에베레치 에젬": "에베레치 에제 (아스널 #10)",
  "미켈 메리나": "미켈 메리노 (아스널 #23)",
  "마르틴 수비멘도": "마르틴 수비멘디 (아스널 #36)",
  "브루누 기마랑스": "브루누 기마랑이스 (아스널 #39)",
  "데클란 라이슨": "데클란 라이스 (아스널 #41)",
  "부카요 사칸": "부카요 사카 (아스널 #7)",
  "빅토르 요케레손": "빅토르 요케레스 (아스널 #14)",
  "흐리스토스 촐리소": "흐리스토스 촐리스 (아스널 #17)",
  "노니 마두에코": "노니 마두에케 (아스널 #20)",
  "카이 하베르치": "카이 하베르츠 (아스널 #29)",
  "스즈키 자이언": "스즈키 자이온 (애스턴 빌라 #1)",
  "마르코 비조": "마르코 비조트 (애스턴 빌라 #40)",
  "제임스 라이토": "제임스 라이트 (애스턴 빌라 #42)",
  "매티 캐신": "매티 캐시 (애스턴 빌라 #2)",
  "빅토르 린델로프": "빅토르 린델뢰프 (애스턴 빌라 #3)",
  "테일러 하우드벨린": "테일러 하우드벨리스 (애스턴 빌라 #4)",
  "타이론 밍고": "타이론 밍스 (애스턴 빌라 #5)",
  "마테오 루제로": "마테오 루제리 (애스턴 빌라 #13)",
  "파우 토레소": "파우 토레스 (애스턴 빌라 #14)",
  "이안 마트손": "이안 마트센 (애스턴 빌라 #22)",
  "애런 완비사코": "애런 완비사카 (애스턴 빌라 #29)",
  "모두 케바 시소": "모두 케바 시세 (애스턴 빌라 #48)",
  "트래비스 패터손": "트래비스 패터슨 (애스턴 빌라 #55)",
  "로스 바클라": "로스 바클리 (애스턴 빌라 #6)",
  "존 맥기너": "존 맥긴 (애스턴 빌라 #7)",
  "부바카르 카마로": "부바카르 카마라 (애스턴 빌라 #8)",
  "에밀리아노 부엔디오": "에밀리아노 부엔디아 (애스턴 빌라 #10)",
  "자말딘 지모알로반": "자말딘 지모알로바 (애스턴 빌라 #20)",
  "아마두 오나노": "아마두 오나나 (애스턴 빌라 #24)",
  "라마레 보하르도": "라마레 보하르데 (애스턴 빌라 #26)",
  "레온 고레츠코": "레온 고레츠카 (애스턴 빌라 #27)",
  "주앙 고메손": "주앙 고메스 (애스턴 빌라 #35)",
  "요한 만잠보": "요한 만잠비 (애스턴 빌라 #44)",
  "니콜라 잭손": "니콜라 잭슨 (애스턴 빌라 #11)",
  "알레한드로 가르나쇼": "알레한드로 가르나초 (애스턴 빌라 #17)",
  "태미 에이브러함": "태미 에이브러햄 (애스턴 빌라 #18)",
  "이브라힘 음바여": "이브라힘 음바예 (애스턴 빌라 #19)",
  "알리손 주니오": "알리송 (애스턴 빌라 #47)",
  "키빈 켈러하": "키빈 켈러허 (브렌트퍼드 #1)",
  "하콘 발디마르센": "하콘 발디마르손 (브렌트퍼드 #12)",
  "줄리안 아이스턴": "줄리안 아이스톤 (브렌트퍼드 #41)",
  "애런 히코": "애런 히키 (브렌트퍼드 #2)",
  "리코 헨로": "리코 헨리 (브렌트퍼드 #3)",
  "세프 판덴베르크": "세프 판덴베르흐 (브렌트퍼드 #4)",
  "크리스토페르 아예로": "크리스토페르 아예르 (브렌트퍼드 #20)",
  "제이든 메고모": "제이든 메고마 (브렌트퍼드 #21)",
  "네이선 콜린손": "네이선 콜린스 (브렌트퍼드 #22)",
  "말리크 디우포": "엘하지 말리크 디우프 (브렌트퍼드 #25)",
  "마이클 카요도": "마이클 카요데 (브렌트퍼드 #33)",
  "김지승": "김지수 (브렌트퍼드 #36)",
  "예고르 야르몰륙": "예고르 야르몰류크 (브렌트퍼드 #6)",
  "마티아스 옌손": "마티아스 옌센 (브렌트퍼드 #8)",
  "조시 다실반": "조시 다실바 (브렌트퍼드 #10)",
  "파비우 카르발료": "파비우 카르발류 (브렌트퍼드 #14)",
  "안토니 밀람바": "안토니 밀람보 (브렌트퍼드 #17)",
  "마마두 상가로": "마마두 상가레 (브렌트퍼드 #18)",
  "미켈 담스고어": "미켈 담스고르 (브렌트퍼드 #24)",
  "유누스 코나키": "유누스 엠레 코나크 (브렌트퍼드 #26)",
  "비탈리 야넬토": "비탈리 야넬트 (브렌트퍼드 #27)",
  "케빈 샤도": "케빈 샤데 (브렌트퍼드 #7)",
  "이고르 치아고": "이고르 치아구 (브렌트퍼드 #9)",
  "당고 와타로": "당고 와타라 (브렌트퍼드 #11)",
  "칼럼 윌손": "칼럼 윌슨 (브렌트퍼드 #13)",
  "제이든 앤서노": "제이든 앤서니 (브렌트퍼드 #19)",
  "킨 루이스포토": "킨 루이스포터 (브렌트퍼드 #23)",
  "구스타보 누네소": "구스타보 누네스 (브렌트퍼드 #39)",
  "조르제 페트로빈": "조르제 페트로비치 (본머스 #1)",
  "프레이저 포스톤": "프레이저 포스터 (본머스 #17)",
  "미켈레 디 그레고로": "미켈레 디 그레고리오 (본머스 #20)",
  "훌리안 아라우조": "훌리안 아라우호 (본머스 #2)",
  "아드리앵 트뤼페로": "아드리앵 트뤼페르 (본머스 #3)",
  "제임스 힐런": "제임스 힐 (본머스 #5)",
  "훌리오 솔레로": "훌리오 솔레르 (본머스 #6)",
  "안토니우 실반": "안토니우 실바 (본머스 #14)",
  "애덤 스미슨": "애덤 스미스 (본머스 #15)",
  "바포데 디아키토": "바포데 디아키테 (본머스 #18)",
  "후안루 산체소": "후안루 산체스 (본머스 #24)",
  "맥스 애런손": "맥스 애런스 (본머스 #28)",
  "벨코 밀로사블레빈": "벨코 밀로사블레비치 (본머스 #44)",
  "루이스 쿡스": "루이스 쿡 (본머스 #4)",
  "데이비드 브룩손": "데이비드 브룩스 (본머스 #7)",
  "알렉스 스코트": "알렉스 스콧 (본머스 #8)",
  "라이언 크리스토": "라이언 크리스티 (본머스 #10)",
  "타일러 애덤손": "타일러 애덤스 (본머스 #12)",
  "마커스 태버니오": "마커스 태버니어 (본머스 #16)",
  "아민 아들로": "아민 아들리 (본머스 #21)",
  "알렉스 토토": "알렉스 토트 (본머스 #27)",
  "에바닐손": "에바닐송 (본머스 #9)",
  "벤 개넌독": "벤 개넌도크 (본머스 #11)",
  "저스틴 클라위베르": "저스틴 클라위베르트 (본머스 #19)",
  "엘리 크루포": "엘리 주니오르 크루피 (본머스 #22)",
  "대니얼 제비손": "대니얼 제비슨 (본머스 #29)",
  "알바로 로드리게소": "알바로 로드리게스 (본머스 #30)",
  "하이안": "하얀 (본머스 #37)",
  "바르트 페르브뤼헌": "바르트 페르브뤼헨 (브라이턴 #1)",
  "제이슨 스틸런": "제이슨 스틸 (브라이턴 #23)",
  "톰 맥길런": "톰 맥길 (브라이턴 #38)",
  "자우엔 하자모": "자우엔 하잠 (브라이턴 #3)",
  "파스칼 스트라위코": "파스칼 스트라위크 (브라이턴 #4)",
  "루이스 덩크스": "루이스 덩크 (브라이턴 #5)",
  "코스치노": "코스치냐 (브라이턴 #20)",
  "올리비에 보스칼로": "올리비에 보스칼리 (브라이턴 #21)",
  "페르디 카디오글로": "페르디 카디오글루 (브라이턴 #24)",
  "마츠 비페르": "마츠 비퍼 (브라이턴 #27)",
  "막심 더 카위페르": "막심 더 카위퍼 (브라이턴 #29)",
  "미하엘 스보보도": "미하엘 스보보다 (브라이턴 #30)",
  "루카 부슈코빈": "루카 부슈코비치 (브라이턴 #44)",
  "미토마 가오로": "미토마 가오루 (브라이턴 #7)",
  "잭 힌셸우즈": "잭 힌셸우드 (브라이턴 #8)",
  "얀쿠바 민테흐": "얀쿠바 민테 (브라이턴 #11)",
  "파스칼 그로소": "파스칼 그로스 (브라이턴 #13)",
  "체마 안드레소": "체마 안드레스 (브라이턴 #14)",
  "이브라힘 오스마노": "이브라힘 오스만 (브라이턴 #15)",
  "디에고 고메소": "디에고 고메스 (브라이턴 #25)",
  "야신 아야로": "야신 아야리 (브라이턴 #26)",
  "맷 오라일로": "맷 오라일리 (브라이턴 #33)",
  "말리크 얄쿠여": "말리크 얄쿠예 (브라이턴 #35)",
  "자독 요한노": "자독 요한나 (브라이턴 #36)",
  "페미 아지소": "페미 아지즈 (브라이턴 #39)",
  "스테파노스 치마소": "스테파노스 치마스 (브라이턴 #9)",
  "조르지니오 뤼테로": "조르지니오 뤼테르 (브라이턴 #10)",
  "하랄람보스 코스툴라소": "하랄람보스 코스툴라스 (브라이턴 #19)",
  "에반 퍼거손": "에반 퍼거슨 (브라이턴 #28)",
  "에밀리아노 마르티네소": "에밀리아노 마르티네스 (첼시 #1)",
  "테디 샤먼루": "테디 샤먼로 (첼시 #28)",
  "마이크 펜더손": "마이크 펜더스 (첼시 #39)",
  "가브리엘 슬로니노": "가브리엘 슬로니나 (첼시 #44)",
  "마르코 팔레스트로": "마르코 팔레스트라 (첼시 #2)",
  "웨슬리 포파노": "웨슬리 포파나 (첼시 #3)",
  "발렌틴 바르카": "발렌틴 바르코 (첼시 #4)",
  "막상스 라크루오": "막상스 라크루아 (첼시 #5)",
  "레비 콜윈": "레비 콜윌 (첼시 #6)",
  "조렐 하투": "조렐 하토 (첼시 #21)",
  "리스 제임손": "리스 제임스 (첼시 #24)",
  "말로 귀스투": "말로 귀스토 (첼시 #27)",
  "펩 차바리오": "펩 차바리아 (첼시 #29)",
  "아론 안셀미나": "아론 안셀미노 (첼시 #30)",
  "조시 아쳄포": "조시 아쳄퐁 (첼시 #34)",
  "콜 파메르": "콜 파머 (첼시 #10)",
  "조던 헨더손": "조던 헨더슨 (첼시 #14)",
  "모건 로저손": "모건 로저스 (첼시 #17)",
  "모이세스 카이세두": "모이세스 카이세도 (첼시 #25)",
  "로메오 라비오": "로메오 라비아 (첼시 #45)",
  "페드루 네토": "페드루 네투 (첼시 #7)",
  "주앙 페드로": "주앙 페드루 (첼시 #9)",
  "제이미 기튼손": "제이미 기튼스 (첼시 #11)",
  "대니 웰베크": "대니 웰벡 (첼시 #18)",
  "에마뉘엘 에메호": "에마뉘엘 에메하 (첼시 #22)",
  "제오바니 켄도": "제오바니 켄다 (첼시 #23)",
  "이스테반": "이스테방 (첼시 #41)",
  "벤 윌손": "벤 윌슨 (코번트리 시티 #13)",
  "칼 러시워드": "칼 러시워스 (코번트리 시티 #19)",
  "댄 벤틀로": "댄 벤틀리 (코번트리 시티 #25)",
  "이선 피노크": "이선 피녹 (코번트리 시티 #2)",
  "제이 다실보": "제이 다실바 (코번트리 시티 #3)",
  "보비 토머슨": "보비 토머스 (코번트리 시티 #4)",
  "케인 케슬러헤이던": "케인 케슬러헤이든 (코번트리 시티 #20)",
  "제이크 비드웰런": "제이크 비드웰 (코번트리 시티 #21)",
  "조엘 라티보디에": "조엘 라티보디에르 (코번트리 시티 #22)",
  "오렐 아멘도": "오렐 아멘다 (코번트리 시티 #24)",
  "루크 울펜던": "루크 울펜든 (코번트리 시티 #26)",
  "밀란 판 에베이코": "밀란 판 에베이크 (코번트리 시티 #27)",
  "스티븐 음푸노": "스티븐 음푸니 (코번트리 시티 #30)",
  "잭 루도노": "잭 루도니 (코번트리 시티 #5)",
  "맷 그라임손": "맷 그라임스 (코번트리 시티 #6)",
  "케일럽 이렌코": "케일럽 이렌키 (코번트리 시티 #8)",
  "프랭크 오니에코": "프랭크 오니에카 (코번트리 시티 #16)",
  "조시 에클손": "조시 에클스 (코번트리 시티 #28)",
  "빅토르 토르포": "빅토르 토르프 (코번트리 시티 #29)",
  "구스타보 하메르": "구스타보 하머 (코번트리 시티 #38)",
  "얀 그보후": "얀 그보호 (코번트리 시티)",
  "사카모토 다쓰히루": "사카모토 다쓰히로 (코번트리 시티 #7)",
  "엘리스 심손": "엘리스 심스 (코번트리 시티 #9)",
  "에프론 메이슨클라코": "에프론 메이슨클라크 (코번트리 시티 #10)",
  "하지 라이토": "하지 라이트 (코번트리 시티 #11)",
  "타이워 아워니오": "타이워 아워니이 (코번트리 시티 #14)",
  "룸 차우노": "룸 차우나 (코번트리 시티 #18)",
  "브랜던 토머스아산토": "브랜던 토머스아산테 (코번트리 시티 #23)",
  "시디키 셰리포": "시디키 셰리프 (코번트리 시티 #49)",
  "딘 헨더손": "딘 헨더슨 (크리스털 팰리스 #1)",
  "레미 매슈손": "레미 매슈스 (크리스털 팰리스 #31)",
  "발테르 베니테소": "발테르 베니테스 (크리스털 팰리스 #44)",
  "타이릭 미첼런": "타이릭 미첼 (크리스털 팰리스 #3)",
  "샤디 리아도": "샤디 리아드 (크리스털 팰리스 #4)",
  "악셀 디사소": "악셀 디사시 (크리스털 팰리스 #5)",
  "제이디 캉보트": "제이디 캉보 (크리스털 팰리스 #6)",
  "도미야스 다케히루": "도미야스 다케히로 (크리스털 팰리스 #17)",
  "어니스트 아하노": "어니스트 아하노르 (크리스털 팰리스 #21)",
  "아난 칼라일로": "아난 칼라일리 (크리스털 팰리스 #25)",
  "크리스 리처드": "크리스 리처즈 (크리스털 팰리스 #26)",
  "오스카르 밍게소": "오스카르 밍게사 (크리스털 팰리스 #30)",
  "벤 칠웰런": "벤 칠웰 (크리스털 팰리스 #33)",
  "헤페르손 레르모": "헤페르손 레르마 (크리스털 팰리스 #8)",
  "가마다 다이지": "가마다 다이치 (크리스털 팰리스 #18)",
  "윌 휴스": "윌 휴즈 (크리스털 팰리스 #19)",
  "애덤 워톤": "애덤 워턴 (크리스털 팰리스 #20)",
  "퀸턴 팀베르": "퀸턴 팀버 (크리스털 팰리스 #23)",
  "셰이크 두쿠로": "셰이크 두쿠레 (크리스털 팰리스 #28)",
  "이스마일라 사로": "이스마일라 사르 (크리스털 팰리스 #7)",
  "에디 은케티오": "에디 은케티아 (크리스털 팰리스 #9)",
  "예레미 피나": "예레미 피노 (크리스털 팰리스 #10)",
  "드와이트 맥닐런": "드와이트 맥닐 (크리스털 팰리스 #11)",
  "자비에르 고즈": "자비에르 고조 (크리스털 팰리스 #12)",
  "장필리프 마테토": "장필리프 마테타 (크리스털 팰리스 #14)",
  "예르겐 스트란 라르손": "예르겐 스트란 라르센 (크리스털 팰리스 #22)",
  "다리오 오소리아": "다리오 오소리오 (크리스털 팰리스 #24)",
  "에반 게상드": "에반 게상 (크리스털 팰리스 #29)",
  "조던 픽포르": "조던 픽포드 (에버턴 #1)",
  "마크 트래버손": "마크 트래버스 (에버턴 #12)",
  "톰 킹스": "톰 킹 (에버턴 #31)",
  "에인슬리 메이틀랜드나일손": "에인슬리 메이틀랜드나일스 (에버턴 #2)",
  "재러드 브랜스웨이터": "재러드 브랜스웨이트 (에버턴 #4)",
  "마이클 킨스": "마이클 킨 (에버턴 #5)",
  "제임스 타코스코": "제임스 타코스키 (에버턴 #6)",
  "제이크 오브라이엔": "제이크 오브라이언 (에버턴 #15)",
  "비탈리 미콜렌카": "비탈리 미콜렌코 (에버턴 #16)",
  "키어넌 듀스버리홀런": "키어넌 듀스버리홀 (에버턴 #8)",
  "크리스티안 뇌르고어": "크리스티안 뇌르고르 (에버턴 #23)",
  "찰리 알카라소": "찰리 알카라스 (에버턴 #24)",
  "헤이든 해크노": "헤이든 해크니 (에버턴 #30)",
  "메를린 뢸러": "메를린 뢸 (에버턴 #34)",
  "제임스 가너스": "제임스 가너 (에버턴 #37)",
  "해리슨 암스트론": "해리슨 암스트롱 (에버턴 #45)",
  "잭 그릴리소": "잭 그릴리시 (에버턴 #10)",
  "티에르노 바로": "티에르노 바리 (에버턴 #11)",
  "타이리크 조지오": "타이리크 조지 (에버턴 #19)",
  "타일러 디블린": "타일러 디블링 (에버턴 #20)",
  "브레넌 존손": "브레넌 존슨 (에버턴 #22)",
  "베른트 레노어": "베른트 레노 (풀럼 #1)",
  "뱅자맹 르콩테": "뱅자맹 르콩트 (풀럼 #23)",
  "알렉스 보르투": "알렉스 보르토 (풀럼 #36)",
  "케니 테토": "케니 테테 (풀럼 #2)",
  "캘빈 배소": "캘빈 배시 (풀럼 #3)",
  "호르헤 쿠엥코": "호르헤 쿠엥카 (풀럼 #4)",
  "요아킴 아네르손": "요아킴 아네르센 (풀럼 #5)",
  "티모시 카스타뇨": "티모시 카스타뉴 (풀럼 #21)",
  "다비트 아펜그루베르": "다비트 아펜그루버 (풀럼 #22)",
  "앤토니 로빈손": "앤토니 로빈슨 (풀럼 #33)",
  "뤽 드 푸제로": "뤽 드 푸제롤 (풀럼 #44)",
  "해리슨 리드슨": "해리슨 리드 (풀럼 #6)",
  "세사르 팔라시오": "세사르 팔라시오스 (풀럼 #8)",
  "톰 케어노": "톰 케어니 (풀럼 #10)",
  "휴고 라르센": "휴고 라르손 (풀럼 #15)",
  "산데르 베르고": "산데르 베르게 (풀럼 #16)",
  "알렉스 이워보": "알렉스 이워비 (풀럼 #17)",
  "셰이 찰손": "셰이 찰스 (풀럼 #19)",
  "마누엘 앙헬로": "마누엘 앙헬 (풀럼 #20)",
  "조시 킹거": "조시 킹 (풀럼 #24)",
  "라이언 세세뇨": "라이언 세세뇽 (풀럼 #30)",
  "에밀 스미스 로웨": "에밀 스미스 로우 (풀럼 #32)",
  "곤살로 가르시오": "곤살로 가르시아 (풀럼 #7)",
  "로드리구 무니소": "로드리구 무니스 (풀럼 #9)",
  "케비노": "케빙 (풀럼 #11)",
  "오스카르 보브": "오스카르 봅 (풀럼 #14)",
  "요나 쿠시아사로": "요나 쿠시아사레 (풀럼 #18)",
  "잭 버틀런더": "잭 버틀런드 (헐 시티 #1)",
  "루이 코일라": "루이 코일 (헐 시티 #2)",
  "라이언 자일러": "라이언 자일스 (헐 시티 #3)",
  "찰리 휴선": "찰리 휴스 (헐 시티 #4)",
  "모리타 히데마산": "모리타 히데마사 (헐 시티 #5)",
  "세미 아자인": "세미 아자이 (헐 시티 #6)",
  "소르바 토머슨": "소르바 토머스 (헐 시티 #7)",
  "엘리오 마타존": "엘리오 마타조 (헐 시티 #8)",
  "올리 맥버닌": "올리 맥버니 (헐 시티 #9)",
  "모하메드 벨루민": "모하메드 벨루미 (헐 시티 #10)",
  "조 겔하트르": "조 겔하트 (헐 시티 #11)",
  "딜런 필립손": "딜런 필립스 (헐 시티 #12)",
  "옌스 예르퇴달라": "옌스 예르퇴달 (헐 시티 #14)",
  "존 이거른": "존 이건 (헐 시티 #15)",
  "패디 맥네언": "패디 맥네어 (헐 시티 #17)",
  "콘스탄티노스 촐라키손": "콘스탄티노스 촐라키스 (헐 시티 #19)",
  "오스카르 삼브라논": "오스카르 삼브라노 (헐 시티 #20)",
  "엘리엇 스트라우든": "엘리엇 스트라우드 (헐 시티 #21)",
  "맷 타기트": "맷 타깃 (헐 시티 #23)",
  "다르코 갸빈": "다르코 갸비 (헐 시티 #24)",
  "맷 크룩손": "맷 크룩스 (헐 시티 #25)",
  "키어런 다웰라": "키어런 다월 (헐 시티 #26)",
  "리건 슬레이터스": "리건 슬레이터 (헐 시티 #27)",
  "루카스 구르나두아트르": "루카스 구르나두아트 (헐 시티 #29)",
  "데이비드 아킨톨란": "데이비드 아킨톨라 (헐 시티 #30)",
  "노벨 멘딘": "노벨 멘디 (헐 시티 #32)",
  "압뒬카디르 외뮈른": "압뒬카디르 외뮈르 (헐 시티 #33)",
  "팀 이로그분아르": "팀 이로그분암 (헐 시티 #42)",
  "모하메드알리 쇼른": "모하메드알리 쇼 (헐 시티 #50)",
  "알렉스 파머스": "알렉스 파머 (입스위치 타운 #1)",
  "다넬 펄롱크": "다넬 펄롱 (입스위치 타운 #2)",
  "레이프 데이비손": "레이프 데이비스 (입스위치 타운 #3)",
  "세드리크 키프렌": "세드리크 키프레 (입스위치 타운 #4)",
  "아조르 마투시완": "아조르 마투시와 (입스위치 타운 #5)",
  "이사 디오픈": "이사 디오프 (입스위치 타운 #6)",
  "압둘 파타운": "압둘 파타우 (입스위치 타운 #7)",
  "신드레 발레 에겔린": "신드레 발레 에겔리 (입스위치 타운 #8)",
  "지안 플레밍크": "지안 플레밍 (입스위치 타운 #9)",
  "훌리오 엔시손": "훌리오 엔시소 (입스위치 타운 #10)",
  "제이든 필로지느": "제이든 필로진 (입스위치 타운 #11)",
  "플로렌티누 루이손": "플로렌티누 루이스 (입스위치 타운 #12)",
  "잭 테일러스": "잭 테일러 (입스위치 타운 #14)",
  "에메르손드": "에메르손 (입스위치 타운 #19)",
  "케이시 맥아티언": "케이시 맥아티어 (입스위치 타운 #20)",
  "사샤 루키츠": "사샤 루키치 (입스위치 타운 #23)",
  "제이컵 그리브손": "제이컵 그리브스 (입스위치 타운 #24)",
  "에세키엘 팔라시오손": "에세키엘 팔라시오스 (입스위치 타운 #25)",
  "다라 오셰인": "다라 오셰이 (입스위치 타운 #26)",
  "데이비드 버트나": "데이비드 버튼 (입스위치 타운 #27)",
  "크리스천 월터느": "크리스천 월턴 (입스위치 타운 #28)",
  "추바 아크포므": "추바 아크폼 (입스위치 타운 #29)",
  "마르셀리노 누녜노": "마르셀리노 누녜스 (입스위치 타운 #32)",
  "아니스 메메틴": "아니스 메메티 (입스위치 타운 #33)",
  "켈 스헤르페느": "켈 스헤르펜 (입스위치 타운 #37)",
  "마에다 다이제느": "마에다 다이젠 (입스위치 타운 #38)",
  "압둘 우아타란": "압둘 우아타라 (입스위치 타운 #42)",
  "잭 클라크르": "잭 클라크 (입스위치 타운 #47)",
  "제임스 트래퍼든": "제임스 트래퍼드 (리즈 유나이티드 #1)",
  "제이든 보글라": "제이든 보글 (리즈 유나이티드 #2)",
  "가브리엘 구드문드슨드": "가브리엘 구드문드손 (리즈 유나이티드 #3)",
  "이선 암파둔": "이선 암파두 (리즈 유나이티드 #4)",
  "타리크 무하레모비츠": "타리크 무하레모비치 (리즈 유나이티드 #5)",
  "조 로더른": "조 로던 (리즈 유나이티드 #6)",
  "대니얼 제임슨": "대니얼 제임스 (리즈 유나이티드 #7)",
  "션 롱스태프르": "션 롱스태프 (리즈 유나이티드 #8)",
  "도미닉 캘버트르위르": "도미닉 캘버트르윈 (리즈 유나이티드 #9)",
  "해리 윌슨드": "해리 윌슨 (리즈 유나이티드 #10)",
  "브렌던 애런슨드": "브렌던 애런슨 (리즈 유나이티드 #11)",
  "루카스 은메찬": "루카스 은메차 (리즈 유나이티드 #14)",
  "야카 비욜라": "야카 비욜 (리즈 유나이티드 #15)",
  "미하엘 체트런": "미하엘 체트러 (리즈 유나이티드 #16)",
  "안톤 슈타흐르": "안톤 슈타흐 (리즈 유나이티드 #18)",
  "노아 오카포른": "노아 오카포르 (리즈 유나이티드 #19)",
  "알렉스 케언손": "알렉스 케언스 (리즈 유나이티드 #21)",
  "다나카 아온": "다나카 아오 (리즈 유나이티드 #22)",
  "장마테오 바오얀": "장마테오 바오야 (리즈 유나이티드 #23)",
  "제임스 저스티노": "제임스 저스틴 (리즈 유나이티드 #24)",
  "멜뱅 바르드": "멜뱅 바르 (리즈 유나이티드 #26)",
  "니코 엘베딘": "니코 엘베디 (리즈 유나이티드 #30)",
  "일리야 그루에브스": "일리야 그루에프 (리즈 유나이티드 #44)",
  "알리송 베케른": "알리송 베케르 (리버풀 #1)",
  "조 고메손": "조 고메스 (리버풀 #2)",
  "엔도 와타룬": "엔도 와타루 (리버풀 #3)",
  "버질 판다이큰": "버질 판다이크 (리버풀 #4)",
  "제레미 자켄": "제레미 자케 (리버풀 #5)",
  "밀로시 케르케주": "밀로시 케르케즈 (리버풀 #6)",
  "플로리안 비르추": "플로리안 비르츠 (리버풀 #7)",
  "도미니크 소보슬러인": "도미니크 소보슬러이 (리버풀 #8)",
  "알렉산데르 이사큰": "알렉산데르 이사크 (리버풀 #9)",
  "알렉시스 맥알리스턴": "알렉시스 맥알리스터 (리버풀 #10)",
  "코너 브래들린": "코너 브래들리 (리버풀 #12)",
  "페데리코 키에산": "페데리코 키에사 (리버풀 #14)",
  "조반니 레오닌": "조반니 레오니 (리버풀 #15)",
  "코디 학폰": "코디 학포 (리버풀 #18)",
  "코스타스 치미카손": "코스타스 치미카스 (리버풀 #21)",
  "위고 에키티켄": "위고 에키티케 (리버풀 #22)",
  "빅토르 무뇨손": "빅토르 무뇨스 (리버풀 #23)",
  "기오르기 마마르다시빌린": "기오르기 마마르다시빌리 (리버풀 #25)",
  "프레디 우드먼드": "프레디 우드먼 (리버풀 #28)",
  "브래들리 바르콜란": "브래들리 바르콜라 (리버풀 #29)",
  "제레미 프림퐁그": "제레미 프림퐁 (리버풀 #30)",
  "로날드 아라우혼": "로날드 아라우호 (리버풀 #33)",
  "라이언 흐라번베르흐트": "라이언 흐라번베르흐 (리버풀 #38)",
  "트레이 뇨닌": "트레이 뇨니 (리버풀 #42)",
  "제임스 매코널라": "제임스 매코널 (리버풀 #53)",
  "비테즐라프 야로신": "비테즐라프 야로시 (리버풀 #56)",
  "리오 응구모한": "리오 응구모하 (리버풀 #73)",
  "잔루이지 돈나룸만": "잔루이지 돈나룸마 (맨체스터 시티 #1)",
  "후벵 디아손": "후벵 디아스 (맨체스터 시티 #3)",
  "엘리엇 앤더슨드": "엘리엇 앤더슨 (맨체스터 시티 #5)",
  "마크 게힌": "마크 게히 (맨체스터 시티 #6)",
  "일리만 은디아옌": "일리만 은디아예 (맨체스터 시티 #7)",
  "마테오 코바치츠": "마테오 코바치치 (맨체스터 시티 #8)",
  "엘링 홀란드": "엘링 홀란 (맨체스터 시티 #9)",
  "라얀 셰르킨": "라얀 셰르키 (맨체스터 시티 #10)",
  "제레미 도쿤": "제레미 도쿠 (맨체스터 시티 #11)",
  "마커스 베티넬린": "마커스 베티넬리 (맨체스터 시티 #13)",
  "엔소 페르난데손": "엔소 페르난데스 (맨체스터 시티 #17)",
  "라얀 아이트누린": "라얀 아이트누리 (맨체스터 시티 #21)",
  "비토르 헤이손": "비토르 헤이스 (맨체스터 시티 #22)",
  "요슈코 그바르디올라": "요슈코 그바르디올 (맨체스터 시티 #24)",
  "마테우스 누네손": "마테우스 누네스 (맨체스터 시티 #27)",
  "헤로니모 룰린": "헤로니모 룰리 (맨체스터 시티 #28)",
  "아유브 부아딘": "아유브 부아디 (맨체스터 시티 #32)",
  "니코 오라일린": "니코 오라일리 (맨체스터 시티 #33)",
  "알란드": "알란 (맨체스터 시티 #37)",
  "앙투안 세메뇬": "앙투안 세메뇨 (맨체스터 시티 #42)",
  "압두코디르 후사노브스": "압두코디르 후사노프 (맨체스터 시티 #45)",
  "필 포드느": "필 포든 (맨체스터 시티 #47)",
  "조시 윌슨에스브랜든": "조시 윌슨에스브랜드 (맨체스터 시티 #59)",
  "리코 루이손": "리코 루이스 (맨체스터 시티 #82)",
  "닉 포픈": "닉 포프 (뉴캐슬 유나이티드 #1)",
  "티노 리브라멘톤": "티노 리브라멘토 (뉴캐슬 유나이티드 #2)",
  "루이스 홀라": "루이스 홀 (뉴캐슬 유나이티드 #3)",
  "스벤 보트마르": "스벤 보트만 (뉴캐슬 유나이티드 #4)",
  "파비안 셰언": "파비안 셰어 (뉴캐슬 유나이티드 #5)",
  "니코 곤살레손": "니코 곤살레스 (뉴캐슬 유나이티드 #6)",
  "조엘린토느": "조엘린톤 (뉴캐슬 유나이티드 #7)",
  "알라지 밤반": "알라지 밤바 (뉴캐슬 유나이티드 #8)",
  "요안 위산": "요안 위사 (뉴캐슬 유나이티드 #9)",
  "윌리엄 오술란": "윌리엄 오술라 (뉴캐슬 유나이티드 #10)",
  "하비 반손": "하비 반스 (뉴캐슬 유나이티드 #11)",
  "말리크 티아운": "말리크 티아우 (뉴캐슬 유나이티드 #12)",
  "션 스퇴른": "션 스퇴르 (뉴캐슬 유나이티드 #14)",
  "바주마나 투렌": "바주마나 투레 (뉴캐슬 유나이티드 #17)",
  "안토니 엘랑간": "안토니 엘랑가 (뉴캐슬 유나이티드 #19)",
  "마티아스 페르난데스파르돈": "마티아스 페르난데스파르도 (뉴캐슬 유나이티드 #20)",
  "루카시 호르니체큰": "루카시 호르니체크 (뉴캐슬 유나이티드 #21)",
  "제이컵 머핀": "제이컵 머피 (뉴캐슬 유나이티드 #23)",
  "유언 자우에느": "유언 자우엔 (뉴캐슬 유나이티드 #24)",
  "조 윌로큰": "조 윌록 (뉴캐슬 유나이티드 #28)",
  "마크 길레스핀": "마크 길레스피 (뉴캐슬 유나이티드 #29)",
  "댄 버느": "댄 번 (뉴캐슬 유나이티드 #33)",
  "아마르 데디츠": "아마르 데디치 (뉴캐슬 유나이티드 #37)",
  "제이컵 램진": "제이컵 램지 (뉴캐슬 유나이티드 #41)",
  "루이스 마일린": "루이스 마일리 (뉴캐슬 유나이티드 #67)",
  "우스만 디오망덴": "우스만 디오망데 (노팅엄 포레스트 #2)",
  "네코 윌리엄손": "네코 윌리엄스 (노팅엄 포레스트 #3)",
  "무릴룬": "무릴루 (노팅엄 포레스트 #5)",
  "이브라힘 상가렌": "이브라힘 상가레 (노팅엄 포레스트 #6)",
  "칼럼 허드슨오도인": "칼럼 허드슨오도이 (노팅엄 포레스트 #7)",
  "니콜라스 도밍게노": "니콜라스 도밍게스 (노팅엄 포레스트 #8)",
  "크리스 우든": "크리스 우드 (노팅엄 포레스트 #9)",
  "모건 깁스화이튼": "모건 깁스화이트 (노팅엄 포레스트 #10)",
  "이고르 제주손": "이고르 제주스 (노팅엄 포레스트 #11)",
  "존 빅토른": "존 빅토르 (노팅엄 포레스트 #12)",
  "단 은도옌": "단 은도예 (노팅엄 포레스트 #14)",
  "아르노 칼리무엔돈": "아르노 칼리무엔도 (노팅엄 포레스트 #15)",
  "리암 델라픈": "리암 델랍 (노팅엄 포레스트 #19)",
  "크사버 슐라거스": "크사버 슐라거 (노팅엄 포레스트 #21)",
  "라이언 예이추": "라이언 예이츠 (노팅엄 포레스트 #22)",
  "자이르 쿠냔": "자이르 쿠냐 (노팅엄 포레스트 #23)",
  "제임스 매카틴": "제임스 매카티 (노팅엄 포레스트 #24)",
  "루카 네추": "루카 네츠 (노팅엄 포레스트 #25)",
  "마츠 셀손": "마츠 셀스 (노팅엄 포레스트 #26)",
  "다니엘 무뇨손": "다니엘 무뇨스 (노팅엄 포레스트 #27)",
  "니콜라 밀렌코비츠": "니콜라 밀렌코비치 (노팅엄 포레스트 #31)",
  "슈테펜 벤단": "슈테펜 벤다 (노팅엄 포레스트 #33)",
  "올라 아이난": "올라 아이나 (노팅엄 포레스트 #34)",
  "니콜로 사보난": "니콜로 사보나 (노팅엄 포레스트 #37)",
  "케빈 단손": "케빈 단소 (선덜랜드 #4)",
  "대니얼 밸러든": "대니얼 밸러드 (선덜랜드 #5)",
  "다얀 메탈린": "다얀 메탈리 (선덜랜드 #6)",
  "솀스딘 탈빈": "솀스딘 탈비 (선덜랜드 #7)",
  "앨런 브라운드": "앨런 브라운 (선덜랜드 #8)",
  "브라이언 브로베인": "브라이언 브로베이 (선덜랜드 #9)",
  "닐손 앙굴론": "닐손 앙굴로 (선덜랜드 #10)",
  "크리스 리근": "크리스 리그 (선덜랜드 #11)",
  "토마 뫼니엔": "토마 뫼니에 (선덜랜드 #12)",
  "루크 오니언드": "루크 오니언 (선덜랜드 #13)",
  "로메인 문들라": "로메인 문들 (선덜랜드 #14)",
  "오마르 알데레텐": "오마르 알데레테 (선덜랜드 #15)",
  "레이닐둔": "레이닐두 (선덜랜드 #17)",
  "윌슨 이시도른": "윌슨 이시도르 (선덜랜드 #18)",
  "하비브 디아란": "하비브 디아라 (선덜랜드 #19)",
  "노르디 무키엘렌": "노르디 무키엘레 (선덜랜드 #20)",
  "사이먼 무언": "사이먼 무어 (선덜랜드 #21)",
  "로빈 루프손": "로빈 루프스 (선덜랜드 #22)",
  "노아 사디킨": "노아 사디키 (선덜랜드 #27)",
  "엔조 르 펜": "엔조 르 페 (선덜랜드 #28)",
  "쥘 아오칸": "쥘 아오카 (선덜랜드 #29)",
  "멜케르 엘보린": "멜케르 엘보리 (선덜랜드 #31)",
  "트라이 흄드": "트라이 흄 (선덜랜드 #32)",
  "그라니트 자칸": "그라니트 자카 (선덜랜드 #34)",
  "조슬랭 타 빈": "조슬랭 타 비 (선덜랜드 #37)",
  "말리크 포파난": "말리크 포파나 (선덜랜드 #39)",
  "아지 알레센": "아지 알레세 (선덜랜드 #42)",
  "압둘라 바르": "압둘라 바 (선덜랜드 #46)",
  "앤디 로버트슨드": "앤디 로버트슨 (토트넘 홋스퍼 #3)",
  "토신 아다라비오욘": "토신 아다라비오요 (토트넘 홋스퍼 #4)",
  "마르코스 세네신": "마르코스 세네시 (토트넘 홋스퍼 #5)",
  "얀 파울 판헤켄": "얀 파울 판헤케 (토트넘 홋스퍼 #6)",
  "사비 시몬손": "사비 시몬스 (토트넘 홋스퍼 #7)",
  "코너 갤러거스": "코너 갤러거 (토트넘 홋스퍼 #8)",
  "히샤를리송드": "히샤를리송 (토트넘 홋스퍼 #9)",
  "제임스 매디슨드": "제임스 매디슨 (토트넘 홋스퍼 #10)",
  "마티스 텔라": "마티스 텔 (토트넘 홋스퍼 #11)",
  "데스티니 우도긴": "데스티니 우도기 (토트넘 홋스퍼 #13)",
  "아치 그레인": "아치 그레이 (토트넘 홋스퍼 #14)",
  "루카스 베리발라": "루카스 베리발 (토트넘 홋스퍼 #15)",
  "산드로 토날린": "산드로 토날리 (토트넘 홋스퍼 #16)",
  "사비운": "사비우 (토트넘 홋스퍼 #17)",
  "마테우스 페르난드손": "마테우스 페르난드스 (토트넘 홋스퍼 #18)",
  "도미닉 솔란켄": "도미닉 솔란케 (토트넘 홋스퍼 #19)",
  "모하메드 쿠두손": "모하메드 쿠두스 (토트넘 홋스퍼 #20)",
  "데얀 쿨루셉스킨": "데얀 쿨루셉스키 (토트넘 홋스퍼 #21)",
  "오마르 마르무신": "오마르 마르무시 (토트넘 홋스퍼 #22)",
  "페드로 포론": "페드로 포로 (토트넘 홋스퍼 #23)",
  "미하일로 무드리큰": "미하일로 무드리크 (토트넘 홋스퍼 #27)",
  "윌슨 오도베른": "윌슨 오도베르 (토트넘 홋스퍼 #28)",
  "로드리고 벤탄쿠른": "로드리고 벤탄쿠르 (토트넘 홋스퍼 #30)",
  "안토닌 킨스킨": "안토닌 킨스키 (토트넘 홋스퍼 #31)",
  "벤 데이비손": "벤 데이비스 (토트넘 홋스퍼 #33)",
  "미키 판더페느": "미키 판더펜 (토트넘 홋스퍼 #37)",
  "마르틴 두브라프칸": "마르틴 두브라프카 (토트넘 홋스퍼 #39)",
  "브랜던 오스티느": "브랜던 오스틴 (토트넘 홋스퍼 #40)",
  "안토니오 시베로": "안토니오 시베라 (데포르티보 알라베스 #1)",
  "니콜라스 발렌티노": "니콜라스 발렌티니 (데포르티보 알라베스 #2)",
  "유세프 엔리케르": "유세프 엔리케스 (데포르티보 알라베스 #3)",
  "데니스 수아레노": "데니스 수아레스 (데포르티보 알라베스 #4)",
  "파쿤도 가르세노": "파쿤도 가르세스 (데포르티보 알라베스 #5)",
  "안데르 게바로": "안데르 게바라 (데포르티보 알라베스 #6)",
  "앙헬 페레노": "앙헬 페레스 (데포르티보 알라베스 #7)",
  "안토니오 블랑카": "안토니오 블랑코 (데포르티보 알라베스 #8)",
  "마리아노 디아노": "마리아노 디아스 (데포르티보 알라베스 #9)",
  "카를레스 알레뇨": "카를레스 알레냐 (데포르티보 알라베스 #10)",
  "토니 마르티네르": "토니 마르티네스 (데포르티보 알라베스 #11)",
  "우고 노보안": "우고 노보아 (데포르티보 알라베스 #12)",
  "아드리안 로드리게노": "아드리안 로드리게스 (데포르티보 알라베스 #13)",
  "나우엘 테나글리오": "나우엘 테나글리아 (데포르티보 알라베스 #14)",
  "루카스 보옌": "루카스 보예 (데포르티보 알라베스 #15)",
  "빌레 코스킨": "빌레 코스키 (데포르티보 알라베스 #16)",
  "조니 오톤": "조니 오토 (데포르티보 알라베스 #17)",
  "미켈 로드리게르": "미켈 로드리게스 (데포르티보 알라베스 #18)",
  "파블로 이바네르": "파블로 이바녜스 (데포르티보 알라베스 #19)",
  "아이토르 마냐노": "아이토르 마냐스 (데포르티보 알라베스 #20)",
  "압데 레바흐": "압데 레바크 (데포르티보 알라베스 #21)",
  "미겔 로드리게산": "미겔 로드리게스 (데포르티보 알라베스 #22)",
  "카를로스 프로테소닌": "카를로스 프로테소니 (데포르티보 알라베스 #23)",
  "셀루 디알론": "셀루 디알로 (데포르티보 알라베스 #24)",
  "그레고이르 시비데르스칸": "그레고이르 시비데르스키 (데포르티보 알라베스 #31)",
  "우나이 시몬드": "우나이 시몬 (아틀레틱 빌바오 #1)",
  "다니 비비앙": "다니 비비안 (아틀레틱 빌바오 #3)",
  "아이토르 파레데노": "아이토르 파레데스 (아틀레틱 빌바오 #4)",
  "예라이 알바레노": "예라이 알바레스 (아틀레틱 빌바오 #5)",
  "베냐트 프라도르": "베냐트 프라도스 (아틀레틱 빌바오 #6)",
  "알렉스 베렝게로": "알렉스 베렝게르 (아틀레틱 빌바오 #7)",
  "오이안 산세타": "오이안 산세트 (아틀레틱 빌바오 #8)",
  "이냐키 윌리엄슨": "이냐키 윌리엄스 (아틀레틱 빌바오 #9)",
  "니코 윌리엄슨": "니코 윌리엄스 (아틀레틱 빌바오 #10)",
  "고르카 구루세토": "고르카 구루세타 (아틀레틱 빌바오 #11)",
  "헤수스 아레손": "헤수스 아레소 (아틀레틱 빌바오 #12)",
  "알렉스 파디요": "알렉스 파디야 (아틀레틱 빌바오 #13)",
  "에므리크 라포르타": "에므리크 라포르트 (아틀레틱 빌바오 #14)",
  "우고 린콘드": "우고 린콘 (아틀레틱 빌바오 #15)",
  "이니고 루이스 데 갈라레토": "이니고 루이스 데 갈라레타 (아틀레틱 빌바오 #16)",
  "유리 베르치첸": "유리 베르치체 (아틀레틱 빌바오 #17)",
  "미켈 하우레기사른": "미켈 하우레기사르 (아틀레틱 빌바오 #18)",
  "알레한드로 레곤": "알레한드로 레고 (아틀레틱 빌바오 #20)",
  "마로안 산나딘": "마로안 산나디 (아틀레틱 빌바오 #21)",
  "니코 세라논": "니코 세라노 (아틀레틱 빌바오 #22)",
  "로베르트 나바론": "로베르트 나바로 (아틀레틱 빌바오 #23)",
  "베냐트 헤레나바레노": "베냐트 헤레나바레나 (아틀레틱 빌바오 #24)",
  "알바로 자론": "알바로 자로 (아틀레틱 빌바오 #25)",
  "페이오 카날레노": "페이오 카날레스 (아틀레틱 빌바오 #28)",
  "요아네코 루이잔": "요아네코 루이장 (아틀레틱 빌바오 #31)",
  "후안 무손": "후안 무소 (아틀레티코 마드리드 #1)",
  "오베드 바르가노": "오베드 바르가스 (아틀레티코 마드리드 #3)",
  "로드리고 멘도산": "로드리고 멘도사 (아틀레티코 마드리드 #4)",
  "자니 카르도손": "자니 카르도소 (아틀레티코 마드리드 #5)",
  "코켄": "코케 (아틀레티코 마드리드 #6)",
  "이간인": "이강인 (아틀레티코 마드리드 #7)",
  "파블로 바리오노": "파블로 바리오스 (아틀레티코 마드리드 #8)",
  "알렉산데르 쇠를로타": "알렉산데르 쇠를로트 (아틀레티코 마드리드 #9)",
  "알렉스 바에노": "알렉스 바에나 (아틀레티코 마드리드 #10)",
  "아데몰라 루크몬": "아데몰라 루크만 (아틀레티코 마드리드 #11)",
  "얀 오블라킨": "얀 오블라크 (아틀레티코 마드리드 #13)",
  "마르코스 요렌토": "마르코스 요렌테 (아틀레티코 마드리드 #14)",
  "조너선 데이비스": "조너선 데이비드 (아틀레티코 마드리드 #15)",
  "아르나우 오르티노": "아르나우 오르티스 (아틀레티코 마드리드 #16)",
  "다비드 한츠콘": "다비드 한츠코 (아틀레티코 마드리드 #17)",
  "마르크 푸비요": "마르크 푸비야 (아틀레티코 마드리드 #18)",
  "훌리안 알바레노": "훌리안 알바레스 (아틀레티코 마드리드 #19)",
  "줄리아노 시메오나": "줄리아노 시메오네 (아틀레티코 마드리드 #20)",
  "크리스티안 로메론": "크리스티안 로메로 (아틀레티코 마드리드 #21)",
  "알레한드로 그리말두": "알레한드로 그리말도 (아틀레티코 마드리드 #22)",
  "모르텐 율마르": "모르텐 율만 (아틀레티코 마드리드 #23)",
  "로뱅 르 노르만드": "로뱅 르 노르망 (아틀레티코 마드리드 #24)",
  "살비 에스키베르": "살비 에스키벨 (아틀레티코 마드리드 #25)",
  "다니 마르티네노": "다니 마르티네스 (아틀레티코 마드리드 #30)",
  "조안 가르시안": "조안 가르시아 (FC 바르셀로나 #1)",
  "주앙 칸셀로": "주앙 칸셀루 (FC 바르셀로나 #2)",
  "알레한드로 발덴": "알레한드로 발데 (FC 바르셀로나 #3)",
  "브리안 파리냐노": "브리안 파리냐스 (FC 바르셀로나 #4)",
  "파우 쿠바르신": "파우 쿠바르시 (FC 바르셀로나 #5)",
  "가빈": "가비 (FC 바르셀로나 #6)",
  "페르민 로페노": "페르민 로페스 (FC 바르셀로나 #7)",
  "페드린": "페드리 (FC 바르셀로나 #8)",
  "가브리엘 제주노": "가브리엘 제주스 (FC 바르셀로나 #9)",
  "라민 야멀": "라민 야말 (FC 바르셀로나 #10)",
  "하피뇨": "하피냐 (FC 바르셀로나 #11)",
  "샤비 에스파르타": "샤비 에스파르트 (FC 바르셀로나 #12)",
  "보이치에흐 슈쳉스노": "보이치에흐 슈쳉스니 (FC 바르셀로나 #13)",
  "카림 아데예민": "카림 아데예미 (FC 바르셀로나 #14)",
  "안드레아스 크리스텐센드": "안드레아스 크리스텐센 (FC 바르셀로나 #15)",
  "로드린": "로드리 (FC 바르셀로나 #16)",
  "앤서니 고돈": "앤서니 고든 (FC 바르셀로나 #17)",
  "제라르드 마르티노": "제라르드 마르틴 (FC 바르셀로나 #18)",
  "루니 바르그진": "루니 바르그지 (FC 바르셀로나 #19)",
  "다니 올모르": "다니 올모 (FC 바르셀로나 #20)",
  "프렌키 더 요른": "프렌키 더 용 (FC 바르셀로나 #21)",
  "마르크 베르낼": "마르크 베르날 (FC 바르셀로나 #22)",
  "쥘 쿤덴": "쥘 쿤데 (FC 바르셀로나 #23)",
  "에리크 가르시안": "에리크 가르시아 (FC 바르셀로나 #24)",
  "도미니크 리바코비츠": "도미니크 리바코비치 (FC 바르셀로나 #25)",
  "알타이 바이은드론": "알타이 바이은드르 (셀타 비고 #1)",
  "칼 스타르펠타": "칼 스타르펠트 (셀타 비고 #2)",
  "마르코스 알론사": "마르코스 알론소 (셀타 비고 #3)",
  "압둘라예 파옌": "압둘라예 파예 (셀타 비고 #4)",
  "세르히오 카레이로": "세르히오 카레이라 (셀타 비고 #5)",
  "일라시 모리반": "일라시 모리바 (셀타 비고 #6)",
  "보르하 이글레시아노": "보르하 이글레시아스 (셀타 비고 #7)",
  "미겔 로마르": "미겔 로만 (셀타 비고 #8)",
  "페란 후트글란": "페란 후트글라 (셀타 비고 #9)",
  "이아고 아스파노": "이아고 아스파스 (셀타 비고 #10)",
  "파블로 두란드": "파블로 두란 (셀타 비고 #11)",
  "이오누츠 라둔": "이오누츠 라두 (셀타 비고 #13)",
  "알레익스 페바노": "알레익스 페바스 (셀타 비고 #14)",
  "알바로 누녜노": "알바로 누녜스 (셀타 비고 #15)",
  "우고 곤살레노": "우고 곤살레스 (셀타 비고 #16)",
  "하비 루에단": "하비 루에다 (셀타 비고 #17)",
  "요엘 라곤": "요엘 라고 (셀타 비고 #18)",
  "윌리오트 스베드베린": "윌리오트 스베드베리 (셀타 비고 #19)",
  "하비 로드리게노": "하비 로드리게스 (셀타 비고 #20)",
  "세바스티안 카세레노": "세바스티안 카세레스 (셀타 비고 #21)",
  "하비 갈란드": "하비 갈란 (셀타 비고 #22)",
  "우고 알바레노": "우고 알바레스 (셀타 비고 #23)",
  "쿠하입 드리우에신": "쿠하입 드리우에시 (셀타 비고 #24)",
  "이반 비야른": "이반 비야르 (셀타 비고 #25)",
  "존스 엘압델라윈": "존스 엘압델라위 (셀타 비고 #39)",
  "헤르만 파레뇬": "헤르만 파레뇨 (데포르티보 라코루냐 #1)",
  "아드리아 알티미로": "아드리아 알티미라 (데포르티보 라코루냐 #2)",
  "아르나우 코마노": "아르나우 코마스 (데포르티보 라코루냐 #3)",
  "루카스 누빈": "루카스 누비 (데포르티보 라코루냐 #4)",
  "다니 바르시안": "다니 바르시아 (데포르티보 라코루냐 #5)",
  "마르크 카사돈": "마르크 카사도 (데포르티보 라코루냐 #6)",
  "피에르에메릭 오바메얀드": "피에르에메릭 오바메양 (데포르티보 라코루냐 #7)",
  "디에고 비야레노": "디에고 비야레스 (데포르티보 라코루냐 #8)",
  "자카리아 에다추린": "자카리아 에다추리 (데포르티보 라코루냐 #9)",
  "예레마이 에르난데노": "예레마이 에르난데스 (데포르티보 라코루냐 #10)",
  "다비드 메얀": "다비드 메야 (데포르티보 라코루냐 #11)",
  "자코모 콸리아토": "자코모 콸리아타 (데포르티보 라코루냐 #12)",
  "레오 로마르": "레오 로만 (데포르티보 라코루냐 #13)",
  "리키 로드리게노": "리키 로드리게스 (데포르티보 라코루냐 #14)",
  "미겔 로우레이론": "미겔 로우레이로 (데포르티보 라코루냐 #15)",
  "로렌초 아마투친": "로렌초 아마투치 (데포르티보 라코루냐 #16)",
  "안헬리노": "안헬리뇨 (데포르티보 라코루냐 #17)",
  "요나탄 아스프 옌슨": "요나탄 아스프 옌센 (데포르티보 라코루냐 #18)",
  "루이스미 크루손": "루이스미 크루스 (데포르티보 라코루냐 #19)",
  "호세 마리아 히메네노": "호세 마리아 히메네스 (데포르티보 라코루냐 #20)",
  "마리오 소리아논": "마리오 소리아노 (데포르티보 라코루냐 #21)",
  "시모 나바론": "시모 나바로 (데포르티보 라코루냐 #23)",
  "아다마 트라오렌": "아다마 트라오레 (데포르티보 라코루냐 #24)",
  "알바로 페르난데노": "알바로 페르난데스 (데포르티보 라코루냐 #25)",
  "빌 은송곤": "빌 은송고 (데포르티보 라코루냐 #32)",
  "테윈 헤이설하르타": "테윈 헤이설하르트 (데포르티보 라코루냐 #34)",
  "마티아스 디투론": "마티아스 디투로 (엘체 CF #1)",
  "부바 상가렌": "부바 상가레 (엘체 CF #2)",
  "밤보 디아빈": "밤보 디아비 (엘체 CF #4)",
  "페데리코 레돈두": "페데리코 레돈도 (엘체 CF #5)",
  "페드로 비가노": "페드로 비가스 (엘체 CF #6)",
  "야고 산티아곤": "야고 산티아고 (엘체 CF #7)",
  "마르크 아과돈": "마르크 아과도 (엘체 CF #8)",
  "에세키엘 폰센": "에세키엘 폰세 (엘체 CF #9)",
  "파쿤도 부오나노텐": "파쿤도 부오나노테 (엘체 CF #10)",
  "헤르만 발레란": "헤르만 발레라 (엘체 CF #11)",
  "곤살로 비야른": "곤살로 비야르 (엘체 CF #12)",
  "페르 니논": "페르 니뇨 (엘체 CF #14)",
  "마르팀 네툰": "마르팀 네투 (엘체 CF #16)",
  "호사르": "호산 (엘체 CF #17)",
  "그레이디 디앙가노": "그레이디 디앙가나 (엘체 CF #19)",
  "테테 모렌토": "테테 모렌테 (엘체 CF #20)",
  "루카스 세페단": "루카스 세페다 (엘체 CF #21)",
  "빅토르 추스타": "빅토르 추스트 (엘체 CF #23)",
  "아비엘 오소리온": "아비엘 오소리오 (엘체 CF #24)",
  "마티야 바르지츠": "마티야 바르지치 (엘체 CF #26)",
  "알리 우아린": "알리 우아리 (엘체 CF #29)",
  "아담 보아야른": "아담 보아야르 (엘체 CF #32)",
  "알레한드로 이투르벤": "알레한드로 이투르베 (엘체 CF #43)",
  "하비 모르시욘": "하비 모르시요 (엘체 CF #47)",
  "앙헬 포르투뇬": "앙헬 포르투뇨 (RCD 에스파뇰 #1)",
  "안도니 고로사벨라": "안도니 고로사벨 (RCD 에스파뇰 #2)",
  "킬린츠키 하르트마르": "킬린츠키 하르트만 (RCD 에스파뇰 #3)",
  "우르코 곤살레스 데 사라텐": "우르코 곤살레스 데 사라테 (RCD 에스파뇰 #4)",
  "클레멘스 리델라": "클레멘스 리델 (RCD 에스파뇰 #5)",
  "레안드로 카브레란": "레안드로 카브레라 (RCD 에스파뇰 #6)",
  "하비 푸아돈": "하비 푸아도 (RCD 에스파뇰 #7)",
  "에두 엑스포시톤": "에두 엑스포시토 (RCD 에스파뇰 #8)",
  "로베르토 페르난데노": "로베르토 페르난데스 (RCD 에스파뇰 #9)",
  "폴 로사논": "폴 로사노 (RCD 에스파뇰 #10)",
  "페레 미얀": "페레 미야 (RCD 에스파뇰 #11)",
  "마르코 드미트로비츠": "마르코 드미트로비치 (RCD 에스파뇰 #13)",
  "우나이 누녜노": "우나이 누녜스 (RCD 에스파뇰 #14)",
  "브라이안 사라고산": "브라이안 사라고사 (RCD 에스파뇰 #15)",
  "반야 드르쿠시츠": "반야 드르쿠시치 (RCD 에스파뇰 #16)",
  "호프레 카레라노": "호프레 카레라스 (RCD 에스파뇰 #17)",
  "마르코스 페르난데스코": "마르코스 페르난데스 (RCD 에스파뇰 #18)",
  "키케 가르시안": "키케 가르시아 (RCD 에스파뇰 #19)",
  "가브리엘 모스카르돈": "가브리엘 모스카르도 (RCD 에스파뇰 #20)",
  "로제르 이노혼": "로제르 이노호 (RCD 에스파뇰 #21)",
  "알렉스 칼라트라반": "알렉스 칼라트라바 (RCD 에스파뇰 #22)",
  "오마르 엘 힐랄린": "오마르 엘 힐랄리 (RCD 에스파뇰 #23)",
  "티리스 돌란드": "티리스 돌란 (RCD 에스파뇰 #24)",
  "라펠 바우산": "라펠 바우사 (RCD 에스파뇰 #26)",
  "하비 에르난데산": "하비 에르난데스 (RCD 에스파뇰 #28)",
  "이르지 레타첸": "이르지 레타체크 (헤타페 CF #1)",
  "다코남 제넨": "다코남 제네 (헤타페 CF #2)",
  "다빈친": "다빈치 (헤타페 CF #3)",
  "사바 사조노비": "사바 사조노프 (헤타페 CF #4)",
  "압델 압카른": "압델 압카르 (헤타페 CF #5)",
  "마리오 마르티노": "마리오 마르틴 (헤타페 CF #6)",
  "후안미르": "후안미 (헤타페 CF #7)",
  "네마냐 구델라": "네마냐 구델 (헤타페 CF #8)",
  "보르하 마요란": "보르하 마요랄 (헤타페 CF #9)",
  "마르틴 사트리아논": "마르틴 사트리아노 (헤타페 CF #10)",
  "라몬 테라친": "라몬 테라츠 (헤타페 CF #11)",
  "다비드 소리안": "다비드 소리아 (헤타페 CF #13)",
  "세바스티안 보셀린": "세바스티안 보셀리 (헤타페 CF #15)",
  "프란초 세라논": "프란초 세라노 (헤타페 CF #16)",
  "키코 페메니안": "키코 페메니아 (헤타페 CF #17)",
  "에네스 위날라": "에네스 위날 (헤타페 CF #19)",
  "크리스탄투스 우첸": "크리스탄투스 우체 (헤타페 CF #20)",
  "안드레스 가르시안": "안드레스 가르시아 (헤타페 CF #21)",
  "요한 모히칸": "요한 모히카 (헤타페 CF #22)",
  "오렐 망갈란": "오렐 망갈라 (헤타페 CF #23)",
  "사이드 로메론": "사이드 로메로 (헤타페 CF #24)",
  "장 이브 발룬": "장 이브 발루 (헤타페 CF #26)",
  "파블로 캄포노": "파블로 캄포스 (레반테 UD #1)",
  "아이사 만딘": "아이사 만디 (레반테 UD #2)",
  "이페아니 은두크웬": "이페아니 은두크웨 (레반테 UD #3)",
  "아드리안 델란": "아드리안 델라 (레반테 UD #4)",
  "우고 소텔론": "우고 소텔로 (레반테 UD #5)",
  "다니 레케난": "다니 레케나 (레반테 UD #6)",
  "로제르 브루겐": "로제르 브루게 (레반테 UD #7)",
  "욘 안데르 올라사가스틴": "욘 안데르 올라사가스티 (레반테 UD #8)",
  "이반 로메로스": "이반 로메로 (레반테 UD #9)",
  "카를로스 알바레산": "카를로스 알바레스 (레반테 UD #10)",
  "야니스 무수아인": "야니스 무수아이 (레반테 UD #11)",
  "매슈 라이어드": "매슈 라이언 (레반테 UD #13)",
  "호르헤 카베욘": "호르헤 카베요 (레반테 UD #14)",
  "빅토르 가르시안": "빅토르 가르시아 (레반테 UD #17)",
  "엔조 바르델린": "엔조 바르델리 (레반테 UD #18)",
  "오리올 레인": "오리올 레이 (레반테 UD #20)",
  "카를 에타 에욘": "카를 에타 에용 (레반테 UD #21)",
  "예레미 톨리안드": "예레미 톨리안 (레반테 UD #22)",
  "마누 산체노": "마누 산체스 (레반테 UD #23)",
  "티아고 페르난데노": "티아고 페르난데스 (레반테 UD #24)",
  "파코 코르테노": "파코 코르테스 (레반테 UD #27)",
  "나초 페레노": "나초 페레스 (레반테 UD #29)",
  "알렉스 프리몬": "알렉스 프리모 (레반테 UD #32)",
  "알폰소 에레론": "알폰소 에레로 (말라가 CF #1)",
  "옌스 카유스텐": "옌스 카유스테 (말라가 CF #2)",
  "카를로스 푸간": "카를로스 푸가 (말라가 CF #3)",
  "에이나르 갈릴레안": "에이나르 갈릴레아 (말라가 CF #4)",
  "알렉스 파스토른": "알렉스 파스토르 (말라가 CF #5)",
  "라모른": "라몬 (말라가 CF #6)",
  "하이타름": "하이탐 (말라가 CF #7)",
  "카를로스 도토른": "카를로스 도토르 (말라가 CF #8)",
  "추페텐": "추페테 (말라가 CF #9)",
  "다비드 라루비안": "다비드 라루비아 (말라가 CF #10)",
  "호아킨 무뇨노": "호아킨 무뇨스 (말라가 CF #11)",
  "호세 살리나노": "호세 살리나스 (말라가 CF #12)",
  "라파르": "라파 (말라가 CF #14)",
  "앙헬 레시온": "앙헬 레시오 (말라가 CF #15)",
  "디에고 무리욘": "디에고 무리요 (말라가 CF #16)",
  "에네코 하우레긴": "에네코 하우레기 (말라가 CF #17)",
  "파블로 마르티네산": "파블로 마르티네스 (말라가 CF #18)",
  "후안 크루손": "후안 크루스 (말라가 CF #19)",
  "페르난도 칼레론": "페르난도 칼레로 (말라가 CF #20)",
  "아드리안 니뇬": "아드리안 니뇨 (말라가 CF #21)",
  "다니 로렌손": "다니 로렌소 (말라가 CF #22)",
  "이산 메리논": "이산 메리노 (말라가 CF #23)",
  "훌렌 로베텐": "훌렌 로베테 (말라가 CF #24)",
  "후안 베로칼라": "후안 베로칼 (말라가 CF #25)",
  "라피탄": "라피타 (말라가 CF #31)",
  "아론 오초안": "아론 오초아 (말라가 CF #35)",
  "아담 아즈눈": "아담 아즈누 (말라가 CF #39)",
  "세르히오 에레란": "세르히오 에레라 (CA 오사수나 #1)",
  "호르헤 에란돈": "호르헤 에란도 (CA 오사수나 #5)",
  "루카스 토론": "루카스 토로 (CA 오사수나 #6)",
  "욘 몬카욜란": "욘 몬카욜라 (CA 오사수나 #7)",
  "이케르 무뇨노": "이케르 무뇨스 (CA 오사수나 #8)",
  "라울 가르시안": "라울 가르시아 (CA 오사수나 #9)",
  "아이마르 오로산": "아이마르 오로스 (CA 오사수나 #10)",
  "키케 바르한": "키케 바르하 (CA 오사수나 #11)",
  "아이토르 페르난데노": "아이토르 페르난데스 (CA 오사수나 #13)",
  "루벤 가르시안": "루벤 가르시아 (CA 오사수나 #14)",
  "디에고 리콘": "디에고 리코 (CA 오사수나 #15)",
  "모이 고메노": "모이 고메스 (CA 오사수나 #16)",
  "안테 부디미른": "안테 부디미르 (CA 오사수나 #17)",
  "라울 모론": "라울 모로 (CA 오사수나 #18)",
  "발랑탱 로지엔": "발랑탱 로지에 (CA 오사수나 #19)",
  "조너선 두바생드": "조너선 두바생 (CA 오사수나 #21)",
  "엔조 보요몬": "엔조 보요모 (CA 오사수나 #22)",
  "아벨 브레토네노": "아벨 브레토네스 (CA 오사수나 #23)",
  "알레한드로 카테난": "알레한드로 카테나 (CA 오사수나 #24)",
  "이니고 아르기비덴": "이니고 아르기비데 (CA 오사수나 #27)",
  "아시에르 오삼벨란": "아시에르 오삼벨라 (CA 오사수나 #29)",
  "록슨 예보안": "록슨 예보아 (CA 오사수나 #48)",
  "시몬 에릭슨드": "시몬 에릭손 (라싱 산탄데르 #1)",
  "알바로 만티얀": "알바로 만티야 (라싱 산탄데르 #2)",
  "아론 마르티노": "아론 마르틴 (라싱 산탄데르 #3)",
  "마누 에르난돈": "마누 에르난도 (라싱 산탄데르 #4)",
  "파블로 라모른": "파블로 라몬 (라싱 산탄데르 #5)",
  "이니고 사인스마산": "이니고 사인스마사 (라싱 산탄데르 #6)",
  "기오르기 굴리아시빌린": "기오르기 굴리아시빌리 (라싱 산탄데르 #7)",
  "안드레 알메이단": "안드레 알메이다 (라싱 산탄데르 #8)",
  "후안 카를로스 아라난": "후안 카를로스 아라나 (라싱 산탄데르 #9)",
  "이니고 비센텐": "이니고 비센테 (라싱 산탄데르 #10)",
  "안드레스 마르티노": "안드레스 마르틴 (라싱 산탄데르 #11)",
  "아시에르 비야리브렌": "아시에르 비야리브레 (라싱 산탄데르 #12)",
  "훌렌 아기레사발란": "훌렌 아기레사발라 (라싱 산탄데르 #13)",
  "마게트 게옌": "마게트 게예 (라싱 산탄데르 #14)",
  "파블로 가르시안": "파블로 가르시아 (라싱 산탄데르 #15)",
  "파쿤도 곤살레노": "파쿤도 곤살레스 (라싱 산탄데르 #16)",
  "호르헤 살리나노": "호르헤 살리나스 (라싱 산탄데르 #17)",
  "마테오 프라틴": "마테오 프라티 (라싱 산탄데르 #18)",
  "이케르 루켄": "이케르 루케 (라싱 산탄데르 #19)",
  "세르히오 카날레노": "세르히오 카날레스 (라싱 산탄데르 #20)",
  "야시르 자비린": "야시르 자비리 (라싱 산탄데르 #21)",
  "페드로 펠리펜": "페드로 펠리페 (라싱 산탄데르 #22)",
  "이반 마르티노": "이반 마르틴 (라싱 산탄데르 #23)",
  "자뉘엘 벨로시안드": "자뉘엘 벨로시앙 (라싱 산탄데르 #24)",
  "다니 카르데나노": "다니 카르데나스 (라요 바예카노 #1)",
  "안드레이 라치운": "안드레이 라치우 (라요 바예카노 #2)",
  "마라시 쿰불란": "마라시 쿰불라 (라요 바예카노 #3)",
  "페드로 디아노": "페드로 디아스 (라요 바예카노 #4)",
  "루이스 펠리펜": "루이스 펠리페 (라요 바예카노 #5)",
  "파테 시손": "파테 시스 (라요 바예카노 #6)",
  "이시 팔라손드": "이시 팔라손 (라요 바예카노 #7)",
  "우나이 로페노": "우나이 로페스 (라요 바예카노 #8)",
  "알레망드": "알레망 (라요 바예카노 #9)",
  "세르히오 카메욘": "세르히오 카메요 (라요 바예카노 #10)",
  "랜디 은테칸": "랜디 은테카 (라요 바예카노 #11)",
  "아우구스토 바탈란": "아우구스토 바탈라 (라요 바예카노 #13)",
  "기오르기 치타이시빌린": "기오르기 치타이시빌리 (라요 바예카노 #14)",
  "아드리아 페드로산": "아드리아 페드로사 (라요 바예카노 #17)",
  "알바로 가르시안": "알바로 가르시아 (라요 바예카노 #18)",
  "호르헤 데 프루토노": "호르헤 데 프루토스 (라요 바예카노 #19)",
  "이반 발리운": "이반 발리우 (라요 바예카노 #20)",
  "프란 페레노": "프란 페레스 (라요 바예카노 #21)",
  "펠라요 페르난데노": "펠라요 페르난데스 (라요 바예카노 #22)",
  "오스카르 발렌티노": "오스카르 발렌틴 (라요 바예카노 #23)",
  "플로리안 르죄른": "플로리안 르죈 (라요 바예카노 #24)",
  "조주아 페르트라우트르": "조주아 페르트라우트 (라요 바예카노 #33)",
  "낭고로 부아렌": "낭고로 부아레 (라요 바예카노 #36)",
  "알바로 바예노": "알바로 바예스 (레알 베티스 #1)",
  "엑토르 베예리노": "엑토르 베예린 (레알 베티스 #2)",
  "디에고 요렌토": "디에고 요렌테 (레알 베티스 #3)",
  "나타른": "나탄 (레알 베티스 #4)",
  "마르크 바르트란": "마르크 바르트라 (레알 베티스 #5)",
  "파쿤도 베르날라": "파쿤도 베르날 (레알 베티스 #6)",
  "안토닌": "안토니 (레알 베티스 #7)",
  "파블로 포르날손": "파블로 포르날스 (레알 베티스 #8)",
  "쿠초 에르난데노": "쿠초 에르난데스 (레알 베티스 #9)",
  "압데 에살술린": "압데 에살술리 (레알 베티스 #10)",
  "프란 가르시안": "프란 가르시아 (레알 베티스 #11)",
  "앙헬 오르티노": "앙헬 오르티스 (레알 베티스 #12)",
  "디에고 콘덴": "디에고 콘데 (레알 베티스 #13)",
  "이케르 로사단": "이케르 로사다 (레알 베티스 #14)",
  "알바로 피달곤": "알바로 피달고 (레알 베티스 #15)",
  "발렌틴 고메노": "발렌틴 고메스 (레알 베티스 #16)",
  "로드리고 리켈멘": "로드리고 리켈메 (레알 베티스 #17)",
  "넬손 데오산": "넬손 데오사 (레알 베티스 #18)",
  "트로이 패러트": "트로이 패럿 (레알 베티스 #19)",
  "조반니 로 셀손": "조반니 로 셀소 (레알 베티스 #20)",
  "마르크 로칸": "마르크 로카 (레알 베티스 #21)",
  "이스콘": "이스코 (레알 베티스 #22)",
  "주니오르 피르폰": "주니오르 피르포 (레알 베티스 #23)",
  "아이토르 루이발라": "아이토르 루이발 (레알 베티스 #24)",
  "다니 세바요노": "다니 세바요스 (레알 베티스 #25)",
  "티보 쿠르투안": "티보 쿠르투아 (레알 마드리드 #1)",
  "라울 아센시온": "라울 아센시오 (레알 마드리드 #2)",
  "에데르 밀리당": "에데르 밀리탕 (레알 마드리드 #3)",
  "딘 하위섬": "딘 하위선 (레알 마드리드 #4)",
  "주드 벨링험": "주드 벨링엄 (레알 마드리드 #5)",
  "에두아르도 카마빙간": "에두아르도 카마빙가 (레알 마드리드 #6)",
  "비니시우스 주니오른": "비니시우스 주니오르 (레알 마드리드 #7)",
  "페데리코 발베르덴": "페데리코 발베르데 (레알 마드리드 #8)",
  "엔드리코": "엔드리크 (레알 마드리드 #9)",
  "킬리안 음바펜": "킬리안 음바페 (레알 마드리드 #10)",
  "호드리군": "호드리구 (레알 마드리드 #11)",
  "트렌트 알렉산더아널든": "트렌트 알렉산더아널드 (레알 마드리드 #12)",
  "안드리 루니르": "안드리 루닌 (레알 마드리드 #13)",
  "오렐리앵 추아메닌": "오렐리앵 추아메니 (레알 마드리드 #14)",
  "아르다 귈레른": "아르다 귈레르 (레알 마드리드 #15)",
  "이브라히마 코나텐": "이브라히마 코나테 (레알 마드리드 #16)",
  "마르크 쿠쿠레얀": "마르크 쿠쿠레야 (레알 마드리드 #17)",
  "알바로 카레라노": "알바로 카레라스 (레알 마드리드 #18)",
  "카를로스 에스핀": "카를로스 에스피 (레알 마드리드 #19)",
  "베르나르두 실반": "베르나르두 실바 (레알 마드리드 #20)",
  "브라힘 디아노": "브라힘 디아스 (레알 마드리드 #21)",
  "안토니오 뤼디건": "안토니오 뤼디거 (레알 마드리드 #22)",
  "페를랑 멘딘": "페를랑 멘디 (레알 마드리드 #23)",
  "덴젤 뒴프리손": "덴젤 뒴프리스 (레알 마드리드 #24)",
  "얀 디오망덴": "얀 디오망데 (레알 마드리드 #25)",
  "티아고 피타르친": "티아고 피타르치 (레알 마드리드 #27)",
  "알렉스 레미론": "알렉스 레미로 (레알 소시에다드 #1)",
  "욘 아람부룬": "욘 아람부루 (레알 소시에다드 #2)",
  "아이엔 무뇨노": "아이엔 무뇨스 (레알 소시에다드 #3)",
  "욘 고로차테긴": "욘 고로차테기 (레알 소시에다드 #4)",
  "이고르 수벨디안": "이고르 수벨디아 (레알 소시에다드 #5)",
  "욘 마르티노": "욘 마르틴 (레알 소시에다드 #6)",
  "안데르 바레네체안": "안데르 바레네체아 (레알 소시에다드 #7)",
  "베냐트 투리엔테노": "베냐트 투리엔테스 (레알 소시에다드 #8)",
  "오리 오스카르손드": "오리 오스카르손 (레알 소시에다드 #9)",
  "미켈 오야르사발라": "미켈 오야르사발 (레알 소시에다드 #10)",
  "곤살루 게데노": "곤살루 게데스 (레알 소시에다드 #11)",
  "잡 오치엥그": "잡 오치엥 (레알 소시에다드 #12)",
  "우나이 마레론": "우나이 마레로 (레알 소시에다드 #13)",
  "쿠보 다케후산": "쿠보 다케후사 (레알 소시에다드 #14)",
  "파블로 마리노": "파블로 마린 (레알 소시에다드 #15)",
  "욘 파체콘": "욘 파체코 (레알 소시에다드 #16)",
  "세르히오 고메노": "세르히오 고메스 (레알 소시에다드 #17)",
  "카를로스 솔레른": "카를로스 솔레르 (레알 소시에다드 #18)",
  "마마두 사른": "마마두 사르 (레알 소시에다드 #19)",
  "알바로 오드리오솔란": "알바로 오드리오솔라 (레알 소시에다드 #20)",
  "양헬 에레란": "양헬 에레라 (레알 소시에다드 #21)",
  "엑토르 포르타": "엑토르 포르트 (레알 소시에다드 #22)",
  "아르센 자하리안드": "아르센 자하리안 (레알 소시에다드 #23)",
  "루카 수치츠": "루카 수치치 (레알 소시에다드 #24)",
  "오디세아스 블라호디모노": "오디세아스 블라호디모스 (세비야 FC #1)",
  "후안 이글레시아노": "후안 이글레시아스 (세비야 FC #2)",
  "훌리오 디아노": "훌리오 디아스 (세비야 FC #3)",
  "키케 살라노": "키케 살라스 (세비야 FC #4)",
  "안드레스 카스트리노": "안드레스 카스트린 (세비야 FC #5)",
  "뤼시앵 아구멘": "뤼시앵 아구메 (세비야 FC #6)",
  "알폰 곤살레노": "알폰 곤살레스 (세비야 FC #7)",
  "기오르기 코초라시빌린": "기오르기 코초라시빌리 (세비야 FC #8)",
  "로비 유언": "로비 유어 (세비야 FC #9)",
  "페케 페르난데노": "페케 페르난데스 (세비야 FC #10)",
  "루벤 바르가노": "루벤 바르가스 (세비야 FC #11)",
  "아루나 상간텐": "아루나 상간테 (세비야 FC #12)",
  "프란 곤살레산": "프란 곤살레스 (세비야 FC #13)",
  "마누 부에논": "마누 부에노 (세비야 FC #14)",
  "이사크 로메론": "이사크 로메로 (세비야 FC #16)",
  "가브리엘 수아손": "가브리엘 수아소 (세비야 FC #17)",
  "욘 구리딘": "욘 구리디 (세비야 FC #18)",
  "루카스 스타생드": "루카스 스타생 (세비야 FC #19)",
  "펠릭스 코헤이안": "펠릭스 코헤이아 (세비야 FC #20)",
  "치데라 에주켄": "치데라 에주케 (세비야 FC #21)",
  "호세 앙헬 카르모난": "호세 앙헬 카르모나 (세비야 FC #22)",
  "마르캉드": "마르캉 (세비야 FC #23)",
  "유수프 포파난": "유수프 포파나 (세비야 FC #24)",
  "니코 기옌드": "니코 기옌 (세비야 FC #27)",
  "미겔 시에란": "미겔 시에라 (세비야 FC #30)",
  "스톨레 디미트리에프스킨": "스톨레 디미트리에프스키 (발렌시아 CF #1)",
  "기도 로드리게노": "기도 로드리게스 (발렌시아 CF #2)",
  "호세 코페텐": "호세 코페테 (발렌시아 CF #3)",
  "무크타르 디아카빈": "무크타르 디아카비 (발렌시아 CF #4)",
  "세사르 타레간": "세사르 타레가 (발렌시아 CF #5)",
  "우마르 사디큰": "우마르 사디크 (발렌시아 CF #6)",
  "아르나우트 단주만": "아르나우트 단주마 (발렌시아 CF #7)",
  "하비 게란": "하비 게라 (발렌시아 CF #8)",
  "우고 두론": "우고 두로 (발렌시아 CF #9)",
  "하비 엘리어트": "하비 엘리엇 (발렌시아 CF #10)",
  "루이스 리오한": "루이스 리오하 (발렌시아 CF #11)",
  "유스틴 더 하손": "유스틴 더 하스 (발렌시아 CF #12)",
  "크리스티안 리베론": "크리스티안 리베로 (발렌시아 CF #13)",
  "호세 가얀": "호세 가야 (발렌시아 CF #14)",
  "알리우 디엥그": "알리우 디엥 (발렌시아 CF #15)",
  "디에고 로페노": "디에고 로페스 (발렌시아 CF #16)",
  "페펠룬": "페펠루 (발렌시아 CF #18)",
  "다니 라반": "다니 라바 (발렌시아 CF #19)",
  "디미트리 풀키엔": "디미트리 풀키에 (발렌시아 CF #20)",
  "헤수스 바스케노": "헤수스 바스케스 (발렌시아 CF #21)",
  "아르나우 마르티네노": "아르나우 마르티네스 (발렌시아 CF #22)",
  "필리프 우그리니츠": "필리프 우그리니치 (발렌시아 CF #23)",
  "파블로 마페온": "파블로 마페오 (발렌시아 CF #24)",
  "카이너 판 오벌른": "카이너 판 오벌런 (발렌시아 CF #25)",
  "사토 류노스켄": "사토 류노스케 (발렌시아 CF #39)",
  "루이스 주니오른": "루이스 주니오르 (비야레알 CF #1)",
  "로강 코스탄": "로강 코스타 (비야레알 CF #2)",
  "알렉스 프리먼드": "알렉스 프리먼 (비야레알 CF #3)",
  "알라산 디아탄": "알라산 디아타 (비야레알 CF #5)",
  "파우 나바론": "파우 나바로 (비야레알 CF #6)",
  "제라르드 모레논": "제라르드 모레노 (비야레알 CF #7)",
  "후안 포이손": "후안 포이스 (비야레알 CF #8)",
  "조르제스 미카우타젠": "조르제스 미카우타제 (비야레알 CF #9)",
  "알베르토 몰레이론": "알베르토 몰레이로 (비야레알 CF #10)",
  "일리아스 아코마친": "일리아스 아코마치 (비야레알 CF #11)",
  "레나투 베이간": "레나투 베이가 (비야레알 CF #12)",
  "루벤 고메노": "루벤 고메스 (비야레알 CF #13)",
  "산티 코메사뇬": "산티 코메사냐 (비야레알 CF #14)",
  "산티아고 모우리뇬": "산티아고 모우리뇨 (비야레알 CF #15)",
  "카를로스 마시안": "카를로스 마시아 (비야레알 CF #16)",
  "타종 뷰캐넌드": "타종 뷰캐넌 (비야레알 CF #17)",
  "파페 게옌드": "파페 게예 (비야레알 CF #18)",
  "니콜라 페펜": "니콜라 페페 (비야레알 CF #19)",
  "카를로스 로메론": "카를로스 로메로 (비야레알 CF #20)",
  "타니 올루와세인": "타니 올루와세이 (비야레알 CF #21)",
  "아요세 페레노": "아요세 페레스 (비야레알 CF #22)",
  "세르지 카르도난": "세르지 카르도나 (비야레알 CF #23)",
  "네이선 살리반": "네이선 살리바 (비야레알 CF #24)",
  "페테르 굴라친": "페테르 굴라치 (비야레알 CF #25)",
  "안토니 로페손": "안토니 로페스 (앙제 SCO #1)",
  "카를랑스 아르퀴손": "카를랑스 아르퀴스 (앙제 SCO #2)",
  "우스만 카마란": "우스만 카마라 (앙제 SCO #4)",
  "루이 무통드": "루이 무통 (앙제 SCO #6)",
  "우스만 심바콜린": "우스만 심바콜리 (앙제 SCO #7)",
  "브랑코 판덴보므": "브랑코 판덴봄 (앙제 SCO #8)",
  "프로스페르 페테른": "프로스페르 페테르 (앙제 SCO #9)",
  "아민 스바인": "아민 스바이 (앙제 SCO #10)",
  "하루나 지비린드": "하루나 지비린 (앙제 SCO #11)",
  "야신 벨크디므": "야신 벨크딤 (앙제 SCO #14)",
  "멜뱅 징간": "멜뱅 징가 (앙제 SCO #16)",
  "조제프 칼룰룬": "조제프 칼룰루 (앙제 SCO #17)",
  "짐 알레비난": "짐 알레비나 (앙제 SCO #18)",
  "아민 엘와자닌": "아민 엘와자니 (앙제 SCO #19)",
  "마리우스 루에른": "마리우스 루에르 (앙제 SCO #20)",
  "조르당 르포른": "조르당 르포르 (앙제 SCO #21)",
  "에마뉘엘 비움란": "에마뉘엘 비움라 (앙제 SCO #24)",
  "앙토니 베르몽드": "앙토니 베르몽 (앙제 SCO #26)",
  "릴리앙 라올리소안": "릴리앙 라올리소아 (앙제 SCO #27)",
  "우마르 포난": "우마르 포나 (앙제 SCO #40)",
  "아리스 벨케블란": "아리스 벨케블라 (앙제 SCO #93)",
  "폴 나르딘": "폴 나르디 (AJ 오세르 #1)",
  "레미 라보 라스카린": "레미 라보 라스카리 (AJ 오세르 #3)",
  "악셀 투안제벤": "악셀 투안제베 (AJ 오세르 #4)",
  "케뱅 다누안": "케뱅 다누아 (AJ 오세르 #5)",
  "조쉬에 카시미른": "조쉬에 카시미르 (AJ 오세르 #7)",
  "나우이루 아하마단": "나우이루 아하마다 (AJ 오세르 #8)",
  "캐머런 아처스": "캐머런 아처 (AJ 오세르 #9)",
  "대니 나마손": "대니 나마소 (AJ 오세르 #10)",
  "에로스 마딘": "에로스 마디 (AJ 오세르 #11)",
  "텔리 시웬": "텔리 시웨 (AJ 오세르 #13)",
  "크리스트 마코손": "크리스트 마코소 (AJ 오세르 #15)",
  "피에르 에크완": "피에르 에크와 (AJ 오세르 #17)",
  "아산 디우센": "아산 디우세 (AJ 오세르 #18)",
  "시날리 디오망덴": "시날리 디오망데 (AJ 오세르 #20)",
  "라소 쿨리발린": "라소 쿨리발리 (AJ 오세르 #21)",
  "프레드리크 오페고른": "프레드리크 오페고르 (AJ 오세르 #22)",
  "마마두 디오픈": "마마두 디오프 (AJ 오세르 #23)",
  "브라이언 오콘": "브라이언 오코 (AJ 오세르 #24)",
  "라민 시르": "라민 시 (AJ 오세르 #27)",
  "로맹 파이브른": "로맹 파이브르 (AJ 오세르 #28)",
  "마르뱅 세나얀": "마르뱅 세나야 (AJ 오세르 #29)",
  "리앙 로댕드": "리앙 로댕 (AJ 오세르 #31)",
  "아르튀르 피드포른": "아르튀르 피드포르 (AJ 오세르 #46)",
  "아리스티드 조순": "아리스티드 조수 (AJ 오세르 #77)",
  "클레망 아크판": "클레망 아크파 (AJ 오세르 #92)",
  "세쿠 포파난": "세쿠 포파나 (AJ 오세르 #93)",
  "에길 셀비큰": "에길 셀비크 (스타드 브레스트 29 #1)",
  "브래들리 로콘": "브래들리 로코 (스타드 브레스트 29 #2)",
  "고티에 요리손": "고티에 요리스 (스타드 브레스트 29 #4)",
  "브렌당 샤르도넨": "브렌당 샤르도네 (스타드 브레스트 29 #5)",
  "마마디 디암분": "마마디 디암부 (스타드 브레스트 29 #6)",
  "조제프 농젠": "조제프 농제 (스타드 브레스트 29 #7)",
  "위고 마녜틴": "위고 마녜티 (스타드 브레스트 29 #8)",
  "파테 음부픈": "파테 음부프 (스타드 브레스트 29 #9)",
  "조바니 베르시닌": "조바니 베르시니 (스타드 브레스트 29 #10)",
  "악셀 캉블랑드": "악셀 캉블랑 (스타드 브레스트 29 #11)",
  "조리스 쇼타른": "조리스 쇼타르 (스타드 브레스트 29 #13)",
  "마마 발덴": "마마 발데 (스타드 브레스트 29 #17)",
  "쥐스탱 부르곤": "쥐스탱 부르고 (스타드 브레스트 29 #18)",
  "뤼도비크 아조르큰": "뤼도비크 아조르크 (스타드 브레스트 29 #19)",
  "뤼크 조그벤": "뤼크 조그베 (스타드 브레스트 29 #20)",
  "카모리 둠비안": "카모리 둠비아 (스타드 브레스트 29 #23)",
  "뤼카 투사른": "뤼카 투사르 (스타드 브레스트 29 #29)",
  "마티외 파투이옌": "마티외 파투이예 (스타드 브레스트 29 #30)",
  "케니 랄란": "케니 랄라 (스타드 브레스트 29 #70)",
  "라파엘 르갱드": "라파엘 르갱 (스타드 브레스트 29 #71)",
  "아메드 투반": "아메드 투바 (르아브르 AC #5)",
  "쥐니오르 음완간": "쥐니오르 음완가 (르아브르 AC #6)",
  "아미르 리샤르송드": "아미르 리샤르송 (르아브르 AC #7)",
  "조시 마잔": "조시 마자 (르아브르 AC #9)",
  "펠릭스 맘빔빈": "펠릭스 맘빔비 (르아브르 AC #10)",
  "고드송 키에레멘": "고드송 키에레메 (르아브르 AC #11)",
  "엘리아스 옐레르튼": "엘리아스 옐레르트 (르아브르 AC #12)",
  "포데 두쿠렌": "포데 두쿠레 (르아브르 AC #13)",
  "라술 은디아옌": "라술 은디아예 (르아브르 AC #14)",
  "세코 아유문": "세코 아유무 (르아브르 AC #15)",
  "미즈타 가이톤": "미즈타 가이토 (르아브르 AC #17)",
  "야니스 주아윈": "야니스 주아위 (르아브르 AC #18)",
  "조앙 탱크른": "조앙 탱크르 (르아브르 AC #19)",
  "뱅상 사손": "뱅상 사소 (르아브르 AC #23)",
  "음브와나 사마탄": "음브와나 사마타 (르아브르 AC #25)",
  "시몽 에보노근": "시몽 에보노그 (르아브르 AC #26)",
  "엔조 코핀": "엔조 코피 (르아브르 AC #27)",
  "스테팡 자가둔": "스테팡 자가두 (르아브르 AC #29)",
  "나카무라 소탄": "나카무라 소타 (르아브르 AC #30)",
  "티모테 펨벨렌": "티모테 펨벨레 (르아브르 AC #32)",
  "모크란 벤투민": "모크란 벤투미 (르아브르 AC #37)",
  "이스마일 부네브스": "이스마일 부네브 (르아브르 AC #44)",
  "폴 아르그넨": "폴 아르그네 (르아브르 AC #50)",
  "리오넬 음파신": "리오넬 음파시 (르아브르 AC #77)",
  "다렌 모셍곤": "다렌 모셍고 (르아브르 AC #78)",
  "고티에 갈롱드": "고티에 갈롱 (르아브르 AC #93)",
  "에완 아트푸르": "에완 아트푸 (르망 FC #1)",
  "아롤드 부아옌": "아롤드 부아예 (르망 FC #5)",
  "에드윈 쿠아르신": "에드윈 쿠아르시 (르망 FC #6)",
  "빌랄 브라히민": "빌랄 브라히미 (르망 FC #7)",
  "알렉상드르 로렌": "알렉상드르 로레 (르망 FC #8)",
  "앙투안 라비야른": "앙투안 라비야르 (르망 FC #9)",
  "장 베르크루이손": "장 베르크루이스 (르망 FC #10)",
  "아딜 부라반": "아딜 부라바 (르망 FC #11)",
  "루이 마푸탄": "루이 마푸타 (르망 FC #14)",
  "노아 부아센": "노아 부아세 (르망 FC #15)",
  "라울 토렌텐": "라울 토렌테 (르망 FC #16)",
  "사뮈엘 요운": "사뮈엘 요우 (르망 FC #17)",
  "뤼카 부아든": "뤼카 부아드 (르망 FC #18)",
  "지브릴 시디벤": "지브릴 시디베 (르망 FC #19)",
  "윌리암 아르우준": "윌리암 아르우즈 (르망 FC #20)",
  "테오 에유므": "테오 에윰 (르망 FC #21)",
  "뤼카 칼로단": "뤼카 칼로다 (르망 FC #22)",
  "다우다 트라오렌": "다우다 트라오레 (르망 FC #23)",
  "밀랑 로뱅드": "밀랑 로뱅 (르망 FC #24)",
  "담 게옌": "담 게예 (르망 FC #25)",
  "라얀 밤반": "라얀 밤바 (르망 FC #26)",
  "마르탱 로시뇰라": "마르탱 로시뇰 (르망 FC #27)",
  "에르완 콜란": "에르완 콜라 (르망 FC #28)",
  "뤼카 브르텔라": "뤼카 브르텔 (르망 FC #29)",
  "야세르 라루신": "야세르 라루시 (르망 FC #76)",
  "니콜라 코시큰": "니콜라 코시크 (르망 FC #98)",
  "엔조 바그네른": "엔조 바그네르 (르망 FC #99)",
  "레지스 귀르트네른": "레지스 귀르트네르 (RC 랑스 #1)",
  "뤼방 아길라른": "뤼방 아길라르 (RC 랑스 #2)",
  "마이크 나브로츠킨": "마이크 나브로츠키 (RC 랑스 #3)",
  "니달 첼리큰": "니달 첼리크 (RC 랑스 #4)",
  "안드리야 불라토비츠": "안드리야 불라토비치 (RC 랑스 #5)",
  "삼손 바이돈": "삼손 바이도 (RC 랑스 #6)",
  "플로리앙 소토칸": "플로리앙 소토카 (RC 랑스 #7)",
  "야신 티트라윈": "야신 티트라위 (RC 랑스 #8)",
  "토르강 아자른": "토르강 아자르 (RC 랑스 #9)",
  "플로리앙 토뱅드": "플로리앙 토뱅 (RC 랑스 #10)",
  "오종 에두아른": "오종 에두아르 (RC 랑스 #11)",
  "조아네르 차베손": "조아네르 차베스 (RC 랑스 #13)",
  "마티외 위돌라": "마티외 위돌 (RC 랑스 #14)",
  "마티외 고르젤랭드": "마티외 고르젤랭 (RC 랑스 #16)",
  "압달라 시만": "압달라 시마 (RC 랑스 #19)",
  "장클레르 토디본": "장클레르 토디보 (RC 랑스 #20)",
  "아마두 아이다란": "아마두 아이다라 (RC 랑스 #21)",
  "미하우 스코라신": "미하우 스코라시 (RC 랑스 #22)",
  "사우드 압둘하미든": "사우드 압둘하미드 (RC 랑스 #23)",
  "조나탕 그라딘": "조나탕 그라디 (RC 랑스 #24)",
  "이스마엘로 가니운": "이스마엘로 가니우 (RC 랑스 #25)",
  "미카엘 퀴상손": "미카엘 퀴상스 (RC 랑스 #27)",
  "쥐니오르 카딜라": "쥐니오르 카딜 (RC 랑스 #28)",
  "프란요 이바노비츠": "프란요 이바노비치 (RC 랑스 #29)",
  "술레이만 사냥드": "술레이만 사냥 (RC 랑스 #31)",
  "로뱅 리세른": "로뱅 리세르 (RC 랑스 #40)",
  "베르케 외제른": "베르케 외제르 (릴 OSC #1)",
  "룬 스르다노비츠": "룬 스르다노비치 (릴 OSC #2)",
  "나탕 응고인": "나탕 응고이 (릴 OSC #3)",
  "알렉산드룬": "알렉산드루 (릴 OSC #4)",
  "나빌 벤탈레브스": "나빌 벤탈렙 (릴 OSC #6)",
  "딜란 바크완": "딜란 바크와 (릴 OSC #7)",
  "에탕 음바펜": "에탕 음바페 (릴 OSC #8)",
  "올리비에 지룬": "올리비에 지루 (릴 OSC #9)",
  "하콘 하랄드손드": "하콘 하랄드손 (릴 OSC #10)",
  "오사메 사라윈": "오사메 사라위 (릴 OSC #11)",
  "오를란도 힐라": "오를란도 힐 (릴 OSC #12)",
  "마우리츠 케르고른": "마우리츠 케르고르 (릴 OSC #14)",
  "로맹 페론": "로맹 페로 (릴 OSC #15)",
  "아르노 보다른": "아르노 보다르 (릴 OSC #16)",
  "응갈라옐 무카운": "응갈라옐 무카우 (릴 OSC #17)",
  "우에다 아야센": "우에다 아야세 (릴 OSC #18)",
  "바샤르 외날라": "바샤르 외날 (릴 OSC #19)",
  "뱅자맹 앙드렌": "뱅자맹 앙드레 (릴 OSC #21)",
  "티아구 산투손": "티아구 산투스 (릴 OSC #22)",
  "탕기 니앙준": "탕기 니앙주 (릴 OSC #23)",
  "칼빈 페르동큰": "칼빈 페르동크 (릴 OSC #24)",
  "이자크 코시엔": "이자크 코시에 (릴 OSC #26)",
  "가에탕 페랭드": "가에탕 페랭 (릴 OSC #28)",
  "함자 이가마느": "함자 이가만 (릴 OSC #29)",
  "소리바 디아운드": "소리바 디아운 (릴 OSC #35)",
  "뱅자맹 르루안": "뱅자맹 르루아 (FC 로리앙 #1)",
  "알렉 조르장드": "알렉 조르장 (FC 로리앙 #2)",
  "몬타사르 탈빈": "몬타사르 탈비 (FC 로리앙 #3)",
  "포르모즈 멘딘": "포르모즈 멘디 (FC 로리앙 #5)",
  "방디우구 파디간": "방디우구 파디가 (FC 로리앙 #7)",
  "노아 카디운": "노아 카디우 (FC 로리앙 #8)",
  "모하메드 밤반": "모하메드 밤바 (FC 로리앙 #9)",
  "이사크 옌센드": "이사크 옌센 (FC 로리앙 #10)",
  "테오 르 브린": "테오 르 브리 (FC 로리앙 #11)",
  "아이예군 토시느": "아이예군 토신 (FC 로리앙 #15)",
  "장빅토르 마켕곤": "장빅토르 마켕고 (FC 로리앙 #17)",
  "이브라히마 발덴": "이브라히마 발데 (FC 로리앙 #18)",
  "술레이만 파옌": "술레이만 파예 (FC 로리앙 #19)",
  "뎀보 실란": "뎀보 실라 (FC 로리앙 #20)",
  "빈구루 카마란": "빈구루 카마라 (FC 로리앙 #21)",
  "스르잔 쿠즈미츠": "스르잔 쿠즈미치 (FC 로리앙 #30)",
  "너새니얼 아제인": "너새니얼 아제이 (FC 로리앙 #32)",
  "가뱅 베르나르돈": "가뱅 베르나르도 (FC 로리앙 #33)",
  "이봉 음보곤": "이봉 음보고 (FC 로리앙 #38)",
  "아르센 쿠아신": "아르센 쿠아시 (FC 로리앙 #43)",
  "노사 에드워드 오바레티느": "노사 에드워드 오바레틴 (FC 로리앙 #55)",
  "아르튀르 아보므": "아르튀르 아봄 (FC 로리앙 #62)",
  "노아 음밤반": "노아 음밤바 (FC 로리앙 #72)",
  "파노스 카체리손": "파노스 카체리스 (FC 로리앙 #77)",
  "이자크 투렌": "이자크 투레 (FC 로리앙 #95)"
}

/** 가명 → 초상 파일 키 (public/players/<key>.webp). */
export const SQUAD_PORTRAITS: Record<string, string> = {
  "최주헌": "ulsan-01",
  "윤중규": "ulsan-02",
  "정선빈": "ulsan-03",
  "서명권": "ulsan-04",
  "다리안 보야닉": "ulsan-06",
  "이희근": "ulsan-08",
  "마르카노": "ulsan-09",
  "이동겸": "ulsan-10",
  "에릭 파리스": "ulsan-11",
  "류승민": "ulsan-13",
  "이진헌": "ulsan-14",
  "정승헌": "ulsan-15",
  "박우재": "ulsan-16",
  "강상유": "ulsan-17",
  "김영궁": "ulsan-19",
  "정재삼": "ulsan-20",
  "조현운": "ulsan-21",
  "문정일": "ulsan-23",
  "이규선": "ulsan-24",
  "조현탁": "ulsan-26",
  "페드리노": "ulsan-27",
  "이재억": "ulsan-28",
  "황병건": "ulsan-31",
  "장시연": "ulsan-33",
  "박용유": "ulsan-38",
  "조민석": "ulsan-43",
  "토마스 오데코트": "ulsan-55",
  "밀로시 트로약": "ulsan-66",
  "백인유": "ulsan-72",
  "심상만": "ulsan-77",
  "벤지 미셀": "ulsan-91",
  "최석헌": "ulsan-96",
  "야고 카리엘": "ulsan-99",
  "세네 라멘츠": "manred-01",
  "디오고 달로": "manred-02",
  "누사이르 마즈라우": "manred-03",
  "마테이스 데 리트": "manred-04",
  "해리 맥과이": "manred-05",
  "리산드로 마르티노": "manred-06",
  "메이슨 마운드": "manred-07",
  "브루노 페르난도": "manred-08",
  "마커스 래시포": "manred-09",
  "마테우스 쿠뉴": "manred-10",
  "조슈아 지르크": "manred-11",
  "칼 다를로": "manred-12",
  "패트릭 도르그": "manred-13",
  "레니 요루": "manred-15",
  "아마드 디알": "manred-16",
  "안드레이 산토": "manred-17",
  "유리 틸레망": "manred-18",
  "브라이언 음보모": "manred-19",
  "카를로스 발레브": "manred-20",
  "톰 히튼": "manred-22",
  "루크 쇼어": "manred-23",
  "마누엘 우가르타": "manred-25",
  "에이든 헤번": "manred-26",
  "벤야민 셰스코": "manred-30",
  "셰이 레이스": "manred-31",
  "코비 마이노": "manred-37",
  "잭 플레쳐": "manred-38",
  "타일러 플레쳐": "manred-39",
  "해리 아마즈": "manred-41",
  "더못 미이": "manred-45",
  "다비드 라얀": "ars-01",
  "케파 아리사발라고": "ars-02",
  "일랑 멜리어": "ars-03",
  "윌리엄 살리반": "ars-04",
  "크리스티안 모스케로": "ars-05",
  "벤 화이터": "ars-06",
  "피에로 인카피오": "ars-07",
  "가브리엘 마갈량스": "ars-08",
  "유리엔 팀베르": "ars-09",
  "에즈리 콘살": "ars-10",
  "리카르도 칼라피오레": "ars-11",
  "마일스 루이스켈리": "ars-12",
  "마르틴 외데가르": "ars-13",
  "에베레치 에젬": "ars-14",
  "미켈 메리나": "ars-15",
  "마르틴 수비멘도": "ars-16",
  "브루누 기마랑스": "ars-17",
  "데클란 라이슨": "ars-18",
  "부카요 사칸": "ars-19",
  "빅토르 요케레손": "ars-20",
  "흐리스토스 촐리소": "ars-21",
  "노니 마두에코": "ars-22",
  "카이 하베르치": "ars-23",
  "스즈키 자이언": "avl-01",
  "마르코 비조": "avl-02",
  "제임스 라이토": "avl-03",
  "매티 캐신": "avl-04",
  "빅토르 린델로프": "avl-05",
  "테일러 하우드벨린": "avl-06",
  "타이론 밍고": "avl-07",
  "마테오 루제로": "avl-08",
  "파우 토레소": "avl-09",
  "이안 마트손": "avl-10",
  "애런 완비사코": "avl-11",
  "모두 케바 시소": "avl-12",
  "트래비스 패터손": "avl-13",
  "로스 바클라": "avl-14",
  "존 맥기너": "avl-15",
  "부바카르 카마로": "avl-16",
  "에밀리아노 부엔디오": "avl-17",
  "자말딘 지모알로반": "avl-18",
  "아마두 오나노": "avl-19",
  "라마레 보하르도": "avl-20",
  "레온 고레츠코": "avl-21",
  "주앙 고메손": "avl-22",
  "요한 만잠보": "avl-23",
  "니콜라 잭손": "avl-24",
  "알레한드로 가르나쇼": "avl-25",
  "태미 에이브러함": "avl-26",
  "이브라힘 음바여": "avl-27",
  "알리손 주니오": "avl-28",
  "키빈 켈러하": "bre-01",
  "하콘 발디마르센": "bre-02",
  "줄리안 아이스턴": "bre-03",
  "애런 히코": "bre-04",
  "리코 헨로": "bre-05",
  "세프 판덴베르크": "bre-06",
  "크리스토페르 아예로": "bre-07",
  "제이든 메고모": "bre-08",
  "네이선 콜린손": "bre-09",
  "말리크 디우포": "bre-10",
  "마이클 카요도": "bre-11",
  "김지승": "bre-12",
  "예고르 야르몰륙": "bre-13",
  "마티아스 옌손": "bre-14",
  "조시 다실반": "bre-15",
  "파비우 카르발료": "bre-16",
  "안토니 밀람바": "bre-17",
  "마마두 상가로": "bre-18",
  "미켈 담스고어": "bre-19",
  "유누스 코나키": "bre-20",
  "비탈리 야넬토": "bre-21",
  "케빈 샤도": "bre-22",
  "이고르 치아고": "bre-23",
  "당고 와타로": "bre-24",
  "칼럼 윌손": "bre-25",
  "제이든 앤서노": "bre-26",
  "킨 루이스포토": "bre-27",
  "구스타보 누네소": "bre-28",
  "조르제 페트로빈": "bou-01",
  "프레이저 포스톤": "bou-02",
  "미켈레 디 그레고로": "bou-03",
  "훌리안 아라우조": "bou-04",
  "아드리앵 트뤼페로": "bou-05",
  "제임스 힐런": "bou-06",
  "훌리오 솔레로": "bou-07",
  "안토니우 실반": "bou-08",
  "애덤 스미슨": "bou-09",
  "바포데 디아키토": "bou-10",
  "후안루 산체소": "bou-11",
  "맥스 애런손": "bou-12",
  "벨코 밀로사블레빈": "bou-13",
  "루이스 쿡스": "bou-14",
  "데이비드 브룩손": "bou-15",
  "알렉스 스코트": "bou-16",
  "라이언 크리스토": "bou-17",
  "타일러 애덤손": "bou-18",
  "마커스 태버니오": "bou-19",
  "아민 아들로": "bou-20",
  "알렉스 토토": "bou-21",
  "에바닐손": "bou-22",
  "벤 개넌독": "bou-23",
  "저스틴 클라위베르": "bou-24",
  "엘리 크루포": "bou-25",
  "대니얼 제비손": "bou-26",
  "알바로 로드리게소": "bou-27",
  "하이안": "bou-28",
  "바르트 페르브뤼헌": "bha-01",
  "제이슨 스틸런": "bha-02",
  "톰 맥길런": "bha-03",
  "자우엔 하자모": "bha-04",
  "파스칼 스트라위코": "bha-05",
  "루이스 덩크스": "bha-06",
  "코스치노": "bha-07",
  "올리비에 보스칼로": "bha-08",
  "페르디 카디오글로": "bha-09",
  "마츠 비페르": "bha-10",
  "막심 더 카위페르": "bha-11",
  "미하엘 스보보도": "bha-12",
  "루카 부슈코빈": "bha-13",
  "미토마 가오로": "bha-14",
  "잭 힌셸우즈": "bha-15",
  "얀쿠바 민테흐": "bha-16",
  "파스칼 그로소": "bha-17",
  "체마 안드레소": "bha-18",
  "이브라힘 오스마노": "bha-19",
  "디에고 고메소": "bha-20",
  "야신 아야로": "bha-21",
  "맷 오라일로": "bha-22",
  "말리크 얄쿠여": "bha-23",
  "자독 요한노": "bha-24",
  "페미 아지소": "bha-25",
  "스테파노스 치마소": "bha-26",
  "조르지니오 뤼테로": "bha-27",
  "하랄람보스 코스툴라소": "bha-28",
  "에반 퍼거손": "bha-29",
  "에밀리아노 마르티네소": "che-01",
  "테디 샤먼루": "che-02",
  "마이크 펜더손": "che-03",
  "가브리엘 슬로니노": "che-04",
  "마르코 팔레스트로": "che-05",
  "웨슬리 포파노": "che-06",
  "발렌틴 바르카": "che-07",
  "막상스 라크루오": "che-08",
  "레비 콜윈": "che-09",
  "조렐 하투": "che-10",
  "리스 제임손": "che-11",
  "말로 귀스투": "che-12",
  "펩 차바리오": "che-13",
  "아론 안셀미나": "che-14",
  "조시 아쳄포": "che-15",
  "콜 파메르": "che-16",
  "조던 헨더손": "che-17",
  "모건 로저손": "che-18",
  "모이세스 카이세두": "che-19",
  "로메오 라비오": "che-20",
  "페드루 네토": "che-21",
  "주앙 페드로": "che-22",
  "제이미 기튼손": "che-23",
  "대니 웰베크": "che-24",
  "에마뉘엘 에메호": "che-25",
  "제오바니 켄도": "che-26",
  "이스테반": "che-27",
  "벤 윌손": "cov-01",
  "칼 러시워드": "cov-02",
  "댄 벤틀로": "cov-03",
  "이선 피노크": "cov-04",
  "제이 다실보": "cov-05",
  "보비 토머슨": "cov-06",
  "케인 케슬러헤이던": "cov-07",
  "제이크 비드웰런": "cov-08",
  "조엘 라티보디에": "cov-09",
  "오렐 아멘도": "cov-10",
  "루크 울펜던": "cov-11",
  "밀란 판 에베이코": "cov-12",
  "스티븐 음푸노": "cov-13",
  "잭 루도노": "cov-14",
  "맷 그라임손": "cov-15",
  "케일럽 이렌코": "cov-16",
  "프랭크 오니에코": "cov-17",
  "조시 에클손": "cov-18",
  "빅토르 토르포": "cov-19",
  "구스타보 하메르": "cov-20",
  "얀 그보후": "cov-21",
  "사카모토 다쓰히루": "cov-22",
  "엘리스 심손": "cov-23",
  "에프론 메이슨클라코": "cov-24",
  "하지 라이토": "cov-25",
  "타이워 아워니오": "cov-26",
  "룸 차우노": "cov-27",
  "브랜던 토머스아산토": "cov-28",
  "시디키 셰리포": "cov-29",
  "딘 헨더손": "cry-01",
  "레미 매슈손": "cry-02",
  "발테르 베니테소": "cry-03",
  "타이릭 미첼런": "cry-04",
  "샤디 리아도": "cry-05",
  "악셀 디사소": "cry-06",
  "제이디 캉보트": "cry-07",
  "도미야스 다케히루": "cry-08",
  "어니스트 아하노": "cry-09",
  "아난 칼라일로": "cry-10",
  "크리스 리처드": "cry-11",
  "오스카르 밍게소": "cry-12",
  "벤 칠웰런": "cry-13",
  "헤페르손 레르모": "cry-14",
  "가마다 다이지": "cry-15",
  "윌 휴스": "cry-16",
  "애덤 워톤": "cry-17",
  "퀸턴 팀베르": "cry-18",
  "셰이크 두쿠로": "cry-19",
  "이스마일라 사로": "cry-20",
  "에디 은케티오": "cry-21",
  "예레미 피나": "cry-22",
  "드와이트 맥닐런": "cry-23",
  "자비에르 고즈": "cry-24",
  "장필리프 마테토": "cry-25",
  "예르겐 스트란 라르손": "cry-26",
  "다리오 오소리아": "cry-27",
  "에반 게상드": "cry-28",
  "조던 픽포르": "eve-01",
  "마크 트래버손": "eve-02",
  "톰 킹스": "eve-03",
  "에인슬리 메이틀랜드나일손": "eve-04",
  "재러드 브랜스웨이터": "eve-05",
  "마이클 킨스": "eve-06",
  "제임스 타코스코": "eve-07",
  "제이크 오브라이엔": "eve-08",
  "비탈리 미콜렌카": "eve-09",
  "키어넌 듀스버리홀런": "eve-10",
  "크리스티안 뇌르고어": "eve-11",
  "찰리 알카라소": "eve-12",
  "헤이든 해크노": "eve-13",
  "메를린 뢸러": "eve-14",
  "제임스 가너스": "eve-15",
  "해리슨 암스트론": "eve-16",
  "잭 그릴리소": "eve-17",
  "티에르노 바로": "eve-18",
  "타이리크 조지오": "eve-19",
  "타일러 디블린": "eve-20",
  "브레넌 존손": "eve-21",
  "베른트 레노어": "ful-01",
  "뱅자맹 르콩테": "ful-02",
  "알렉스 보르투": "ful-03",
  "케니 테토": "ful-04",
  "캘빈 배소": "ful-05",
  "호르헤 쿠엥코": "ful-06",
  "요아킴 아네르손": "ful-07",
  "티모시 카스타뇨": "ful-08",
  "다비트 아펜그루베르": "ful-09",
  "앤토니 로빈손": "ful-10",
  "뤽 드 푸제로": "ful-11",
  "해리슨 리드슨": "ful-12",
  "세사르 팔라시오": "ful-13",
  "톰 케어노": "ful-14",
  "휴고 라르센": "ful-15",
  "산데르 베르고": "ful-16",
  "알렉스 이워보": "ful-17",
  "셰이 찰손": "ful-18",
  "마누엘 앙헬로": "ful-19",
  "조시 킹거": "ful-20",
  "라이언 세세뇨": "ful-21",
  "에밀 스미스 로웨": "ful-22",
  "곤살로 가르시오": "ful-23",
  "로드리구 무니소": "ful-24",
  "케비노": "ful-25",
  "오스카르 보브": "ful-26",
  "요나 쿠시아사로": "ful-27",
  "잭 버틀런더": "hul-01",
  "루이 코일라": "hul-02",
  "라이언 자일러": "hul-03",
  "찰리 휴선": "hul-04",
  "모리타 히데마산": "hul-05",
  "세미 아자인": "hul-06",
  "소르바 토머슨": "hul-07",
  "엘리오 마타존": "hul-08",
  "올리 맥버닌": "hul-09",
  "모하메드 벨루민": "hul-10",
  "조 겔하트르": "hul-11",
  "딜런 필립손": "hul-12",
  "옌스 예르퇴달라": "hul-13",
  "존 이거른": "hul-14",
  "패디 맥네언": "hul-15",
  "콘스탄티노스 촐라키손": "hul-16",
  "오스카르 삼브라논": "hul-17",
  "엘리엇 스트라우든": "hul-18",
  "맷 타기트": "hul-19",
  "다르코 갸빈": "hul-20",
  "맷 크룩손": "hul-21",
  "키어런 다웰라": "hul-22",
  "리건 슬레이터스": "hul-23",
  "루카스 구르나두아트르": "hul-24",
  "데이비드 아킨톨란": "hul-25",
  "노벨 멘딘": "hul-26",
  "압뒬카디르 외뮈른": "hul-27",
  "팀 이로그분아르": "hul-28",
  "모하메드알리 쇼른": "hul-29",
  "알렉스 파머스": "ips-01",
  "다넬 펄롱크": "ips-02",
  "레이프 데이비손": "ips-03",
  "세드리크 키프렌": "ips-04",
  "아조르 마투시완": "ips-05",
  "이사 디오픈": "ips-06",
  "압둘 파타운": "ips-07",
  "신드레 발레 에겔린": "ips-08",
  "지안 플레밍크": "ips-09",
  "훌리오 엔시손": "ips-10",
  "제이든 필로지느": "ips-11",
  "플로렌티누 루이손": "ips-12",
  "잭 테일러스": "ips-13",
  "에메르손드": "ips-14",
  "케이시 맥아티언": "ips-15",
  "사샤 루키츠": "ips-16",
  "제이컵 그리브손": "ips-17",
  "에세키엘 팔라시오손": "ips-18",
  "다라 오셰인": "ips-19",
  "데이비드 버트나": "ips-20",
  "크리스천 월터느": "ips-21",
  "추바 아크포므": "ips-22",
  "마르셀리노 누녜노": "ips-23",
  "아니스 메메틴": "ips-24",
  "켈 스헤르페느": "ips-25",
  "마에다 다이제느": "ips-26",
  "압둘 우아타란": "ips-27",
  "잭 클라크르": "ips-28",
  "제임스 트래퍼든": "lee-01",
  "제이든 보글라": "lee-02",
  "가브리엘 구드문드슨드": "lee-03",
  "이선 암파둔": "lee-04",
  "타리크 무하레모비츠": "lee-05",
  "조 로더른": "lee-06",
  "대니얼 제임슨": "lee-07",
  "션 롱스태프르": "lee-08",
  "도미닉 캘버트르위르": "lee-09",
  "해리 윌슨드": "lee-10",
  "브렌던 애런슨드": "lee-11",
  "루카스 은메찬": "lee-12",
  "야카 비욜라": "lee-13",
  "미하엘 체트런": "lee-14",
  "안톤 슈타흐르": "lee-15",
  "노아 오카포른": "lee-16",
  "알렉스 케언손": "lee-17",
  "다나카 아온": "lee-18",
  "장마테오 바오얀": "lee-19",
  "제임스 저스티노": "lee-20",
  "멜뱅 바르드": "lee-21",
  "니코 엘베딘": "lee-22",
  "일리야 그루에브스": "lee-23",
  "알리송 베케른": "liv-01",
  "조 고메손": "liv-02",
  "엔도 와타룬": "liv-03",
  "버질 판다이큰": "liv-04",
  "제레미 자켄": "liv-05",
  "밀로시 케르케주": "liv-06",
  "플로리안 비르추": "liv-07",
  "도미니크 소보슬러인": "liv-08",
  "알렉산데르 이사큰": "liv-09",
  "알렉시스 맥알리스턴": "liv-10",
  "코너 브래들린": "liv-11",
  "페데리코 키에산": "liv-12",
  "조반니 레오닌": "liv-13",
  "코디 학폰": "liv-14",
  "코스타스 치미카손": "liv-15",
  "위고 에키티켄": "liv-16",
  "빅토르 무뇨손": "liv-17",
  "기오르기 마마르다시빌린": "liv-18",
  "프레디 우드먼드": "liv-19",
  "브래들리 바르콜란": "liv-20",
  "제레미 프림퐁그": "liv-21",
  "로날드 아라우혼": "liv-22",
  "라이언 흐라번베르흐트": "liv-23",
  "트레이 뇨닌": "liv-24",
  "제임스 매코널라": "liv-25",
  "비테즐라프 야로신": "liv-26",
  "리오 응구모한": "liv-27",
  "잔루이지 돈나룸만": "mci-01",
  "후벵 디아손": "mci-02",
  "엘리엇 앤더슨드": "mci-03",
  "마크 게힌": "mci-04",
  "일리만 은디아옌": "mci-05",
  "마테오 코바치츠": "mci-06",
  "엘링 홀란드": "mci-07",
  "라얀 셰르킨": "mci-08",
  "제레미 도쿤": "mci-09",
  "마커스 베티넬린": "mci-10",
  "엔소 페르난데손": "mci-11",
  "라얀 아이트누린": "mci-12",
  "비토르 헤이손": "mci-13",
  "요슈코 그바르디올라": "mci-14",
  "마테우스 누네손": "mci-15",
  "헤로니모 룰린": "mci-16",
  "아유브 부아딘": "mci-17",
  "니코 오라일린": "mci-18",
  "알란드": "mci-19",
  "앙투안 세메뇬": "mci-20",
  "압두코디르 후사노브스": "mci-21",
  "필 포드느": "mci-22",
  "조시 윌슨에스브랜든": "mci-23",
  "리코 루이손": "mci-24",
  "닉 포픈": "new-01",
  "티노 리브라멘톤": "new-02",
  "루이스 홀라": "new-03",
  "스벤 보트마르": "new-04",
  "파비안 셰언": "new-05",
  "니코 곤살레손": "new-06",
  "조엘린토느": "new-07",
  "알라지 밤반": "new-08",
  "요안 위산": "new-09",
  "윌리엄 오술란": "new-10",
  "하비 반손": "new-11",
  "말리크 티아운": "new-12",
  "션 스퇴른": "new-13",
  "바주마나 투렌": "new-14",
  "안토니 엘랑간": "new-15",
  "마티아스 페르난데스파르돈": "new-16",
  "루카시 호르니체큰": "new-17",
  "제이컵 머핀": "new-18",
  "유언 자우에느": "new-19",
  "조 윌로큰": "new-20",
  "마크 길레스핀": "new-21",
  "댄 버느": "new-22",
  "아마르 데디츠": "new-23",
  "제이컵 램진": "new-24",
  "루이스 마일린": "new-25",
  "우스만 디오망덴": "nfo-01",
  "네코 윌리엄손": "nfo-02",
  "무릴룬": "nfo-03",
  "이브라힘 상가렌": "nfo-04",
  "칼럼 허드슨오도인": "nfo-05",
  "니콜라스 도밍게노": "nfo-06",
  "크리스 우든": "nfo-07",
  "모건 깁스화이튼": "nfo-08",
  "이고르 제주손": "nfo-09",
  "존 빅토른": "nfo-10",
  "단 은도옌": "nfo-11",
  "아르노 칼리무엔돈": "nfo-12",
  "리암 델라픈": "nfo-13",
  "크사버 슐라거스": "nfo-14",
  "라이언 예이추": "nfo-15",
  "자이르 쿠냔": "nfo-16",
  "제임스 매카틴": "nfo-17",
  "루카 네추": "nfo-18",
  "마츠 셀손": "nfo-19",
  "다니엘 무뇨손": "nfo-20",
  "니콜라 밀렌코비츠": "nfo-21",
  "슈테펜 벤단": "nfo-22",
  "올라 아이난": "nfo-23",
  "니콜로 사보난": "nfo-24",
  "케빈 단손": "sun-01",
  "대니얼 밸러든": "sun-02",
  "다얀 메탈린": "sun-03",
  "솀스딘 탈빈": "sun-04",
  "앨런 브라운드": "sun-05",
  "브라이언 브로베인": "sun-06",
  "닐손 앙굴론": "sun-07",
  "크리스 리근": "sun-08",
  "토마 뫼니엔": "sun-09",
  "루크 오니언드": "sun-10",
  "로메인 문들라": "sun-11",
  "오마르 알데레텐": "sun-12",
  "레이닐둔": "sun-13",
  "윌슨 이시도른": "sun-14",
  "하비브 디아란": "sun-15",
  "노르디 무키엘렌": "sun-16",
  "사이먼 무언": "sun-17",
  "로빈 루프손": "sun-18",
  "노아 사디킨": "sun-19",
  "엔조 르 펜": "sun-20",
  "쥘 아오칸": "sun-21",
  "멜케르 엘보린": "sun-22",
  "트라이 흄드": "sun-23",
  "그라니트 자칸": "sun-24",
  "조슬랭 타 빈": "sun-25",
  "말리크 포파난": "sun-26",
  "아지 알레센": "sun-27",
  "압둘라 바르": "sun-28",
  "앤디 로버트슨드": "tot-01",
  "토신 아다라비오욘": "tot-02",
  "마르코스 세네신": "tot-03",
  "얀 파울 판헤켄": "tot-04",
  "사비 시몬손": "tot-05",
  "코너 갤러거스": "tot-06",
  "히샤를리송드": "tot-07",
  "제임스 매디슨드": "tot-08",
  "마티스 텔라": "tot-09",
  "데스티니 우도긴": "tot-10",
  "아치 그레인": "tot-11",
  "루카스 베리발라": "tot-12",
  "산드로 토날린": "tot-13",
  "사비운": "tot-14",
  "마테우스 페르난드손": "tot-15",
  "도미닉 솔란켄": "tot-16",
  "모하메드 쿠두손": "tot-17",
  "데얀 쿨루셉스킨": "tot-18",
  "오마르 마르무신": "tot-19",
  "페드로 포론": "tot-20",
  "미하일로 무드리큰": "tot-21",
  "윌슨 오도베른": "tot-22",
  "로드리고 벤탄쿠른": "tot-23",
  "안토닌 킨스킨": "tot-24",
  "벤 데이비손": "tot-25",
  "미키 판더페느": "tot-26",
  "마르틴 두브라프칸": "tot-27",
  "브랜던 오스티느": "tot-28",
  "안토니오 시베로": "ala-01",
  "니콜라스 발렌티노": "ala-02",
  "유세프 엔리케르": "ala-03",
  "데니스 수아레노": "ala-04",
  "파쿤도 가르세노": "ala-05",
  "안데르 게바로": "ala-06",
  "앙헬 페레노": "ala-07",
  "안토니오 블랑카": "ala-08",
  "마리아노 디아노": "ala-09",
  "카를레스 알레뇨": "ala-10",
  "토니 마르티네르": "ala-11",
  "우고 노보안": "ala-12",
  "아드리안 로드리게노": "ala-13",
  "나우엘 테나글리오": "ala-14",
  "루카스 보옌": "ala-15",
  "빌레 코스킨": "ala-16",
  "조니 오톤": "ala-17",
  "미켈 로드리게르": "ala-18",
  "파블로 이바네르": "ala-19",
  "아이토르 마냐노": "ala-20",
  "압데 레바흐": "ala-21",
  "미겔 로드리게산": "ala-22",
  "카를로스 프로테소닌": "ala-23",
  "셀루 디알론": "ala-24",
  "그레고이르 시비데르스칸": "ala-25",
  "우나이 시몬드": "ath-01",
  "다니 비비앙": "ath-02",
  "아이토르 파레데노": "ath-03",
  "예라이 알바레노": "ath-04",
  "베냐트 프라도르": "ath-05",
  "알렉스 베렝게로": "ath-06",
  "오이안 산세타": "ath-07",
  "이냐키 윌리엄슨": "ath-08",
  "니코 윌리엄슨": "ath-09",
  "고르카 구루세토": "ath-10",
  "헤수스 아레손": "ath-11",
  "알렉스 파디요": "ath-12",
  "에므리크 라포르타": "ath-13",
  "우고 린콘드": "ath-14",
  "이니고 루이스 데 갈라레토": "ath-15",
  "유리 베르치첸": "ath-16",
  "미켈 하우레기사른": "ath-17",
  "알레한드로 레곤": "ath-18",
  "마로안 산나딘": "ath-19",
  "니코 세라논": "ath-20",
  "로베르트 나바론": "ath-21",
  "베냐트 헤레나바레노": "ath-22",
  "알바로 자론": "ath-23",
  "페이오 카날레노": "ath-24",
  "요아네코 루이잔": "ath-25",
  "후안 무손": "atm-01",
  "오베드 바르가노": "atm-02",
  "로드리고 멘도산": "atm-03",
  "자니 카르도손": "atm-04",
  "코켄": "atm-05",
  "이간인": "atm-06",
  "파블로 바리오노": "atm-07",
  "알렉산데르 쇠를로타": "atm-08",
  "알렉스 바에노": "atm-09",
  "아데몰라 루크몬": "atm-10",
  "얀 오블라킨": "atm-11",
  "마르코스 요렌토": "atm-12",
  "조너선 데이비스": "atm-13",
  "아르나우 오르티노": "atm-14",
  "다비드 한츠콘": "atm-15",
  "마르크 푸비요": "atm-16",
  "훌리안 알바레노": "atm-17",
  "줄리아노 시메오나": "atm-18",
  "크리스티안 로메론": "atm-19",
  "알레한드로 그리말두": "atm-20",
  "모르텐 율마르": "atm-21",
  "로뱅 르 노르만드": "atm-22",
  "살비 에스키베르": "atm-23",
  "다니 마르티네노": "atm-24",
  "조안 가르시안": "fcb-01",
  "주앙 칸셀로": "fcb-02",
  "알레한드로 발덴": "fcb-03",
  "브리안 파리냐노": "fcb-04",
  "파우 쿠바르신": "fcb-05",
  "가빈": "fcb-06",
  "페르민 로페노": "fcb-07",
  "페드린": "fcb-08",
  "가브리엘 제주노": "fcb-09",
  "라민 야멀": "fcb-10",
  "하피뇨": "fcb-11",
  "샤비 에스파르타": "fcb-12",
  "보이치에흐 슈쳉스노": "fcb-13",
  "카림 아데예민": "fcb-14",
  "안드레아스 크리스텐센드": "fcb-15",
  "로드린": "fcb-16",
  "앤서니 고돈": "fcb-17",
  "제라르드 마르티노": "fcb-18",
  "루니 바르그진": "fcb-19",
  "다니 올모르": "fcb-20",
  "프렌키 더 요른": "fcb-21",
  "마르크 베르낼": "fcb-22",
  "쥘 쿤덴": "fcb-23",
  "에리크 가르시안": "fcb-24",
  "도미니크 리바코비츠": "fcb-25",
  "알타이 바이은드론": "cel-01",
  "칼 스타르펠타": "cel-02",
  "마르코스 알론사": "cel-03",
  "압둘라예 파옌": "cel-04",
  "세르히오 카레이로": "cel-05",
  "일라시 모리반": "cel-06",
  "보르하 이글레시아노": "cel-07",
  "미겔 로마르": "cel-08",
  "페란 후트글란": "cel-09",
  "이아고 아스파노": "cel-10",
  "파블로 두란드": "cel-11",
  "이오누츠 라둔": "cel-12",
  "알레익스 페바노": "cel-13",
  "알바로 누녜노": "cel-14",
  "우고 곤살레노": "cel-15",
  "하비 루에단": "cel-16",
  "요엘 라곤": "cel-17",
  "윌리오트 스베드베린": "cel-18",
  "하비 로드리게노": "cel-19",
  "세바스티안 카세레노": "cel-20",
  "하비 갈란드": "cel-21",
  "우고 알바레노": "cel-22",
  "쿠하입 드리우에신": "cel-23",
  "이반 비야른": "cel-24",
  "존스 엘압델라윈": "cel-25",
  "헤르만 파레뇬": "dep-01",
  "아드리아 알티미로": "dep-02",
  "아르나우 코마노": "dep-03",
  "루카스 누빈": "dep-04",
  "다니 바르시안": "dep-05",
  "마르크 카사돈": "dep-06",
  "피에르에메릭 오바메얀드": "dep-07",
  "디에고 비야레노": "dep-08",
  "자카리아 에다추린": "dep-09",
  "예레마이 에르난데노": "dep-10",
  "다비드 메얀": "dep-11",
  "자코모 콸리아토": "dep-12",
  "레오 로마르": "dep-13",
  "리키 로드리게노": "dep-14",
  "미겔 로우레이론": "dep-15",
  "로렌초 아마투친": "dep-16",
  "안헬리노": "dep-17",
  "요나탄 아스프 옌슨": "dep-18",
  "루이스미 크루손": "dep-19",
  "호세 마리아 히메네노": "dep-20",
  "마리오 소리아논": "dep-21",
  "시모 나바론": "dep-22",
  "아다마 트라오렌": "dep-23",
  "알바로 페르난데노": "dep-24",
  "빌 은송곤": "dep-25",
  "테윈 헤이설하르타": "dep-26",
  "마티아스 디투론": "elc-01",
  "부바 상가렌": "elc-02",
  "밤보 디아빈": "elc-03",
  "페데리코 레돈두": "elc-04",
  "페드로 비가노": "elc-05",
  "야고 산티아곤": "elc-06",
  "마르크 아과돈": "elc-07",
  "에세키엘 폰센": "elc-08",
  "파쿤도 부오나노텐": "elc-09",
  "헤르만 발레란": "elc-10",
  "곤살로 비야른": "elc-11",
  "페르 니논": "elc-12",
  "마르팀 네툰": "elc-13",
  "호사르": "elc-14",
  "그레이디 디앙가노": "elc-15",
  "테테 모렌토": "elc-16",
  "루카스 세페단": "elc-17",
  "빅토르 추스타": "elc-18",
  "아비엘 오소리온": "elc-19",
  "마티야 바르지츠": "elc-20",
  "알리 우아린": "elc-21",
  "아담 보아야른": "elc-22",
  "알레한드로 이투르벤": "elc-23",
  "하비 모르시욘": "elc-24",
  "앙헬 포르투뇬": "esy-01",
  "안도니 고로사벨라": "esy-02",
  "킬린츠키 하르트마르": "esy-03",
  "우르코 곤살레스 데 사라텐": "esy-04",
  "클레멘스 리델라": "esy-05",
  "레안드로 카브레란": "esy-06",
  "하비 푸아돈": "esy-07",
  "에두 엑스포시톤": "esy-08",
  "로베르토 페르난데노": "esy-09",
  "폴 로사논": "esy-10",
  "페레 미얀": "esy-11",
  "마르코 드미트로비츠": "esy-12",
  "우나이 누녜노": "esy-13",
  "브라이안 사라고산": "esy-14",
  "반야 드르쿠시츠": "esy-15",
  "호프레 카레라노": "esy-16",
  "마르코스 페르난데스코": "esy-17",
  "키케 가르시안": "esy-18",
  "가브리엘 모스카르돈": "esy-19",
  "로제르 이노혼": "esy-20",
  "알렉스 칼라트라반": "esy-21",
  "오마르 엘 힐랄린": "esy-22",
  "티리스 돌란드": "esy-23",
  "라펠 바우산": "esy-24",
  "하비 에르난데산": "esy-25",
  "이르지 레타첸": "get-01",
  "다코남 제넨": "get-02",
  "다빈친": "get-03",
  "사바 사조노비": "get-04",
  "압델 압카른": "get-05",
  "마리오 마르티노": "get-06",
  "후안미르": "get-07",
  "네마냐 구델라": "get-08",
  "보르하 마요란": "get-09",
  "마르틴 사트리아논": "get-10",
  "라몬 테라친": "get-11",
  "다비드 소리안": "get-12",
  "세바스티안 보셀린": "get-13",
  "프란초 세라논": "get-14",
  "키코 페메니안": "get-15",
  "에네스 위날라": "get-16",
  "크리스탄투스 우첸": "get-17",
  "안드레스 가르시안": "get-18",
  "요한 모히칸": "get-19",
  "오렐 망갈란": "get-20",
  "사이드 로메론": "get-21",
  "장 이브 발룬": "get-22",
  "파블로 캄포노": "lev-01",
  "아이사 만딘": "lev-02",
  "이페아니 은두크웬": "lev-03",
  "아드리안 델란": "lev-04",
  "우고 소텔론": "lev-05",
  "다니 레케난": "lev-06",
  "로제르 브루겐": "lev-07",
  "욘 안데르 올라사가스틴": "lev-08",
  "이반 로메로스": "lev-09",
  "카를로스 알바레산": "lev-10",
  "야니스 무수아인": "lev-11",
  "매슈 라이어드": "lev-12",
  "호르헤 카베욘": "lev-13",
  "빅토르 가르시안": "lev-14",
  "엔조 바르델린": "lev-15",
  "오리올 레인": "lev-16",
  "카를 에타 에욘": "lev-17",
  "예레미 톨리안드": "lev-18",
  "마누 산체노": "lev-19",
  "티아고 페르난데노": "lev-20",
  "파코 코르테노": "lev-21",
  "나초 페레노": "lev-22",
  "알렉스 프리몬": "lev-23",
  "알폰소 에레론": "mal-01",
  "옌스 카유스텐": "mal-02",
  "카를로스 푸간": "mal-03",
  "에이나르 갈릴레안": "mal-04",
  "알렉스 파스토른": "mal-05",
  "라모른": "mal-06",
  "하이타름": "mal-07",
  "카를로스 도토른": "mal-08",
  "추페텐": "mal-09",
  "다비드 라루비안": "mal-10",
  "호아킨 무뇨노": "mal-11",
  "호세 살리나노": "mal-12",
  "라파르": "mal-13",
  "앙헬 레시온": "mal-14",
  "디에고 무리욘": "mal-15",
  "에네코 하우레긴": "mal-16",
  "파블로 마르티네산": "mal-17",
  "후안 크루손": "mal-18",
  "페르난도 칼레론": "mal-19",
  "아드리안 니뇬": "mal-20",
  "다니 로렌손": "mal-21",
  "이산 메리논": "mal-22",
  "훌렌 로베텐": "mal-23",
  "후안 베로칼라": "mal-24",
  "라피탄": "mal-25",
  "아론 오초안": "mal-26",
  "아담 아즈눈": "mal-27",
  "세르히오 에레란": "osa-01",
  "호르헤 에란돈": "osa-02",
  "루카스 토론": "osa-03",
  "욘 몬카욜란": "osa-04",
  "이케르 무뇨노": "osa-05",
  "라울 가르시안": "osa-06",
  "아이마르 오로산": "osa-07",
  "키케 바르한": "osa-08",
  "아이토르 페르난데노": "osa-09",
  "루벤 가르시안": "osa-10",
  "디에고 리콘": "osa-11",
  "모이 고메노": "osa-12",
  "안테 부디미른": "osa-13",
  "라울 모론": "osa-14",
  "발랑탱 로지엔": "osa-15",
  "조너선 두바생드": "osa-16",
  "엔조 보요몬": "osa-17",
  "아벨 브레토네노": "osa-18",
  "알레한드로 카테난": "osa-19",
  "이니고 아르기비덴": "osa-20",
  "아시에르 오삼벨란": "osa-21",
  "록슨 예보안": "osa-22",
  "시몬 에릭슨드": "rac-01",
  "알바로 만티얀": "rac-02",
  "아론 마르티노": "rac-03",
  "마누 에르난돈": "rac-04",
  "파블로 라모른": "rac-05",
  "이니고 사인스마산": "rac-06",
  "기오르기 굴리아시빌린": "rac-07",
  "안드레 알메이단": "rac-08",
  "후안 카를로스 아라난": "rac-09",
  "이니고 비센텐": "rac-10",
  "안드레스 마르티노": "rac-11",
  "아시에르 비야리브렌": "rac-12",
  "훌렌 아기레사발란": "rac-13",
  "마게트 게옌": "rac-14",
  "파블로 가르시안": "rac-15",
  "파쿤도 곤살레노": "rac-16",
  "호르헤 살리나노": "rac-17",
  "마테오 프라틴": "rac-18",
  "이케르 루켄": "rac-19",
  "세르히오 카날레노": "rac-20",
  "야시르 자비린": "rac-21",
  "페드로 펠리펜": "rac-22",
  "이반 마르티노": "rac-23",
  "자뉘엘 벨로시안드": "rac-24",
  "다니 카르데나노": "ray-01",
  "안드레이 라치운": "ray-02",
  "마라시 쿰불란": "ray-03",
  "페드로 디아노": "ray-04",
  "루이스 펠리펜": "ray-05",
  "파테 시손": "ray-06",
  "이시 팔라손드": "ray-07",
  "우나이 로페노": "ray-08",
  "알레망드": "ray-09",
  "세르히오 카메욘": "ray-10",
  "랜디 은테칸": "ray-11",
  "아우구스토 바탈란": "ray-12",
  "기오르기 치타이시빌린": "ray-13",
  "아드리아 페드로산": "ray-14",
  "알바로 가르시안": "ray-15",
  "호르헤 데 프루토노": "ray-16",
  "이반 발리운": "ray-17",
  "프란 페레노": "ray-18",
  "펠라요 페르난데노": "ray-19",
  "오스카르 발렌티노": "ray-20",
  "플로리안 르죄른": "ray-21",
  "조주아 페르트라우트르": "ray-22",
  "낭고로 부아렌": "ray-23",
  "알바로 바예노": "bet-01",
  "엑토르 베예리노": "bet-02",
  "디에고 요렌토": "bet-03",
  "나타른": "bet-04",
  "마르크 바르트란": "bet-05",
  "파쿤도 베르날라": "bet-06",
  "안토닌": "bet-07",
  "파블로 포르날손": "bet-08",
  "쿠초 에르난데노": "bet-09",
  "압데 에살술린": "bet-10",
  "프란 가르시안": "bet-11",
  "앙헬 오르티노": "bet-12",
  "디에고 콘덴": "bet-13",
  "이케르 로사단": "bet-14",
  "알바로 피달곤": "bet-15",
  "발렌틴 고메노": "bet-16",
  "로드리고 리켈멘": "bet-17",
  "넬손 데오산": "bet-18",
  "트로이 패러트": "bet-19",
  "조반니 로 셀손": "bet-20",
  "마르크 로칸": "bet-21",
  "이스콘": "bet-22",
  "주니오르 피르폰": "bet-23",
  "아이토르 루이발라": "bet-24",
  "다니 세바요노": "bet-25",
  "티보 쿠르투안": "rma-01",
  "라울 아센시온": "rma-02",
  "에데르 밀리당": "rma-03",
  "딘 하위섬": "rma-04",
  "주드 벨링험": "rma-05",
  "에두아르도 카마빙간": "rma-06",
  "비니시우스 주니오른": "rma-07",
  "페데리코 발베르덴": "rma-08",
  "엔드리코": "rma-09",
  "킬리안 음바펜": "rma-10",
  "호드리군": "rma-11",
  "트렌트 알렉산더아널든": "rma-12",
  "안드리 루니르": "rma-13",
  "오렐리앵 추아메닌": "rma-14",
  "아르다 귈레른": "rma-15",
  "이브라히마 코나텐": "rma-16",
  "마르크 쿠쿠레얀": "rma-17",
  "알바로 카레라노": "rma-18",
  "카를로스 에스핀": "rma-19",
  "베르나르두 실반": "rma-20",
  "브라힘 디아노": "rma-21",
  "안토니오 뤼디건": "rma-22",
  "페를랑 멘딘": "rma-23",
  "덴젤 뒴프리손": "rma-24",
  "얀 디오망덴": "rma-25",
  "티아고 피타르친": "rma-26",
  "알렉스 레미론": "rso-01",
  "욘 아람부룬": "rso-02",
  "아이엔 무뇨노": "rso-03",
  "욘 고로차테긴": "rso-04",
  "이고르 수벨디안": "rso-05",
  "욘 마르티노": "rso-06",
  "안데르 바레네체안": "rso-07",
  "베냐트 투리엔테노": "rso-08",
  "오리 오스카르손드": "rso-09",
  "미켈 오야르사발라": "rso-10",
  "곤살루 게데노": "rso-11",
  "잡 오치엥그": "rso-12",
  "우나이 마레론": "rso-13",
  "쿠보 다케후산": "rso-14",
  "파블로 마리노": "rso-15",
  "욘 파체콘": "rso-16",
  "세르히오 고메노": "rso-17",
  "카를로스 솔레른": "rso-18",
  "마마두 사른": "rso-19",
  "알바로 오드리오솔란": "rso-20",
  "양헬 에레란": "rso-21",
  "엑토르 포르타": "rso-22",
  "아르센 자하리안드": "rso-23",
  "루카 수치츠": "rso-24",
  "오디세아스 블라호디모노": "sev-01",
  "후안 이글레시아노": "sev-02",
  "훌리오 디아노": "sev-03",
  "키케 살라노": "sev-04",
  "안드레스 카스트리노": "sev-05",
  "뤼시앵 아구멘": "sev-06",
  "알폰 곤살레노": "sev-07",
  "기오르기 코초라시빌린": "sev-08",
  "로비 유언": "sev-09",
  "페케 페르난데노": "sev-10",
  "루벤 바르가노": "sev-11",
  "아루나 상간텐": "sev-12",
  "프란 곤살레산": "sev-13",
  "마누 부에논": "sev-14",
  "이사크 로메론": "sev-15",
  "가브리엘 수아손": "sev-16",
  "욘 구리딘": "sev-17",
  "루카스 스타생드": "sev-18",
  "펠릭스 코헤이안": "sev-19",
  "치데라 에주켄": "sev-20",
  "호세 앙헬 카르모난": "sev-21",
  "마르캉드": "sev-22",
  "유수프 포파난": "sev-23",
  "니코 기옌드": "sev-24",
  "미겔 시에란": "sev-25",
  "스톨레 디미트리에프스킨": "val-01",
  "기도 로드리게노": "val-02",
  "호세 코페텐": "val-03",
  "무크타르 디아카빈": "val-04",
  "세사르 타레간": "val-05",
  "우마르 사디큰": "val-06",
  "아르나우트 단주만": "val-07",
  "하비 게란": "val-08",
  "우고 두론": "val-09",
  "하비 엘리어트": "val-10",
  "루이스 리오한": "val-11",
  "유스틴 더 하손": "val-12",
  "크리스티안 리베론": "val-13",
  "호세 가얀": "val-14",
  "알리우 디엥그": "val-15",
  "디에고 로페노": "val-16",
  "페펠룬": "val-17",
  "다니 라반": "val-18",
  "디미트리 풀키엔": "val-19",
  "헤수스 바스케노": "val-20",
  "아르나우 마르티네노": "val-21",
  "필리프 우그리니츠": "val-22",
  "파블로 마페온": "val-23",
  "카이너 판 오벌른": "val-24",
  "사토 류노스켄": "val-25",
  "루이스 주니오른": "vil-01",
  "로강 코스탄": "vil-02",
  "알렉스 프리먼드": "vil-03",
  "알라산 디아탄": "vil-04",
  "파우 나바론": "vil-05",
  "제라르드 모레논": "vil-06",
  "후안 포이손": "vil-07",
  "조르제스 미카우타젠": "vil-08",
  "알베르토 몰레이론": "vil-09",
  "일리아스 아코마친": "vil-10",
  "레나투 베이간": "vil-11",
  "루벤 고메노": "vil-12",
  "산티 코메사뇬": "vil-13",
  "산티아고 모우리뇬": "vil-14",
  "카를로스 마시안": "vil-15",
  "타종 뷰캐넌드": "vil-16",
  "파페 게옌드": "vil-17",
  "니콜라 페펜": "vil-18",
  "카를로스 로메론": "vil-19",
  "타니 올루와세인": "vil-20",
  "아요세 페레노": "vil-21",
  "세르지 카르도난": "vil-22",
  "네이선 살리반": "vil-23",
  "페테르 굴라친": "vil-24",
  "안토니 로페손": "ang-01",
  "카를랑스 아르퀴손": "ang-02",
  "우스만 카마란": "ang-03",
  "루이 무통드": "ang-04",
  "우스만 심바콜린": "ang-05",
  "브랑코 판덴보므": "ang-06",
  "프로스페르 페테른": "ang-07",
  "아민 스바인": "ang-08",
  "하루나 지비린드": "ang-09",
  "야신 벨크디므": "ang-10",
  "멜뱅 징간": "ang-11",
  "조제프 칼룰룬": "ang-12",
  "짐 알레비난": "ang-13",
  "아민 엘와자닌": "ang-14",
  "마리우스 루에른": "ang-15",
  "조르당 르포른": "ang-16",
  "에마뉘엘 비움란": "ang-17",
  "앙토니 베르몽드": "ang-18",
  "릴리앙 라올리소안": "ang-19",
  "우마르 포난": "ang-20",
  "아리스 벨케블란": "ang-21",
  "폴 나르딘": "aux-01",
  "레미 라보 라스카린": "aux-02",
  "악셀 투안제벤": "aux-03",
  "케뱅 다누안": "aux-04",
  "조쉬에 카시미른": "aux-05",
  "나우이루 아하마단": "aux-06",
  "캐머런 아처스": "aux-07",
  "대니 나마손": "aux-08",
  "에로스 마딘": "aux-09",
  "텔리 시웬": "aux-10",
  "크리스트 마코손": "aux-11",
  "피에르 에크완": "aux-12",
  "아산 디우센": "aux-13",
  "시날리 디오망덴": "aux-14",
  "라소 쿨리발린": "aux-15",
  "프레드리크 오페고른": "aux-16",
  "마마두 디오픈": "aux-17",
  "브라이언 오콘": "aux-18",
  "라민 시르": "aux-19",
  "로맹 파이브른": "aux-20",
  "마르뱅 세나얀": "aux-21",
  "리앙 로댕드": "aux-22",
  "아르튀르 피드포른": "aux-23",
  "아리스티드 조순": "aux-24",
  "클레망 아크판": "aux-25",
  "세쿠 포파난": "aux-26",
  "에길 셀비큰": "bre-01",
  "브래들리 로콘": "bre-02",
  "고티에 요리손": "bre-03",
  "브렌당 샤르도넨": "bre-04",
  "마마디 디암분": "bre-05",
  "조제프 농젠": "bre-06",
  "위고 마녜틴": "bre-07",
  "파테 음부픈": "bre-08",
  "조바니 베르시닌": "bre-09",
  "악셀 캉블랑드": "bre-10",
  "조리스 쇼타른": "bre-11",
  "마마 발덴": "bre-12",
  "쥐스탱 부르곤": "bre-13",
  "뤼도비크 아조르큰": "bre-14",
  "뤼크 조그벤": "bre-15",
  "카모리 둠비안": "bre-16",
  "뤼카 투사른": "bre-17",
  "마티외 파투이옌": "bre-18",
  "케니 랄란": "bre-19",
  "라파엘 르갱드": "bre-20",
  "아메드 투반": "hav-01",
  "쥐니오르 음완간": "hav-02",
  "아미르 리샤르송드": "hav-03",
  "조시 마잔": "hav-04",
  "펠릭스 맘빔빈": "hav-05",
  "고드송 키에레멘": "hav-06",
  "엘리아스 옐레르튼": "hav-07",
  "포데 두쿠렌": "hav-08",
  "라술 은디아옌": "hav-09",
  "세코 아유문": "hav-10",
  "미즈타 가이톤": "hav-11",
  "야니스 주아윈": "hav-12",
  "조앙 탱크른": "hav-13",
  "뱅상 사손": "hav-14",
  "음브와나 사마탄": "hav-15",
  "시몽 에보노근": "hav-16",
  "엔조 코핀": "hav-17",
  "스테팡 자가둔": "hav-18",
  "나카무라 소탄": "hav-19",
  "티모테 펨벨렌": "hav-20",
  "모크란 벤투민": "hav-21",
  "이스마일 부네브스": "hav-22",
  "폴 아르그넨": "hav-23",
  "리오넬 음파신": "hav-24",
  "다렌 모셍곤": "hav-25",
  "고티에 갈롱드": "hav-26",
  "에완 아트푸르": "lmn-01",
  "아롤드 부아옌": "lmn-02",
  "에드윈 쿠아르신": "lmn-03",
  "빌랄 브라히민": "lmn-04",
  "알렉상드르 로렌": "lmn-05",
  "앙투안 라비야른": "lmn-06",
  "장 베르크루이손": "lmn-07",
  "아딜 부라반": "lmn-08",
  "루이 마푸탄": "lmn-09",
  "노아 부아센": "lmn-10",
  "라울 토렌텐": "lmn-11",
  "사뮈엘 요운": "lmn-12",
  "뤼카 부아든": "lmn-13",
  "지브릴 시디벤": "lmn-14",
  "윌리암 아르우준": "lmn-15",
  "테오 에유므": "lmn-16",
  "뤼카 칼로단": "lmn-17",
  "다우다 트라오렌": "lmn-18",
  "밀랑 로뱅드": "lmn-19",
  "담 게옌": "lmn-20",
  "라얀 밤반": "lmn-21",
  "마르탱 로시뇰라": "lmn-22",
  "에르완 콜란": "lmn-23",
  "뤼카 브르텔라": "lmn-24",
  "야세르 라루신": "lmn-25",
  "니콜라 코시큰": "lmn-26",
  "엔조 바그네른": "lmn-27",
  "레지스 귀르트네른": "len-01",
  "뤼방 아길라른": "len-02",
  "마이크 나브로츠킨": "len-03",
  "니달 첼리큰": "len-04",
  "안드리야 불라토비츠": "len-05",
  "삼손 바이돈": "len-06",
  "플로리앙 소토칸": "len-07",
  "야신 티트라윈": "len-08",
  "토르강 아자른": "len-09",
  "플로리앙 토뱅드": "len-10",
  "오종 에두아른": "len-11",
  "조아네르 차베손": "len-12",
  "마티외 위돌라": "len-13",
  "마티외 고르젤랭드": "len-14",
  "압달라 시만": "len-15",
  "장클레르 토디본": "len-16",
  "아마두 아이다란": "len-17",
  "미하우 스코라신": "len-18",
  "사우드 압둘하미든": "len-19",
  "조나탕 그라딘": "len-20",
  "이스마엘로 가니운": "len-21",
  "미카엘 퀴상손": "len-22",
  "쥐니오르 카딜라": "len-23",
  "프란요 이바노비츠": "len-24",
  "술레이만 사냥드": "len-25",
  "로뱅 리세른": "len-26",
  "베르케 외제른": "lil-01",
  "룬 스르다노비츠": "lil-02",
  "나탕 응고인": "lil-03",
  "알렉산드룬": "lil-04",
  "나빌 벤탈레브스": "lil-05",
  "딜란 바크완": "lil-06",
  "에탕 음바펜": "lil-07",
  "올리비에 지룬": "lil-08",
  "하콘 하랄드손드": "lil-09",
  "오사메 사라윈": "lil-10",
  "오를란도 힐라": "lil-11",
  "마우리츠 케르고른": "lil-12",
  "로맹 페론": "lil-13",
  "아르노 보다른": "lil-14",
  "응갈라옐 무카운": "lil-15",
  "우에다 아야센": "lil-16",
  "바샤르 외날라": "lil-17",
  "뱅자맹 앙드렌": "lil-18",
  "티아구 산투손": "lil-19",
  "탕기 니앙준": "lil-20",
  "칼빈 페르동큰": "lil-21",
  "이자크 코시엔": "lil-22",
  "가에탕 페랭드": "lil-23",
  "함자 이가마느": "lil-24",
  "소리바 디아운드": "lil-25",
  "뱅자맹 르루안": "lor-01",
  "알렉 조르장드": "lor-02",
  "몬타사르 탈빈": "lor-03",
  "포르모즈 멘딘": "lor-04",
  "방디우구 파디간": "lor-05",
  "노아 카디운": "lor-06",
  "모하메드 밤반": "lor-07",
  "이사크 옌센드": "lor-08",
  "테오 르 브린": "lor-09",
  "아이예군 토시느": "lor-10",
  "장빅토르 마켕곤": "lor-11",
  "이브라히마 발덴": "lor-12",
  "술레이만 파옌": "lor-13",
  "뎀보 실란": "lor-14",
  "빈구루 카마란": "lor-15",
  "스르잔 쿠즈미츠": "lor-16",
  "너새니얼 아제인": "lor-17",
  "가뱅 베르나르돈": "lor-18",
  "이봉 음보곤": "lor-19",
  "아르센 쿠아신": "lor-20",
  "노사 에드워드 오바레티느": "lor-21",
  "아르튀르 아보므": "lor-22",
  "노아 음밤반": "lor-23",
  "파노스 카체리손": "lor-24",
  "이자크 투렌": "lor-25"
}

/** 초상 생성 프롬프트용 속성. */
export const SQUAD_PORTRAIT_META: Record<string, { name: string; nation: string; birthYear: number; pos: string; club: string }> = {
  "ulsan-01": {
    "name": "최주헌",
    "nation": "대한민국",
    "birthYear": 2002,
    "pos": "GK",
    "club": "울산 호랑"
  },
  "ulsan-02": {
    "name": "윤중규",
    "nation": "대한민국",
    "birthYear": 1998,
    "pos": "RB",
    "club": "울산 호랑"
  },
  "ulsan-03": {
    "name": "정선빈",
    "nation": "대한민국",
    "birthYear": 2000,
    "pos": "CB",
    "club": "울산 호랑"
  },
  "ulsan-04": {
    "name": "서명권",
    "nation": "대한민국",
    "birthYear": 2002,
    "pos": "CB",
    "club": "울산 호랑"
  },
  "ulsan-06": {
    "name": "다리안 보야닉",
    "nation": "스웨덴",
    "birthYear": 1994,
    "pos": "CM",
    "club": "울산 호랑"
  },
  "ulsan-08": {
    "name": "이희근",
    "nation": "대한민국",
    "birthYear": 1998,
    "pos": "RW",
    "club": "울산 호랑"
  },
  "ulsan-09": {
    "name": "마르카노",
    "nation": "브라질",
    "birthYear": 1996,
    "pos": "ST",
    "club": "울산 호랑"
  },
  "ulsan-10": {
    "name": "이동겸",
    "nation": "대한민국",
    "birthYear": 1997,
    "pos": "CAM",
    "club": "울산 호랑"
  },
  "ulsan-11": {
    "name": "에릭 파리스",
    "nation": "브라질",
    "birthYear": 1999,
    "pos": "LW",
    "club": "울산 호랑"
  },
  "ulsan-13": {
    "name": "류승민",
    "nation": "대한민국",
    "birthYear": 2003,
    "pos": "GK",
    "club": "울산 호랑"
  },
  "ulsan-14": {
    "name": "이진헌",
    "nation": "대한민국",
    "birthYear": 1997,
    "pos": "CM",
    "club": "울산 호랑"
  },
  "ulsan-15": {
    "name": "정승헌",
    "nation": "대한민국",
    "birthYear": 1994,
    "pos": "CB",
    "club": "울산 호랑"
  },
  "ulsan-16": {
    "name": "박우재",
    "nation": "대한민국",
    "birthYear": 1999,
    "pos": "CM",
    "club": "울산 호랑"
  },
  "ulsan-17": {
    "name": "강상유",
    "nation": "대한민국",
    "birthYear": 1993,
    "pos": "LB",
    "club": "울산 호랑"
  },
  "ulsan-19": {
    "name": "김영궁",
    "nation": "대한민국",
    "birthYear": 1990,
    "pos": "CB",
    "club": "울산 호랑"
  },
  "ulsan-20": {
    "name": "정재삼",
    "nation": "대한민국",
    "birthYear": 2004,
    "pos": "ST",
    "club": "울산 호랑"
  },
  "ulsan-21": {
    "name": "조현운",
    "nation": "대한민국",
    "birthYear": 1991,
    "pos": "GK",
    "club": "울산 호랑"
  },
  "ulsan-23": {
    "name": "문정일",
    "nation": "대한민국",
    "birthYear": 1998,
    "pos": "GK",
    "club": "울산 호랑"
  },
  "ulsan-24": {
    "name": "이규선",
    "nation": "대한민국",
    "birthYear": 1994,
    "pos": "CDM",
    "club": "울산 호랑"
  },
  "ulsan-26": {
    "name": "조현탁",
    "nation": "대한민국",
    "birthYear": 2001,
    "pos": "LB",
    "club": "울산 호랑"
  },
  "ulsan-27": {
    "name": "페드리노",
    "nation": "브라질",
    "birthYear": 1996,
    "pos": "RW",
    "club": "울산 호랑"
  },
  "ulsan-28": {
    "name": "이재억",
    "nation": "대한민국",
    "birthYear": 1999,
    "pos": "CB",
    "club": "울산 호랑"
  },
  "ulsan-31": {
    "name": "황병건",
    "nation": "대한민국",
    "birthYear": 1994,
    "pos": "GK",
    "club": "울산 호랑"
  },
  "ulsan-33": {
    "name": "장시연",
    "nation": "대한민국",
    "birthYear": 2002,
    "pos": "RM",
    "club": "울산 호랑"
  },
  "ulsan-38": {
    "name": "박용유",
    "nation": "대한민국",
    "birthYear": 1993,
    "pos": "CDM",
    "club": "울산 호랑"
  },
  "ulsan-43": {
    "name": "조민석",
    "nation": "대한민국",
    "birthYear": 2005,
    "pos": "CM",
    "club": "울산 호랑"
  },
  "ulsan-55": {
    "name": "토마스 오데코트",
    "nation": "네덜란드",
    "birthYear": 1997,
    "pos": "CB",
    "club": "울산 호랑"
  },
  "ulsan-66": {
    "name": "밀로시 트로약",
    "nation": "폴란드",
    "birthYear": 1997,
    "pos": "CB",
    "club": "울산 호랑"
  },
  "ulsan-72": {
    "name": "백인유",
    "nation": "대한민국",
    "birthYear": 2004,
    "pos": "CM",
    "club": "울산 호랑"
  },
  "ulsan-77": {
    "name": "심상만",
    "nation": "대한민국",
    "birthYear": 1993,
    "pos": "LB",
    "club": "울산 호랑"
  },
  "ulsan-91": {
    "name": "벤지 미셀",
    "nation": "미국",
    "birthYear": 1997,
    "pos": "LM",
    "club": "울산 호랑"
  },
  "ulsan-96": {
    "name": "최석헌",
    "nation": "대한민국",
    "birthYear": 2004,
    "pos": "CB",
    "club": "울산 호랑"
  },
  "ulsan-99": {
    "name": "야고 카리엘",
    "nation": "브라질",
    "birthYear": 1999,
    "pos": "ST",
    "club": "울산 호랑"
  },
  "manred-01": {
    "name": "세네 라멘츠",
    "nation": "벨기에",
    "birthYear": 2002,
    "pos": "GK",
    "club": "맨체스 레즈"
  },
  "manred-02": {
    "name": "디오고 달로",
    "nation": "포르투갈",
    "birthYear": 1999,
    "pos": "RB",
    "club": "맨체스 레즈"
  },
  "manred-03": {
    "name": "누사이르 마즈라우",
    "nation": "모로코",
    "birthYear": 1997,
    "pos": "RB",
    "club": "맨체스 레즈"
  },
  "manred-04": {
    "name": "마테이스 데 리트",
    "nation": "네덜란드",
    "birthYear": 1999,
    "pos": "CB",
    "club": "맨체스 레즈"
  },
  "manred-05": {
    "name": "해리 맥과이",
    "nation": "잉글랜드",
    "birthYear": 1993,
    "pos": "CB",
    "club": "맨체스 레즈"
  },
  "manred-06": {
    "name": "리산드로 마르티노",
    "nation": "아르헨티나",
    "birthYear": 1998,
    "pos": "CB",
    "club": "맨체스 레즈"
  },
  "manred-07": {
    "name": "메이슨 마운드",
    "nation": "잉글랜드",
    "birthYear": 1999,
    "pos": "CM",
    "club": "맨체스 레즈"
  },
  "manred-08": {
    "name": "브루노 페르난도",
    "nation": "포르투갈",
    "birthYear": 1994,
    "pos": "CAM",
    "club": "맨체스 레즈"
  },
  "manred-09": {
    "name": "마커스 래시포",
    "nation": "잉글랜드",
    "birthYear": 1997,
    "pos": "LW",
    "club": "맨체스 레즈"
  },
  "manred-10": {
    "name": "마테우스 쿠뉴",
    "nation": "브라질",
    "birthYear": 1999,
    "pos": "CAM",
    "club": "맨체스 레즈"
  },
  "manred-11": {
    "name": "조슈아 지르크",
    "nation": "네덜란드",
    "birthYear": 2001,
    "pos": "ST",
    "club": "맨체스 레즈"
  },
  "manred-12": {
    "name": "칼 다를로",
    "nation": "웨일스",
    "birthYear": 1990,
    "pos": "GK",
    "club": "맨체스 레즈"
  },
  "manred-13": {
    "name": "패트릭 도르그",
    "nation": "덴마크",
    "birthYear": 2004,
    "pos": "LB",
    "club": "맨체스 레즈"
  },
  "manred-15": {
    "name": "레니 요루",
    "nation": "프랑스",
    "birthYear": 2005,
    "pos": "CB",
    "club": "맨체스 레즈"
  },
  "manred-16": {
    "name": "아마드 디알",
    "nation": "코트디부아르",
    "birthYear": 2002,
    "pos": "RW",
    "club": "맨체스 레즈"
  },
  "manred-17": {
    "name": "안드레이 산토",
    "nation": "브라질",
    "birthYear": 2004,
    "pos": "CM",
    "club": "맨체스 레즈"
  },
  "manred-18": {
    "name": "유리 틸레망",
    "nation": "벨기에",
    "birthYear": 1997,
    "pos": "CM",
    "club": "맨체스 레즈"
  },
  "manred-19": {
    "name": "브라이언 음보모",
    "nation": "카메룬",
    "birthYear": 1999,
    "pos": "RW",
    "club": "맨체스 레즈"
  },
  "manred-20": {
    "name": "카를로스 발레브",
    "nation": "카메룬",
    "birthYear": 2004,
    "pos": "CDM",
    "club": "맨체스 레즈"
  },
  "manred-22": {
    "name": "톰 히튼",
    "nation": "잉글랜드",
    "birthYear": 1986,
    "pos": "GK",
    "club": "맨체스 레즈"
  },
  "manred-23": {
    "name": "루크 쇼어",
    "nation": "잉글랜드",
    "birthYear": 1995,
    "pos": "LB",
    "club": "맨체스 레즈"
  },
  "manred-25": {
    "name": "마누엘 우가르타",
    "nation": "우루과이",
    "birthYear": 2001,
    "pos": "CDM",
    "club": "맨체스 레즈"
  },
  "manred-26": {
    "name": "에이든 헤번",
    "nation": "잉글랜드",
    "birthYear": 2006,
    "pos": "CB",
    "club": "맨체스 레즈"
  },
  "manred-30": {
    "name": "벤야민 셰스코",
    "nation": "슬로베니아",
    "birthYear": 2003,
    "pos": "ST",
    "club": "맨체스 레즈"
  },
  "manred-31": {
    "name": "셰이 레이스",
    "nation": "잉글랜드",
    "birthYear": 2007,
    "pos": "RW",
    "club": "맨체스 레즈"
  },
  "manred-37": {
    "name": "코비 마이노",
    "nation": "잉글랜드",
    "birthYear": 2005,
    "pos": "CM",
    "club": "맨체스 레즈"
  },
  "manred-38": {
    "name": "잭 플레쳐",
    "nation": "잉글랜드",
    "birthYear": 2007,
    "pos": "CM",
    "club": "맨체스 레즈"
  },
  "manred-39": {
    "name": "타일러 플레쳐",
    "nation": "스코틀랜드",
    "birthYear": 2007,
    "pos": "CM",
    "club": "맨체스 레즈"
  },
  "manred-41": {
    "name": "해리 아마즈",
    "nation": "잉글랜드",
    "birthYear": 2007,
    "pos": "LB",
    "club": "맨체스 레즈"
  },
  "manred-45": {
    "name": "더못 미이",
    "nation": "북아일랜드",
    "birthYear": 2005,
    "pos": "GK",
    "club": "맨체스 레즈"
  },
  "ars-01": {
    "name": "다비드 라얀",
    "nation": "스페인",
    "birthYear": 1995,
    "pos": "GK",
    "club": "북런던 건너스"
  },
  "ars-02": {
    "name": "케파 아리사발라고",
    "nation": "스페인",
    "birthYear": 1994,
    "pos": "GK",
    "club": "북런던 건너스"
  },
  "ars-03": {
    "name": "일랑 멜리어",
    "nation": "프랑스",
    "birthYear": 2000,
    "pos": "GK",
    "club": "북런던 건너스"
  },
  "ars-04": {
    "name": "윌리엄 살리반",
    "nation": "프랑스",
    "birthYear": 2001,
    "pos": "CB",
    "club": "북런던 건너스"
  },
  "ars-05": {
    "name": "크리스티안 모스케로",
    "nation": "스페인",
    "birthYear": 2004,
    "pos": "CB",
    "club": "북런던 건너스"
  },
  "ars-06": {
    "name": "벤 화이터",
    "nation": "잉글랜드",
    "birthYear": 1997,
    "pos": "RB",
    "club": "북런던 건너스"
  },
  "ars-07": {
    "name": "피에로 인카피오",
    "nation": "에콰도르",
    "birthYear": 2002,
    "pos": "CB",
    "club": "북런던 건너스"
  },
  "ars-08": {
    "name": "가브리엘 마갈량스",
    "nation": "브라질",
    "birthYear": 1997,
    "pos": "CB",
    "club": "북런던 건너스"
  },
  "ars-09": {
    "name": "유리엔 팀베르",
    "nation": "네덜란드",
    "birthYear": 2001,
    "pos": "RB",
    "club": "북런던 건너스"
  },
  "ars-10": {
    "name": "에즈리 콘살",
    "nation": "잉글랜드",
    "birthYear": 1997,
    "pos": "CB",
    "club": "북런던 건너스"
  },
  "ars-11": {
    "name": "리카르도 칼라피오레",
    "nation": "이탈리아",
    "birthYear": 2002,
    "pos": "LB",
    "club": "북런던 건너스"
  },
  "ars-12": {
    "name": "마일스 루이스켈리",
    "nation": "잉글랜드",
    "birthYear": 2006,
    "pos": "LB",
    "club": "북런던 건너스"
  },
  "ars-13": {
    "name": "마르틴 외데가르",
    "nation": "노르웨이",
    "birthYear": 1998,
    "pos": "CAM",
    "club": "북런던 건너스"
  },
  "ars-14": {
    "name": "에베레치 에젬",
    "nation": "잉글랜드",
    "birthYear": 1998,
    "pos": "CAM",
    "club": "북런던 건너스"
  },
  "ars-15": {
    "name": "미켈 메리나",
    "nation": "스페인",
    "birthYear": 1996,
    "pos": "CM",
    "club": "북런던 건너스"
  },
  "ars-16": {
    "name": "마르틴 수비멘도",
    "nation": "스페인",
    "birthYear": 1999,
    "pos": "CDM",
    "club": "북런던 건너스"
  },
  "ars-17": {
    "name": "브루누 기마랑스",
    "nation": "브라질",
    "birthYear": 1997,
    "pos": "CM",
    "club": "북런던 건너스"
  },
  "ars-18": {
    "name": "데클란 라이슨",
    "nation": "잉글랜드",
    "birthYear": 1999,
    "pos": "CM",
    "club": "북런던 건너스"
  },
  "ars-19": {
    "name": "부카요 사칸",
    "nation": "잉글랜드",
    "birthYear": 2001,
    "pos": "RW",
    "club": "북런던 건너스"
  },
  "ars-20": {
    "name": "빅토르 요케레손",
    "nation": "스웨덴",
    "birthYear": 1998,
    "pos": "ST",
    "club": "북런던 건너스"
  },
  "ars-21": {
    "name": "흐리스토스 촐리소",
    "nation": "그리스",
    "birthYear": 2002,
    "pos": "LW",
    "club": "북런던 건너스"
  },
  "ars-22": {
    "name": "노니 마두에코",
    "nation": "잉글랜드",
    "birthYear": 2002,
    "pos": "RW",
    "club": "북런던 건너스"
  },
  "ars-23": {
    "name": "카이 하베르치",
    "nation": "독일",
    "birthYear": 1999,
    "pos": "ST",
    "club": "북런던 건너스"
  },
  "avl-01": {
    "name": "스즈키 자이언",
    "nation": "일본",
    "birthYear": 2002,
    "pos": "GK",
    "club": "아스톤 라이온"
  },
  "avl-02": {
    "name": "마르코 비조",
    "nation": "네덜란드",
    "birthYear": 1991,
    "pos": "GK",
    "club": "아스톤 라이온"
  },
  "avl-03": {
    "name": "제임스 라이토",
    "nation": "잉글랜드",
    "birthYear": 2004,
    "pos": "GK",
    "club": "아스톤 라이온"
  },
  "avl-04": {
    "name": "매티 캐신",
    "nation": "폴란드",
    "birthYear": 1997,
    "pos": "RB",
    "club": "아스톤 라이온"
  },
  "avl-05": {
    "name": "빅토르 린델로프",
    "nation": "스웨덴",
    "birthYear": 1994,
    "pos": "CB",
    "club": "아스톤 라이온"
  },
  "avl-06": {
    "name": "테일러 하우드벨린",
    "nation": "잉글랜드",
    "birthYear": 2002,
    "pos": "CB",
    "club": "아스톤 라이온"
  },
  "avl-07": {
    "name": "타이론 밍고",
    "nation": "잉글랜드",
    "birthYear": 1993,
    "pos": "CB",
    "club": "아스톤 라이온"
  },
  "avl-08": {
    "name": "마테오 루제로",
    "nation": "이탈리아",
    "birthYear": 2002,
    "pos": "LB",
    "club": "아스톤 라이온"
  },
  "avl-09": {
    "name": "파우 토레소",
    "nation": "스페인",
    "birthYear": 1997,
    "pos": "CB",
    "club": "아스톤 라이온"
  },
  "avl-10": {
    "name": "이안 마트손",
    "nation": "네덜란드",
    "birthYear": 2002,
    "pos": "LB",
    "club": "아스톤 라이온"
  },
  "avl-11": {
    "name": "애런 완비사코",
    "nation": "콩고민주공화국",
    "birthYear": 1997,
    "pos": "RB",
    "club": "아스톤 라이온"
  },
  "avl-12": {
    "name": "모두 케바 시소",
    "nation": "세네갈",
    "birthYear": 2005,
    "pos": "CB",
    "club": "아스톤 라이온"
  },
  "avl-13": {
    "name": "트래비스 패터손",
    "nation": "잉글랜드",
    "birthYear": 2005,
    "pos": "RB",
    "club": "아스톤 라이온"
  },
  "avl-14": {
    "name": "로스 바클라",
    "nation": "잉글랜드",
    "birthYear": 1993,
    "pos": "CM",
    "club": "아스톤 라이온"
  },
  "avl-15": {
    "name": "존 맥기너",
    "nation": "스코틀랜드",
    "birthYear": 1994,
    "pos": "CM",
    "club": "아스톤 라이온"
  },
  "avl-16": {
    "name": "부바카르 카마로",
    "nation": "프랑스",
    "birthYear": 1999,
    "pos": "CDM",
    "club": "아스톤 라이온"
  },
  "avl-17": {
    "name": "에밀리아노 부엔디오",
    "nation": "아르헨티나",
    "birthYear": 1996,
    "pos": "CAM",
    "club": "아스톤 라이온"
  },
  "avl-18": {
    "name": "자말딘 지모알로반",
    "nation": "잉글랜드",
    "birthYear": 2006,
    "pos": "CM",
    "club": "아스톤 라이온"
  },
  "avl-19": {
    "name": "아마두 오나노",
    "nation": "벨기에",
    "birthYear": 2001,
    "pos": "CDM",
    "club": "아스톤 라이온"
  },
  "avl-20": {
    "name": "라마레 보하르도",
    "nation": "네덜란드",
    "birthYear": 2004,
    "pos": "CDM",
    "club": "아스톤 라이온"
  },
  "avl-21": {
    "name": "레온 고레츠코",
    "nation": "독일",
    "birthYear": 1995,
    "pos": "CM",
    "club": "아스톤 라이온"
  },
  "avl-22": {
    "name": "주앙 고메손",
    "nation": "브라질",
    "birthYear": 2001,
    "pos": "CM",
    "club": "아스톤 라이온"
  },
  "avl-23": {
    "name": "요한 만잠보",
    "nation": "스위스",
    "birthYear": 2005,
    "pos": "CM",
    "club": "아스톤 라이온"
  },
  "avl-24": {
    "name": "니콜라 잭손",
    "nation": "세네갈",
    "birthYear": 2001,
    "pos": "ST",
    "club": "아스톤 라이온"
  },
  "avl-25": {
    "name": "알레한드로 가르나쇼",
    "nation": "아르헨티나",
    "birthYear": 2004,
    "pos": "LW",
    "club": "아스톤 라이온"
  },
  "avl-26": {
    "name": "태미 에이브러함",
    "nation": "잉글랜드",
    "birthYear": 1997,
    "pos": "ST",
    "club": "아스톤 라이온"
  },
  "avl-27": {
    "name": "이브라힘 음바여",
    "nation": "세네갈",
    "birthYear": 2008,
    "pos": "RW",
    "club": "아스톤 라이온"
  },
  "avl-28": {
    "name": "알리손 주니오",
    "nation": "브라질",
    "birthYear": 2006,
    "pos": "LW",
    "club": "아스톤 라이온"
  },
  "bre-01": {
    "name": "에길 셀비큰",
    "nation": "노르웨이",
    "birthYear": 1997,
    "pos": "GK",
    "club": "브레스트 피라트"
  },
  "bre-02": {
    "name": "브래들리 로콘",
    "nation": "프랑스",
    "birthYear": 2002,
    "pos": "LB",
    "club": "브레스트 피라트"
  },
  "bre-03": {
    "name": "고티에 요리손",
    "nation": "프랑스",
    "birthYear": 1995,
    "pos": "CB",
    "club": "브레스트 피라트"
  },
  "bre-04": {
    "name": "브렌당 샤르도넨",
    "nation": "프랑스",
    "birthYear": 1994,
    "pos": "CB",
    "club": "브레스트 피라트"
  },
  "bre-05": {
    "name": "마마디 디암분",
    "nation": "말리",
    "birthYear": 2002,
    "pos": "CDM",
    "club": "브레스트 피라트"
  },
  "bre-06": {
    "name": "조제프 농젠",
    "nation": "벨기에",
    "birthYear": 2005,
    "pos": "CM",
    "club": "브레스트 피라트"
  },
  "bre-07": {
    "name": "위고 마녜틴",
    "nation": "프랑스",
    "birthYear": 1998,
    "pos": "CM",
    "club": "브레스트 피라트"
  },
  "bre-08": {
    "name": "파테 음부픈",
    "nation": "세네갈",
    "birthYear": 2003,
    "pos": "ST",
    "club": "브레스트 피라트"
  },
  "bre-09": {
    "name": "조바니 베르시닌",
    "nation": "프랑스",
    "birthYear": 2004,
    "pos": "CAM",
    "club": "브레스트 피라트"
  },
  "bre-10": {
    "name": "악셀 캉블랑드",
    "nation": "프랑스",
    "birthYear": 2003,
    "pos": "LW",
    "club": "브레스트 피라트"
  },
  "bre-11": {
    "name": "조리스 쇼타른",
    "nation": "프랑스",
    "birthYear": 2001,
    "pos": "CM",
    "club": "브레스트 피라트"
  },
  "bre-12": {
    "name": "마마 발덴",
    "nation": "기니비사우",
    "birthYear": 1997,
    "pos": "LW",
    "club": "브레스트 피라트"
  },
  "bre-13": {
    "name": "쥐스탱 부르곤",
    "nation": "프랑스",
    "birthYear": 2005,
    "pos": "LB",
    "club": "브레스트 피라트"
  },
  "bre-14": {
    "name": "뤼도비크 아조르큰",
    "nation": "프랑스",
    "birthYear": 1994,
    "pos": "ST",
    "club": "브레스트 피라트"
  },
  "bre-15": {
    "name": "뤼크 조그벤",
    "nation": "코트디부아르",
    "birthYear": 2005,
    "pos": "RB",
    "club": "브레스트 피라트"
  },
  "bre-16": {
    "name": "카모리 둠비안",
    "nation": "말리",
    "birthYear": 2003,
    "pos": "CAM",
    "club": "브레스트 피라트"
  },
  "bre-17": {
    "name": "뤼카 투사른",
    "nation": "프랑스",
    "birthYear": 1997,
    "pos": "CDM",
    "club": "브레스트 피라트"
  },
  "bre-18": {
    "name": "마티외 파투이옌",
    "nation": "프랑스",
    "birthYear": 2004,
    "pos": "GK",
    "club": "브레스트 피라트"
  },
  "bre-19": {
    "name": "케니 랄란",
    "nation": "프랑스",
    "birthYear": 1991,
    "pos": "RB",
    "club": "브레스트 피라트"
  },
  "bre-20": {
    "name": "라파엘 르갱드",
    "nation": "프랑스",
    "birthYear": 2006,
    "pos": "CB",
    "club": "브레스트 피라트"
  },
  "bre-21": {
    "name": "비탈리 야넬토",
    "nation": "독일",
    "birthYear": 1998,
    "pos": "CDM",
    "club": "브렌트 벌"
  },
  "bre-22": {
    "name": "케빈 샤도",
    "nation": "독일",
    "birthYear": 2001,
    "pos": "LW",
    "club": "브렌트 벌"
  },
  "bre-23": {
    "name": "이고르 치아고",
    "nation": "브라질",
    "birthYear": 2001,
    "pos": "ST",
    "club": "브렌트 벌"
  },
  "bre-24": {
    "name": "당고 와타로",
    "nation": "부르키나파소",
    "birthYear": 2002,
    "pos": "RW",
    "club": "브렌트 벌"
  },
  "bre-25": {
    "name": "칼럼 윌손",
    "nation": "잉글랜드",
    "birthYear": 1992,
    "pos": "ST",
    "club": "브렌트 벌"
  },
  "bre-26": {
    "name": "제이든 앤서노",
    "nation": "잉글랜드",
    "birthYear": 1999,
    "pos": "LW",
    "club": "브렌트 벌"
  },
  "bre-27": {
    "name": "킨 루이스포토",
    "nation": "잉글랜드",
    "birthYear": 2001,
    "pos": "LW",
    "club": "브렌트 벌"
  },
  "bre-28": {
    "name": "구스타보 누네소",
    "nation": "브라질",
    "birthYear": 2005,
    "pos": "LW",
    "club": "브렌트 벌"
  },
  "bou-01": {
    "name": "조르제 페트로빈",
    "nation": "세르비아",
    "birthYear": 1999,
    "pos": "GK",
    "club": "본머스 체리"
  },
  "bou-02": {
    "name": "프레이저 포스톤",
    "nation": "잉글랜드",
    "birthYear": 1988,
    "pos": "GK",
    "club": "본머스 체리"
  },
  "bou-03": {
    "name": "미켈레 디 그레고로",
    "nation": "이탈리아",
    "birthYear": 1997,
    "pos": "GK",
    "club": "본머스 체리"
  },
  "bou-04": {
    "name": "훌리안 아라우조",
    "nation": "멕시코",
    "birthYear": 2001,
    "pos": "RB",
    "club": "본머스 체리"
  },
  "bou-05": {
    "name": "아드리앵 트뤼페로",
    "nation": "프랑스",
    "birthYear": 2001,
    "pos": "LB",
    "club": "본머스 체리"
  },
  "bou-06": {
    "name": "제임스 힐런",
    "nation": "잉글랜드",
    "birthYear": 2002,
    "pos": "CB",
    "club": "본머스 체리"
  },
  "bou-07": {
    "name": "훌리오 솔레로",
    "nation": "아르헨티나",
    "birthYear": 2005,
    "pos": "LB",
    "club": "본머스 체리"
  },
  "bou-08": {
    "name": "안토니우 실반",
    "nation": "포르투갈",
    "birthYear": 2003,
    "pos": "CB",
    "club": "본머스 체리"
  },
  "bou-09": {
    "name": "애덤 스미슨",
    "nation": "잉글랜드",
    "birthYear": 1991,
    "pos": "RB",
    "club": "본머스 체리"
  },
  "bou-10": {
    "name": "바포데 디아키토",
    "nation": "프랑스",
    "birthYear": 2001,
    "pos": "CB",
    "club": "본머스 체리"
  },
  "bou-11": {
    "name": "후안루 산체소",
    "nation": "스페인",
    "birthYear": 2003,
    "pos": "RB",
    "club": "본머스 체리"
  },
  "bou-12": {
    "name": "맥스 애런손",
    "nation": "잉글랜드",
    "birthYear": 2000,
    "pos": "RB",
    "club": "본머스 체리"
  },
  "bou-13": {
    "name": "벨코 밀로사블레빈",
    "nation": "세르비아",
    "birthYear": 2007,
    "pos": "CB",
    "club": "본머스 체리"
  },
  "bou-14": {
    "name": "루이스 쿡스",
    "nation": "잉글랜드",
    "birthYear": 1997,
    "pos": "CM",
    "club": "본머스 체리"
  },
  "bou-15": {
    "name": "데이비드 브룩손",
    "nation": "웨일스",
    "birthYear": 1997,
    "pos": "RW",
    "club": "본머스 체리"
  },
  "bou-16": {
    "name": "알렉스 스코트",
    "nation": "잉글랜드",
    "birthYear": 2003,
    "pos": "CM",
    "club": "본머스 체리"
  },
  "bou-17": {
    "name": "라이언 크리스토",
    "nation": "스코틀랜드",
    "birthYear": 1995,
    "pos": "CM",
    "club": "본머스 체리"
  },
  "bou-18": {
    "name": "타일러 애덤손",
    "nation": "미국",
    "birthYear": 1999,
    "pos": "CDM",
    "club": "본머스 체리"
  },
  "bou-19": {
    "name": "마커스 태버니오",
    "nation": "잉글랜드",
    "birthYear": 1999,
    "pos": "LW",
    "club": "본머스 체리"
  },
  "bou-20": {
    "name": "아민 아들로",
    "nation": "모로코",
    "birthYear": 2000,
    "pos": "LW",
    "club": "본머스 체리"
  },
  "bou-21": {
    "name": "알렉스 토토",
    "nation": "헝가리",
    "birthYear": 2005,
    "pos": "CM",
    "club": "본머스 체리"
  },
  "bou-22": {
    "name": "에바닐손",
    "nation": "브라질",
    "birthYear": 1999,
    "pos": "ST",
    "club": "본머스 체리"
  },
  "bou-23": {
    "name": "벤 개넌독",
    "nation": "스코틀랜드",
    "birthYear": 2005,
    "pos": "RW",
    "club": "본머스 체리"
  },
  "bou-24": {
    "name": "저스틴 클라위베르",
    "nation": "네덜란드",
    "birthYear": 1999,
    "pos": "LW",
    "club": "본머스 체리"
  },
  "bou-25": {
    "name": "엘리 크루포",
    "nation": "프랑스",
    "birthYear": 2006,
    "pos": "ST",
    "club": "본머스 체리"
  },
  "bou-26": {
    "name": "대니얼 제비손",
    "nation": "캐나다",
    "birthYear": 2003,
    "pos": "ST",
    "club": "본머스 체리"
  },
  "bou-27": {
    "name": "알바로 로드리게소",
    "nation": "우루과이",
    "birthYear": 2004,
    "pos": "ST",
    "club": "본머스 체리"
  },
  "bou-28": {
    "name": "하이안",
    "nation": "브라질",
    "birthYear": 2006,
    "pos": "LW",
    "club": "본머스 체리"
  },
  "bha-01": {
    "name": "바르트 페르브뤼헌",
    "nation": "네덜란드",
    "birthYear": 2002,
    "pos": "GK",
    "club": "브라이턴 걸스"
  },
  "bha-02": {
    "name": "제이슨 스틸런",
    "nation": "잉글랜드",
    "birthYear": 1990,
    "pos": "GK",
    "club": "브라이턴 걸스"
  },
  "bha-03": {
    "name": "톰 맥길런",
    "nation": "캐나다",
    "birthYear": 2000,
    "pos": "GK",
    "club": "브라이턴 걸스"
  },
  "bha-04": {
    "name": "자우엔 하자모",
    "nation": "알제리",
    "birthYear": 2003,
    "pos": "LB",
    "club": "브라이턴 걸스"
  },
  "bha-05": {
    "name": "파스칼 스트라위코",
    "nation": "네덜란드",
    "birthYear": 1999,
    "pos": "CB",
    "club": "브라이턴 걸스"
  },
  "bha-06": {
    "name": "루이스 덩크스",
    "nation": "잉글랜드",
    "birthYear": 1991,
    "pos": "CB",
    "club": "브라이턴 걸스"
  },
  "bha-07": {
    "name": "코스치노",
    "nation": "포르투갈",
    "birthYear": 2000,
    "pos": "RB",
    "club": "브라이턴 걸스"
  },
  "bha-08": {
    "name": "올리비에 보스칼로",
    "nation": "프랑스",
    "birthYear": 1997,
    "pos": "CB",
    "club": "브라이턴 걸스"
  },
  "bha-09": {
    "name": "페르디 카디오글로",
    "nation": "튀르키예",
    "birthYear": 1999,
    "pos": "LB",
    "club": "브라이턴 걸스"
  },
  "bha-10": {
    "name": "마츠 비페르",
    "nation": "네덜란드",
    "birthYear": 1999,
    "pos": "CDM",
    "club": "브라이턴 걸스"
  },
  "bha-11": {
    "name": "막심 더 카위페르",
    "nation": "벨기에",
    "birthYear": 2000,
    "pos": "LB",
    "club": "브라이턴 걸스"
  },
  "bha-12": {
    "name": "미하엘 스보보도",
    "nation": "오스트리아",
    "birthYear": 1998,
    "pos": "CB",
    "club": "브라이턴 걸스"
  },
  "bha-13": {
    "name": "루카 부슈코빈",
    "nation": "크로아티아",
    "birthYear": 2007,
    "pos": "CB",
    "club": "브라이턴 걸스"
  },
  "bha-14": {
    "name": "미토마 가오로",
    "nation": "일본",
    "birthYear": 1997,
    "pos": "LW",
    "club": "브라이턴 걸스"
  },
  "bha-15": {
    "name": "잭 힌셸우즈",
    "nation": "잉글랜드",
    "birthYear": 2005,
    "pos": "CM",
    "club": "브라이턴 걸스"
  },
  "bha-16": {
    "name": "얀쿠바 민테흐",
    "nation": "감비아",
    "birthYear": 2004,
    "pos": "RW",
    "club": "브라이턴 걸스"
  },
  "bha-17": {
    "name": "파스칼 그로소",
    "nation": "독일",
    "birthYear": 1991,
    "pos": "CM",
    "club": "브라이턴 걸스"
  },
  "bha-18": {
    "name": "체마 안드레소",
    "nation": "스페인",
    "birthYear": 2005,
    "pos": "CDM",
    "club": "브라이턴 걸스"
  },
  "bha-19": {
    "name": "이브라힘 오스마노",
    "nation": "가나",
    "birthYear": 2004,
    "pos": "RW",
    "club": "브라이턴 걸스"
  },
  "bha-20": {
    "name": "디에고 고메소",
    "nation": "파라과이",
    "birthYear": 2003,
    "pos": "CM",
    "club": "브라이턴 걸스"
  },
  "bha-21": {
    "name": "야신 아야로",
    "nation": "스웨덴",
    "birthYear": 2003,
    "pos": "CM",
    "club": "브라이턴 걸스"
  },
  "bha-22": {
    "name": "맷 오라일로",
    "nation": "덴마크",
    "birthYear": 2000,
    "pos": "CAM",
    "club": "브라이턴 걸스"
  },
  "bha-23": {
    "name": "말리크 얄쿠여",
    "nation": "코트디부아르",
    "birthYear": 2005,
    "pos": "CDM",
    "club": "브라이턴 걸스"
  },
  "bha-24": {
    "name": "자독 요한노",
    "nation": "나이지리아",
    "birthYear": 2007,
    "pos": "CM",
    "club": "브라이턴 걸스"
  },
  "bha-25": {
    "name": "페미 아지소",
    "nation": "나이지리아",
    "birthYear": 2001,
    "pos": "RW",
    "club": "브라이턴 걸스"
  },
  "bha-26": {
    "name": "스테파노스 치마소",
    "nation": "그리스",
    "birthYear": 2006,
    "pos": "ST",
    "club": "브라이턴 걸스"
  },
  "bha-27": {
    "name": "조르지니오 뤼테로",
    "nation": "프랑스",
    "birthYear": 2002,
    "pos": "CAM",
    "club": "브라이턴 걸스"
  },
  "bha-28": {
    "name": "하랄람보스 코스툴라소",
    "nation": "그리스",
    "birthYear": 2007,
    "pos": "ST",
    "club": "브라이턴 걸스"
  },
  "bha-29": {
    "name": "에반 퍼거손",
    "nation": "아일랜드",
    "birthYear": 2004,
    "pos": "ST",
    "club": "브라이턴 걸스"
  },
  "che-01": {
    "name": "에밀리아노 마르티네소",
    "nation": "아르헨티나",
    "birthYear": 1992,
    "pos": "GK",
    "club": "런던 블루스"
  },
  "che-02": {
    "name": "테디 샤먼루",
    "nation": "잉글랜드",
    "birthYear": 2003,
    "pos": "GK",
    "club": "런던 블루스"
  },
  "che-03": {
    "name": "마이크 펜더손",
    "nation": "벨기에",
    "birthYear": 2005,
    "pos": "GK",
    "club": "런던 블루스"
  },
  "che-04": {
    "name": "가브리엘 슬로니노",
    "nation": "미국",
    "birthYear": 2004,
    "pos": "GK",
    "club": "런던 블루스"
  },
  "che-05": {
    "name": "마르코 팔레스트로",
    "nation": "이탈리아",
    "birthYear": 2005,
    "pos": "RB",
    "club": "런던 블루스"
  },
  "che-06": {
    "name": "웨슬리 포파노",
    "nation": "프랑스",
    "birthYear": 2000,
    "pos": "CB",
    "club": "런던 블루스"
  },
  "che-07": {
    "name": "발렌틴 바르카",
    "nation": "아르헨티나",
    "birthYear": 2004,
    "pos": "LB",
    "club": "런던 블루스"
  },
  "che-08": {
    "name": "막상스 라크루오",
    "nation": "프랑스",
    "birthYear": 2000,
    "pos": "CB",
    "club": "런던 블루스"
  },
  "che-09": {
    "name": "레비 콜윈",
    "nation": "잉글랜드",
    "birthYear": 2003,
    "pos": "CB",
    "club": "런던 블루스"
  },
  "che-10": {
    "name": "조렐 하투",
    "nation": "네덜란드",
    "birthYear": 2006,
    "pos": "LB",
    "club": "런던 블루스"
  },
  "che-11": {
    "name": "리스 제임손",
    "nation": "잉글랜드",
    "birthYear": 1999,
    "pos": "RB",
    "club": "런던 블루스"
  },
  "che-12": {
    "name": "말로 귀스투",
    "nation": "프랑스",
    "birthYear": 2003,
    "pos": "RB",
    "club": "런던 블루스"
  },
  "che-13": {
    "name": "펩 차바리오",
    "nation": "스페인",
    "birthYear": 1998,
    "pos": "LB",
    "club": "런던 블루스"
  },
  "che-14": {
    "name": "아론 안셀미나",
    "nation": "아르헨티나",
    "birthYear": 2005,
    "pos": "CB",
    "club": "런던 블루스"
  },
  "che-15": {
    "name": "조시 아쳄포",
    "nation": "잉글랜드",
    "birthYear": 2006,
    "pos": "CB",
    "club": "런던 블루스"
  },
  "che-16": {
    "name": "콜 파메르",
    "nation": "잉글랜드",
    "birthYear": 2002,
    "pos": "CAM",
    "club": "런던 블루스"
  },
  "che-17": {
    "name": "조던 헨더손",
    "nation": "잉글랜드",
    "birthYear": 1990,
    "pos": "CM",
    "club": "런던 블루스"
  },
  "che-18": {
    "name": "모건 로저손",
    "nation": "잉글랜드",
    "birthYear": 2002,
    "pos": "CAM",
    "club": "런던 블루스"
  },
  "che-19": {
    "name": "모이세스 카이세두",
    "nation": "에콰도르",
    "birthYear": 2001,
    "pos": "CDM",
    "club": "런던 블루스"
  },
  "che-20": {
    "name": "로메오 라비오",
    "nation": "벨기에",
    "birthYear": 2004,
    "pos": "CDM",
    "club": "런던 블루스"
  },
  "che-21": {
    "name": "페드루 네토",
    "nation": "포르투갈",
    "birthYear": 2000,
    "pos": "RW",
    "club": "런던 블루스"
  },
  "che-22": {
    "name": "주앙 페드로",
    "nation": "브라질",
    "birthYear": 2001,
    "pos": "ST",
    "club": "런던 블루스"
  },
  "che-23": {
    "name": "제이미 기튼손",
    "nation": "잉글랜드",
    "birthYear": 2004,
    "pos": "LW",
    "club": "런던 블루스"
  },
  "che-24": {
    "name": "대니 웰베크",
    "nation": "잉글랜드",
    "birthYear": 1990,
    "pos": "ST",
    "club": "런던 블루스"
  },
  "che-25": {
    "name": "에마뉘엘 에메호",
    "nation": "네덜란드",
    "birthYear": 2003,
    "pos": "ST",
    "club": "런던 블루스"
  },
  "che-26": {
    "name": "제오바니 켄도",
    "nation": "포르투갈",
    "birthYear": 2007,
    "pos": "RW",
    "club": "런던 블루스"
  },
  "che-27": {
    "name": "이스테반",
    "nation": "브라질",
    "birthYear": 2007,
    "pos": "RW",
    "club": "런던 블루스"
  },
  "cov-01": {
    "name": "벤 윌손",
    "nation": "잉글랜드",
    "birthYear": 1992,
    "pos": "GK",
    "club": "코번트리 스카이"
  },
  "cov-02": {
    "name": "칼 러시워드",
    "nation": "잉글랜드",
    "birthYear": 2001,
    "pos": "GK",
    "club": "코번트리 스카이"
  },
  "cov-03": {
    "name": "댄 벤틀로",
    "nation": "잉글랜드",
    "birthYear": 1993,
    "pos": "GK",
    "club": "코번트리 스카이"
  },
  "cov-04": {
    "name": "이선 피노크",
    "nation": "자메이카",
    "birthYear": 1993,
    "pos": "CB",
    "club": "코번트리 스카이"
  },
  "cov-05": {
    "name": "제이 다실보",
    "nation": "웨일스",
    "birthYear": 1998,
    "pos": "LB",
    "club": "코번트리 스카이"
  },
  "cov-06": {
    "name": "보비 토머슨",
    "nation": "잉글랜드",
    "birthYear": 2001,
    "pos": "CB",
    "club": "코번트리 스카이"
  },
  "cov-07": {
    "name": "케인 케슬러헤이던",
    "nation": "잉글랜드",
    "birthYear": 2002,
    "pos": "RB",
    "club": "코번트리 스카이"
  },
  "cov-08": {
    "name": "제이크 비드웰런",
    "nation": "잉글랜드",
    "birthYear": 1993,
    "pos": "LB",
    "club": "코번트리 스카이"
  },
  "cov-09": {
    "name": "조엘 라티보디에",
    "nation": "자메이카",
    "birthYear": 2000,
    "pos": "CB",
    "club": "코번트리 스카이"
  },
  "cov-10": {
    "name": "오렐 아멘도",
    "nation": "스위스",
    "birthYear": 2003,
    "pos": "CB",
    "club": "코번트리 스카이"
  },
  "cov-11": {
    "name": "루크 울펜던",
    "nation": "잉글랜드",
    "birthYear": 1998,
    "pos": "CB",
    "club": "코번트리 스카이"
  },
  "cov-12": {
    "name": "밀란 판 에베이코",
    "nation": "네덜란드",
    "birthYear": 2000,
    "pos": "RB",
    "club": "코번트리 스카이"
  },
  "cov-13": {
    "name": "스티븐 음푸노",
    "nation": "잉글랜드",
    "birthYear": 2007,
    "pos": "CB",
    "club": "코번트리 스카이"
  },
  "cov-14": {
    "name": "잭 루도노",
    "nation": "잉글랜드",
    "birthYear": 2001,
    "pos": "CM",
    "club": "코번트리 스카이"
  },
  "cov-15": {
    "name": "맷 그라임손",
    "nation": "잉글랜드",
    "birthYear": 1995,
    "pos": "CDM",
    "club": "코번트리 스카이"
  },
  "cov-16": {
    "name": "케일럽 이렌코",
    "nation": "가나",
    "birthYear": 2005,
    "pos": "CM",
    "club": "코번트리 스카이"
  },
  "cov-17": {
    "name": "프랭크 오니에코",
    "nation": "나이지리아",
    "birthYear": 1998,
    "pos": "CDM",
    "club": "코번트리 스카이"
  },
  "cov-18": {
    "name": "조시 에클손",
    "nation": "잉글랜드",
    "birthYear": 2000,
    "pos": "CM",
    "club": "코번트리 스카이"
  },
  "cov-19": {
    "name": "빅토르 토르포",
    "nation": "덴마크",
    "birthYear": 1999,
    "pos": "CM",
    "club": "코번트리 스카이"
  },
  "cov-20": {
    "name": "구스타보 하메르",
    "nation": "네덜란드",
    "birthYear": 1997,
    "pos": "CAM",
    "club": "코번트리 스카이"
  },
  "cov-21": {
    "name": "얀 그보후",
    "nation": "프랑스",
    "birthYear": 2001,
    "pos": "CAM",
    "club": "코번트리 스카이"
  },
  "cov-22": {
    "name": "사카모토 다쓰히루",
    "nation": "일본",
    "birthYear": 1996,
    "pos": "RW",
    "club": "코번트리 스카이"
  },
  "cov-23": {
    "name": "엘리스 심손",
    "nation": "잉글랜드",
    "birthYear": 2001,
    "pos": "ST",
    "club": "코번트리 스카이"
  },
  "cov-24": {
    "name": "에프론 메이슨클라코",
    "nation": "자메이카",
    "birthYear": 1999,
    "pos": "LW",
    "club": "코번트리 스카이"
  },
  "cov-25": {
    "name": "하지 라이토",
    "nation": "미국",
    "birthYear": 1998,
    "pos": "ST",
    "club": "코번트리 스카이"
  },
  "cov-26": {
    "name": "타이워 아워니오",
    "nation": "나이지리아",
    "birthYear": 1997,
    "pos": "ST",
    "club": "코번트리 스카이"
  },
  "cov-27": {
    "name": "룸 차우노",
    "nation": "프랑스",
    "birthYear": 2003,
    "pos": "RW",
    "club": "코번트리 스카이"
  },
  "cov-28": {
    "name": "브랜던 토머스아산토",
    "nation": "가나",
    "birthYear": 1998,
    "pos": "ST",
    "club": "코번트리 스카이"
  },
  "cov-29": {
    "name": "시디키 셰리포",
    "nation": "기니",
    "birthYear": 2006,
    "pos": "ST",
    "club": "코번트리 스카이"
  },
  "cry-01": {
    "name": "딘 헨더손",
    "nation": "잉글랜드",
    "birthYear": 1997,
    "pos": "GK",
    "club": "크리스탈 이글"
  },
  "cry-02": {
    "name": "레미 매슈손",
    "nation": "잉글랜드",
    "birthYear": 1994,
    "pos": "GK",
    "club": "크리스탈 이글"
  },
  "cry-03": {
    "name": "발테르 베니테소",
    "nation": "아르헨티나",
    "birthYear": 1993,
    "pos": "GK",
    "club": "크리스탈 이글"
  },
  "cry-04": {
    "name": "타이릭 미첼런",
    "nation": "잉글랜드",
    "birthYear": 1999,
    "pos": "LB",
    "club": "크리스탈 이글"
  },
  "cry-05": {
    "name": "샤디 리아도",
    "nation": "모로코",
    "birthYear": 2003,
    "pos": "CB",
    "club": "크리스탈 이글"
  },
  "cry-06": {
    "name": "악셀 디사소",
    "nation": "프랑스",
    "birthYear": 1998,
    "pos": "CB",
    "club": "크리스탈 이글"
  },
  "cry-07": {
    "name": "제이디 캉보트",
    "nation": "프랑스",
    "birthYear": 2006,
    "pos": "CB",
    "club": "크리스탈 이글"
  },
  "cry-08": {
    "name": "도미야스 다케히루",
    "nation": "일본",
    "birthYear": 1998,
    "pos": "RB",
    "club": "크리스탈 이글"
  },
  "cry-09": {
    "name": "어니스트 아하노",
    "nation": "이탈리아",
    "birthYear": 2008,
    "pos": "LB",
    "club": "크리스탈 이글"
  },
  "cry-10": {
    "name": "아난 칼라일로",
    "nation": "이스라엘",
    "birthYear": 2004,
    "pos": "RB",
    "club": "크리스탈 이글"
  },
  "cry-11": {
    "name": "크리스 리처드",
    "nation": "미국",
    "birthYear": 2000,
    "pos": "CB",
    "club": "크리스탈 이글"
  },
  "cry-12": {
    "name": "오스카르 밍게소",
    "nation": "스페인",
    "birthYear": 1999,
    "pos": "RB",
    "club": "크리스탈 이글"
  },
  "cry-13": {
    "name": "벤 칠웰런",
    "nation": "잉글랜드",
    "birthYear": 1996,
    "pos": "LB",
    "club": "크리스탈 이글"
  },
  "cry-14": {
    "name": "헤페르손 레르모",
    "nation": "콜롬비아",
    "birthYear": 1994,
    "pos": "CDM",
    "club": "크리스탈 이글"
  },
  "cry-15": {
    "name": "가마다 다이지",
    "nation": "일본",
    "birthYear": 1996,
    "pos": "CAM",
    "club": "크리스탈 이글"
  },
  "cry-16": {
    "name": "윌 휴스",
    "nation": "잉글랜드",
    "birthYear": 1995,
    "pos": "CM",
    "club": "크리스탈 이글"
  },
  "cry-17": {
    "name": "애덤 워톤",
    "nation": "잉글랜드",
    "birthYear": 2004,
    "pos": "CM",
    "club": "크리스탈 이글"
  },
  "cry-18": {
    "name": "퀸턴 팀베르",
    "nation": "네덜란드",
    "birthYear": 2001,
    "pos": "CM",
    "club": "크리스탈 이글"
  },
  "cry-19": {
    "name": "셰이크 두쿠로",
    "nation": "말리",
    "birthYear": 2000,
    "pos": "CDM",
    "club": "크리스탈 이글"
  },
  "cry-20": {
    "name": "이스마일라 사로",
    "nation": "세네갈",
    "birthYear": 1998,
    "pos": "RW",
    "club": "크리스탈 이글"
  },
  "cry-21": {
    "name": "에디 은케티오",
    "nation": "잉글랜드",
    "birthYear": 1999,
    "pos": "ST",
    "club": "크리스탈 이글"
  },
  "cry-22": {
    "name": "예레미 피나",
    "nation": "스페인",
    "birthYear": 2002,
    "pos": "RW",
    "club": "크리스탈 이글"
  },
  "cry-23": {
    "name": "드와이트 맥닐런",
    "nation": "잉글랜드",
    "birthYear": 1999,
    "pos": "LW",
    "club": "크리스탈 이글"
  },
  "cry-24": {
    "name": "자비에르 고즈",
    "nation": "미국",
    "birthYear": 2007,
    "pos": "RW",
    "club": "크리스탈 이글"
  },
  "cry-25": {
    "name": "장필리프 마테토",
    "nation": "프랑스",
    "birthYear": 1997,
    "pos": "ST",
    "club": "크리스탈 이글"
  },
  "cry-26": {
    "name": "예르겐 스트란 라르손",
    "nation": "노르웨이",
    "birthYear": 2000,
    "pos": "ST",
    "club": "크리스탈 이글"
  },
  "cry-27": {
    "name": "다리오 오소리아",
    "nation": "칠레",
    "birthYear": 2004,
    "pos": "LW",
    "club": "크리스탈 이글"
  },
  "cry-28": {
    "name": "에반 게상드",
    "nation": "코트디부아르",
    "birthYear": 2001,
    "pos": "ST",
    "club": "크리스탈 이글"
  },
  "eve-01": {
    "name": "조던 픽포르",
    "nation": "잉글랜드",
    "birthYear": 1994,
    "pos": "GK",
    "club": "에버턴 토피"
  },
  "eve-02": {
    "name": "마크 트래버손",
    "nation": "아일랜드",
    "birthYear": 1999,
    "pos": "GK",
    "club": "에버턴 토피"
  },
  "eve-03": {
    "name": "톰 킹스",
    "nation": "웨일스",
    "birthYear": 1995,
    "pos": "GK",
    "club": "에버턴 토피"
  },
  "eve-04": {
    "name": "에인슬리 메이틀랜드나일손",
    "nation": "잉글랜드",
    "birthYear": 1997,
    "pos": "RB",
    "club": "에버턴 토피"
  },
  "eve-05": {
    "name": "재러드 브랜스웨이터",
    "nation": "잉글랜드",
    "birthYear": 2002,
    "pos": "CB",
    "club": "에버턴 토피"
  },
  "eve-06": {
    "name": "마이클 킨스",
    "nation": "잉글랜드",
    "birthYear": 1993,
    "pos": "CB",
    "club": "에버턴 토피"
  },
  "eve-07": {
    "name": "제임스 타코스코",
    "nation": "잉글랜드",
    "birthYear": 1992,
    "pos": "CB",
    "club": "에버턴 토피"
  },
  "eve-08": {
    "name": "제이크 오브라이엔",
    "nation": "아일랜드",
    "birthYear": 2001,
    "pos": "CB",
    "club": "에버턴 토피"
  },
  "eve-09": {
    "name": "비탈리 미콜렌카",
    "nation": "우크라이나",
    "birthYear": 1999,
    "pos": "LB",
    "club": "에버턴 토피"
  },
  "eve-10": {
    "name": "키어넌 듀스버리홀런",
    "nation": "잉글랜드",
    "birthYear": 1998,
    "pos": "CM",
    "club": "에버턴 토피"
  },
  "eve-11": {
    "name": "크리스티안 뇌르고어",
    "nation": "덴마크",
    "birthYear": 1994,
    "pos": "CDM",
    "club": "에버턴 토피"
  },
  "eve-12": {
    "name": "찰리 알카라소",
    "nation": "아르헨티나",
    "birthYear": 2002,
    "pos": "CAM",
    "club": "에버턴 토피"
  },
  "eve-13": {
    "name": "헤이든 해크노",
    "nation": "잉글랜드",
    "birthYear": 2002,
    "pos": "CM",
    "club": "에버턴 토피"
  },
  "eve-14": {
    "name": "메를린 뢸러",
    "nation": "독일",
    "birthYear": 2002,
    "pos": "CM",
    "club": "에버턴 토피"
  },
  "eve-15": {
    "name": "제임스 가너스",
    "nation": "잉글랜드",
    "birthYear": 2001,
    "pos": "CM",
    "club": "에버턴 토피"
  },
  "eve-16": {
    "name": "해리슨 암스트론",
    "nation": "잉글랜드",
    "birthYear": 2007,
    "pos": "CM",
    "club": "에버턴 토피"
  },
  "eve-17": {
    "name": "잭 그릴리소",
    "nation": "잉글랜드",
    "birthYear": 1995,
    "pos": "LW",
    "club": "에버턴 토피"
  },
  "eve-18": {
    "name": "티에르노 바로",
    "nation": "프랑스",
    "birthYear": 2002,
    "pos": "ST",
    "club": "에버턴 토피"
  },
  "eve-19": {
    "name": "타이리크 조지오",
    "nation": "잉글랜드",
    "birthYear": 2006,
    "pos": "LW",
    "club": "에버턴 토피"
  },
  "eve-20": {
    "name": "타일러 디블린",
    "nation": "잉글랜드",
    "birthYear": 2006,
    "pos": "RW",
    "club": "에버턴 토피"
  },
  "eve-21": {
    "name": "브레넌 존손",
    "nation": "웨일스",
    "birthYear": 2001,
    "pos": "RW",
    "club": "에버턴 토피"
  },
  "ful-01": {
    "name": "베른트 레노어",
    "nation": "독일",
    "birthYear": 1992,
    "pos": "GK",
    "club": "풀럼 코티지"
  },
  "ful-02": {
    "name": "뱅자맹 르콩테",
    "nation": "프랑스",
    "birthYear": 1991,
    "pos": "GK",
    "club": "풀럼 코티지"
  },
  "ful-03": {
    "name": "알렉스 보르투",
    "nation": "미국",
    "birthYear": 2004,
    "pos": "GK",
    "club": "풀럼 코티지"
  },
  "ful-04": {
    "name": "케니 테토",
    "nation": "네덜란드",
    "birthYear": 1995,
    "pos": "RB",
    "club": "풀럼 코티지"
  },
  "ful-05": {
    "name": "캘빈 배소",
    "nation": "나이지리아",
    "birthYear": 1999,
    "pos": "CB",
    "club": "풀럼 코티지"
  },
  "ful-06": {
    "name": "호르헤 쿠엥코",
    "nation": "스페인",
    "birthYear": 1999,
    "pos": "CB",
    "club": "풀럼 코티지"
  },
  "ful-07": {
    "name": "요아킴 아네르손",
    "nation": "덴마크",
    "birthYear": 1996,
    "pos": "CB",
    "club": "풀럼 코티지"
  },
  "ful-08": {
    "name": "티모시 카스타뇨",
    "nation": "벨기에",
    "birthYear": 1995,
    "pos": "RB",
    "club": "풀럼 코티지"
  },
  "ful-09": {
    "name": "다비트 아펜그루베르",
    "nation": "오스트리아",
    "birthYear": 2001,
    "pos": "CB",
    "club": "풀럼 코티지"
  },
  "ful-10": {
    "name": "앤토니 로빈손",
    "nation": "미국",
    "birthYear": 1997,
    "pos": "LB",
    "club": "풀럼 코티지"
  },
  "ful-11": {
    "name": "뤽 드 푸제로",
    "nation": "캐나다",
    "birthYear": 2005,
    "pos": "CB",
    "club": "풀럼 코티지"
  },
  "ful-12": {
    "name": "해리슨 리드슨",
    "nation": "잉글랜드",
    "birthYear": 1995,
    "pos": "CM",
    "club": "풀럼 코티지"
  },
  "ful-13": {
    "name": "세사르 팔라시오",
    "nation": "스페인",
    "birthYear": 2005,
    "pos": "CM",
    "club": "풀럼 코티지"
  },
  "ful-14": {
    "name": "톰 케어노",
    "nation": "스코틀랜드",
    "birthYear": 1991,
    "pos": "CM",
    "club": "풀럼 코티지"
  },
  "ful-15": {
    "name": "휴고 라르센",
    "nation": "스웨덴",
    "birthYear": 2004,
    "pos": "CM",
    "club": "풀럼 코티지"
  },
  "ful-16": {
    "name": "산데르 베르고",
    "nation": "노르웨이",
    "birthYear": 1998,
    "pos": "CDM",
    "club": "풀럼 코티지"
  },
  "ful-17": {
    "name": "알렉스 이워보",
    "nation": "나이지리아",
    "birthYear": 1996,
    "pos": "CAM",
    "club": "풀럼 코티지"
  },
  "ful-18": {
    "name": "셰이 찰손",
    "nation": "북아일랜드",
    "birthYear": 2003,
    "pos": "CDM",
    "club": "풀럼 코티지"
  },
  "ful-19": {
    "name": "마누엘 앙헬로",
    "nation": "스페인",
    "birthYear": 2005,
    "pos": "CM",
    "club": "풀럼 코티지"
  },
  "ful-20": {
    "name": "조시 킹거",
    "nation": "잉글랜드",
    "birthYear": 2007,
    "pos": "CM",
    "club": "풀럼 코티지"
  },
  "ful-21": {
    "name": "라이언 세세뇨",
    "nation": "잉글랜드",
    "birthYear": 2000,
    "pos": "LM",
    "club": "풀럼 코티지"
  },
  "ful-22": {
    "name": "에밀 스미스 로웨",
    "nation": "잉글랜드",
    "birthYear": 2000,
    "pos": "CAM",
    "club": "풀럼 코티지"
  },
  "ful-23": {
    "name": "곤살로 가르시오",
    "nation": "스페인",
    "birthYear": 2006,
    "pos": "ST",
    "club": "풀럼 코티지"
  },
  "ful-24": {
    "name": "로드리구 무니소",
    "nation": "브라질",
    "birthYear": 2001,
    "pos": "ST",
    "club": "풀럼 코티지"
  },
  "ful-25": {
    "name": "케비노",
    "nation": "브라질",
    "birthYear": 2003,
    "pos": "LW",
    "club": "풀럼 코티지"
  },
  "ful-26": {
    "name": "오스카르 보브",
    "nation": "노르웨이",
    "birthYear": 2003,
    "pos": "RW",
    "club": "풀럼 코티지"
  },
  "ful-27": {
    "name": "요나 쿠시아사로",
    "nation": "스웨덴",
    "birthYear": 2007,
    "pos": "ST",
    "club": "풀럼 코티지"
  },
  "hul-01": {
    "name": "잭 버틀런더",
    "nation": "잉글랜드",
    "birthYear": 1993,
    "pos": "GK",
    "club": "헐 타이거"
  },
  "hul-02": {
    "name": "루이 코일라",
    "nation": "잉글랜드",
    "birthYear": 1995,
    "pos": "RB",
    "club": "헐 타이거"
  },
  "hul-03": {
    "name": "라이언 자일러",
    "nation": "잉글랜드",
    "birthYear": 2000,
    "pos": "LB",
    "club": "헐 타이거"
  },
  "hul-04": {
    "name": "찰리 휴선",
    "nation": "잉글랜드",
    "birthYear": 2003,
    "pos": "CB",
    "club": "헐 타이거"
  },
  "hul-05": {
    "name": "모리타 히데마산",
    "nation": "일본",
    "birthYear": 1995,
    "pos": "CDM",
    "club": "헐 타이거"
  },
  "hul-06": {
    "name": "세미 아자인",
    "nation": "나이지리아",
    "birthYear": 1993,
    "pos": "CB",
    "club": "헐 타이거"
  },
  "hul-07": {
    "name": "소르바 토머슨",
    "nation": "웨일스",
    "birthYear": 1999,
    "pos": "RW",
    "club": "헐 타이거"
  },
  "hul-08": {
    "name": "엘리오 마타존",
    "nation": "벨기에",
    "birthYear": 2002,
    "pos": "CM",
    "club": "헐 타이거"
  },
  "hul-09": {
    "name": "올리 맥버닌",
    "nation": "스코틀랜드",
    "birthYear": 1996,
    "pos": "ST",
    "club": "헐 타이거"
  },
  "hul-10": {
    "name": "모하메드 벨루민",
    "nation": "알제리",
    "birthYear": 2002,
    "pos": "LW",
    "club": "헐 타이거"
  },
  "hul-11": {
    "name": "조 겔하트르",
    "nation": "잉글랜드",
    "birthYear": 2002,
    "pos": "CAM",
    "club": "헐 타이거"
  },
  "hul-12": {
    "name": "딜런 필립손",
    "nation": "잉글랜드",
    "birthYear": 1995,
    "pos": "GK",
    "club": "헐 타이거"
  },
  "hul-13": {
    "name": "옌스 예르퇴달라",
    "nation": "노르웨이",
    "birthYear": 2005,
    "pos": "CM",
    "club": "헐 타이거"
  },
  "hul-14": {
    "name": "존 이거른",
    "nation": "아일랜드",
    "birthYear": 1992,
    "pos": "CB",
    "club": "헐 타이거"
  },
  "hul-15": {
    "name": "패디 맥네언",
    "nation": "북아일랜드",
    "birthYear": 1995,
    "pos": "CB",
    "club": "헐 타이거"
  },
  "hul-16": {
    "name": "콘스탄티노스 촐라키손",
    "nation": "그리스",
    "birthYear": 2002,
    "pos": "GK",
    "club": "헐 타이거"
  },
  "hul-17": {
    "name": "오스카르 삼브라논",
    "nation": "에콰도르",
    "birthYear": 2004,
    "pos": "CDM",
    "club": "헐 타이거"
  },
  "hul-18": {
    "name": "엘리엇 스트라우든",
    "nation": "스웨덴",
    "birthYear": 2002,
    "pos": "LW",
    "club": "헐 타이거"
  },
  "hul-19": {
    "name": "맷 타기트",
    "nation": "잉글랜드",
    "birthYear": 1995,
    "pos": "LB",
    "club": "헐 타이거"
  },
  "hul-20": {
    "name": "다르코 갸빈",
    "nation": "잉글랜드",
    "birthYear": 2004,
    "pos": "CM",
    "club": "헐 타이거"
  },
  "hul-21": {
    "name": "맷 크룩손",
    "nation": "잉글랜드",
    "birthYear": 1994,
    "pos": "CM",
    "club": "헐 타이거"
  },
  "hul-22": {
    "name": "키어런 다웰라",
    "nation": "잉글랜드",
    "birthYear": 1997,
    "pos": "CAM",
    "club": "헐 타이거"
  },
  "hul-23": {
    "name": "리건 슬레이터스",
    "nation": "잉글랜드",
    "birthYear": 1999,
    "pos": "CDM",
    "club": "헐 타이거"
  },
  "hul-24": {
    "name": "루카스 구르나두아트르",
    "nation": "프랑스",
    "birthYear": 2003,
    "pos": "CDM",
    "club": "헐 타이거"
  },
  "hul-25": {
    "name": "데이비드 아킨톨란",
    "nation": "나이지리아",
    "birthYear": 1996,
    "pos": "ST",
    "club": "헐 타이거"
  },
  "hul-26": {
    "name": "노벨 멘딘",
    "nation": "세네갈",
    "birthYear": 2004,
    "pos": "CB",
    "club": "헐 타이거"
  },
  "hul-27": {
    "name": "압뒬카디르 외뮈른",
    "nation": "튀르키예",
    "birthYear": 1999,
    "pos": "RM",
    "club": "헐 타이거"
  },
  "hul-28": {
    "name": "팀 이로그분아르",
    "nation": "잉글랜드",
    "birthYear": 2003,
    "pos": "CM",
    "club": "헐 타이거"
  },
  "hul-29": {
    "name": "모하메드알리 쇼른",
    "nation": "프랑스",
    "birthYear": 2004,
    "pos": "LW",
    "club": "헐 타이거"
  },
  "ips-01": {
    "name": "알렉스 파머스",
    "nation": "잉글랜드",
    "birthYear": 1996,
    "pos": "GK",
    "club": "입스위치 트랙터"
  },
  "ips-02": {
    "name": "다넬 펄롱크",
    "nation": "잉글랜드",
    "birthYear": 1995,
    "pos": "RB",
    "club": "입스위치 트랙터"
  },
  "ips-03": {
    "name": "레이프 데이비손",
    "nation": "잉글랜드",
    "birthYear": 1999,
    "pos": "LB",
    "club": "입스위치 트랙터"
  },
  "ips-04": {
    "name": "세드리크 키프렌",
    "nation": "코트디부아르",
    "birthYear": 1996,
    "pos": "CB",
    "club": "입스위치 트랙터"
  },
  "ips-05": {
    "name": "아조르 마투시완",
    "nation": "네덜란드",
    "birthYear": 1998,
    "pos": "CDM",
    "club": "입스위치 트랙터"
  },
  "ips-06": {
    "name": "이사 디오픈",
    "nation": "모로코",
    "birthYear": 1997,
    "pos": "CB",
    "club": "입스위치 트랙터"
  },
  "ips-07": {
    "name": "압둘 파타운",
    "nation": "가나",
    "birthYear": 2004,
    "pos": "RW",
    "club": "입스위치 트랙터"
  },
  "ips-08": {
    "name": "신드레 발레 에겔린",
    "nation": "노르웨이",
    "birthYear": 2006,
    "pos": "LW",
    "club": "입스위치 트랙터"
  },
  "ips-09": {
    "name": "지안 플레밍크",
    "nation": "네덜란드",
    "birthYear": 1998,
    "pos": "ST",
    "club": "입스위치 트랙터"
  },
  "ips-10": {
    "name": "훌리오 엔시손",
    "nation": "파라과이",
    "birthYear": 2004,
    "pos": "CAM",
    "club": "입스위치 트랙터"
  },
  "ips-11": {
    "name": "제이든 필로지느",
    "nation": "잉글랜드",
    "birthYear": 2002,
    "pos": "LW",
    "club": "입스위치 트랙터"
  },
  "ips-12": {
    "name": "플로렌티누 루이손",
    "nation": "포르투갈",
    "birthYear": 1999,
    "pos": "CDM",
    "club": "입스위치 트랙터"
  },
  "ips-13": {
    "name": "잭 테일러스",
    "nation": "아일랜드",
    "birthYear": 1998,
    "pos": "CM",
    "club": "입스위치 트랙터"
  },
  "ips-14": {
    "name": "에메르손드",
    "nation": "브라질",
    "birthYear": 2004,
    "pos": "ST",
    "club": "입스위치 트랙터"
  },
  "ips-15": {
    "name": "케이시 맥아티언",
    "nation": "아일랜드",
    "birthYear": 2001,
    "pos": "RW",
    "club": "입스위치 트랙터"
  },
  "ips-16": {
    "name": "사샤 루키츠",
    "nation": "세르비아",
    "birthYear": 1996,
    "pos": "CDM",
    "club": "입스위치 트랙터"
  },
  "ips-17": {
    "name": "제이컵 그리브손",
    "nation": "잉글랜드",
    "birthYear": 2000,
    "pos": "CB",
    "club": "입스위치 트랙터"
  },
  "ips-18": {
    "name": "에세키엘 팔라시오손",
    "nation": "아르헨티나",
    "birthYear": 1998,
    "pos": "CM",
    "club": "입스위치 트랙터"
  },
  "ips-19": {
    "name": "다라 오셰인",
    "nation": "아일랜드",
    "birthYear": 1999,
    "pos": "CB",
    "club": "입스위치 트랙터"
  },
  "ips-20": {
    "name": "데이비드 버트나",
    "nation": "잉글랜드",
    "birthYear": 1989,
    "pos": "GK",
    "club": "입스위치 트랙터"
  },
  "ips-21": {
    "name": "크리스천 월터느",
    "nation": "잉글랜드",
    "birthYear": 1995,
    "pos": "GK",
    "club": "입스위치 트랙터"
  },
  "ips-22": {
    "name": "추바 아크포므",
    "nation": "잉글랜드",
    "birthYear": 1995,
    "pos": "ST",
    "club": "입스위치 트랙터"
  },
  "ips-23": {
    "name": "마르셀리노 누녜노",
    "nation": "칠레",
    "birthYear": 2000,
    "pos": "CM",
    "club": "입스위치 트랙터"
  },
  "ips-24": {
    "name": "아니스 메메틴",
    "nation": "알바니아",
    "birthYear": 2001,
    "pos": "LW",
    "club": "입스위치 트랙터"
  },
  "ips-25": {
    "name": "켈 스헤르페느",
    "nation": "네덜란드",
    "birthYear": 2000,
    "pos": "GK",
    "club": "입스위치 트랙터"
  },
  "ips-26": {
    "name": "마에다 다이제느",
    "nation": "일본",
    "birthYear": 1997,
    "pos": "LW",
    "club": "입스위치 트랙터"
  },
  "ips-27": {
    "name": "압둘 우아타란",
    "nation": "코트디부아르",
    "birthYear": 2005,
    "pos": "RB",
    "club": "입스위치 트랙터"
  },
  "ips-28": {
    "name": "잭 클라크르",
    "nation": "잉글랜드",
    "birthYear": 2000,
    "pos": "LW",
    "club": "입스위치 트랙터"
  },
  "lee-01": {
    "name": "제임스 트래퍼든",
    "nation": "잉글랜드",
    "birthYear": 2002,
    "pos": "GK",
    "club": "리즈 화이트"
  },
  "lee-02": {
    "name": "제이든 보글라",
    "nation": "잉글랜드",
    "birthYear": 2000,
    "pos": "RB",
    "club": "리즈 화이트"
  },
  "lee-03": {
    "name": "가브리엘 구드문드슨드",
    "nation": "스웨덴",
    "birthYear": 1999,
    "pos": "LB",
    "club": "리즈 화이트"
  },
  "lee-04": {
    "name": "이선 암파둔",
    "nation": "웨일스",
    "birthYear": 2000,
    "pos": "CDM",
    "club": "리즈 화이트"
  },
  "lee-05": {
    "name": "타리크 무하레모비츠",
    "nation": "보스니아헤르체고비나",
    "birthYear": 2003,
    "pos": "CB",
    "club": "리즈 화이트"
  },
  "lee-06": {
    "name": "조 로더른",
    "nation": "웨일스",
    "birthYear": 1997,
    "pos": "CB",
    "club": "리즈 화이트"
  },
  "lee-07": {
    "name": "대니얼 제임슨",
    "nation": "웨일스",
    "birthYear": 1997,
    "pos": "RW",
    "club": "리즈 화이트"
  },
  "lee-08": {
    "name": "션 롱스태프르",
    "nation": "잉글랜드",
    "birthYear": 1997,
    "pos": "CM",
    "club": "리즈 화이트"
  },
  "lee-09": {
    "name": "도미닉 캘버트르위르",
    "nation": "잉글랜드",
    "birthYear": 1997,
    "pos": "ST",
    "club": "리즈 화이트"
  },
  "lee-10": {
    "name": "해리 윌슨드",
    "nation": "웨일스",
    "birthYear": 1997,
    "pos": "CAM",
    "club": "리즈 화이트"
  },
  "lee-11": {
    "name": "브렌던 애런슨드",
    "nation": "미국",
    "birthYear": 2000,
    "pos": "CAM",
    "club": "리즈 화이트"
  },
  "lee-12": {
    "name": "루카스 은메찬",
    "nation": "독일",
    "birthYear": 1998,
    "pos": "ST",
    "club": "리즈 화이트"
  },
  "lee-13": {
    "name": "야카 비욜라",
    "nation": "슬로베니아",
    "birthYear": 1999,
    "pos": "CB",
    "club": "리즈 화이트"
  },
  "lee-14": {
    "name": "미하엘 체트런",
    "nation": "독일",
    "birthYear": 1995,
    "pos": "GK",
    "club": "리즈 화이트"
  },
  "lee-15": {
    "name": "안톤 슈타흐르",
    "nation": "독일",
    "birthYear": 1998,
    "pos": "CDM",
    "club": "리즈 화이트"
  },
  "lee-16": {
    "name": "노아 오카포른",
    "nation": "스위스",
    "birthYear": 2000,
    "pos": "LW",
    "club": "리즈 화이트"
  },
  "lee-17": {
    "name": "알렉스 케언손",
    "nation": "잉글랜드",
    "birthYear": 1993,
    "pos": "GK",
    "club": "리즈 화이트"
  },
  "lee-18": {
    "name": "다나카 아온",
    "nation": "일본",
    "birthYear": 1998,
    "pos": "CM",
    "club": "리즈 화이트"
  },
  "lee-19": {
    "name": "장마테오 바오얀",
    "nation": "프랑스",
    "birthYear": 2005,
    "pos": "LW",
    "club": "리즈 화이트"
  },
  "lee-20": {
    "name": "제임스 저스티노",
    "nation": "잉글랜드",
    "birthYear": 1998,
    "pos": "RB",
    "club": "리즈 화이트"
  },
  "lee-21": {
    "name": "멜뱅 바르드",
    "nation": "프랑스",
    "birthYear": 2000,
    "pos": "LB",
    "club": "리즈 화이트"
  },
  "lee-22": {
    "name": "니코 엘베딘",
    "nation": "스위스",
    "birthYear": 1996,
    "pos": "CB",
    "club": "리즈 화이트"
  },
  "lee-23": {
    "name": "일리야 그루에브스",
    "nation": "불가리아",
    "birthYear": 2000,
    "pos": "CM",
    "club": "리즈 화이트"
  },
  "liv-01": {
    "name": "알리송 베케른",
    "nation": "브라질",
    "birthYear": 1992,
    "pos": "GK",
    "club": "리버 머지"
  },
  "liv-02": {
    "name": "조 고메손",
    "nation": "잉글랜드",
    "birthYear": 1997,
    "pos": "CB",
    "club": "리버 머지"
  },
  "liv-03": {
    "name": "엔도 와타룬",
    "nation": "일본",
    "birthYear": 1993,
    "pos": "CDM",
    "club": "리버 머지"
  },
  "liv-04": {
    "name": "버질 판다이큰",
    "nation": "네덜란드",
    "birthYear": 1991,
    "pos": "CB",
    "club": "리버 머지"
  },
  "liv-05": {
    "name": "제레미 자켄",
    "nation": "프랑스",
    "birthYear": 2005,
    "pos": "CB",
    "club": "리버 머지"
  },
  "liv-06": {
    "name": "밀로시 케르케주",
    "nation": "헝가리",
    "birthYear": 2003,
    "pos": "LB",
    "club": "리버 머지"
  },
  "liv-07": {
    "name": "플로리안 비르추",
    "nation": "독일",
    "birthYear": 2003,
    "pos": "CAM",
    "club": "리버 머지"
  },
  "liv-08": {
    "name": "도미니크 소보슬러인",
    "nation": "헝가리",
    "birthYear": 2000,
    "pos": "CM",
    "club": "리버 머지"
  },
  "liv-09": {
    "name": "알렉산데르 이사큰",
    "nation": "스웨덴",
    "birthYear": 1999,
    "pos": "ST",
    "club": "리버 머지"
  },
  "liv-10": {
    "name": "알렉시스 맥알리스턴",
    "nation": "아르헨티나",
    "birthYear": 1998,
    "pos": "CM",
    "club": "리버 머지"
  },
  "liv-11": {
    "name": "코너 브래들린",
    "nation": "북아일랜드",
    "birthYear": 2003,
    "pos": "RB",
    "club": "리버 머지"
  },
  "liv-12": {
    "name": "페데리코 키에산",
    "nation": "이탈리아",
    "birthYear": 1997,
    "pos": "RW",
    "club": "리버 머지"
  },
  "liv-13": {
    "name": "조반니 레오닌",
    "nation": "이탈리아",
    "birthYear": 2006,
    "pos": "CB",
    "club": "리버 머지"
  },
  "liv-14": {
    "name": "코디 학폰",
    "nation": "네덜란드",
    "birthYear": 1999,
    "pos": "LW",
    "club": "리버 머지"
  },
  "liv-15": {
    "name": "코스타스 치미카손",
    "nation": "그리스",
    "birthYear": 1996,
    "pos": "LB",
    "club": "리버 머지"
  },
  "liv-16": {
    "name": "위고 에키티켄",
    "nation": "프랑스",
    "birthYear": 2002,
    "pos": "ST",
    "club": "리버 머지"
  },
  "liv-17": {
    "name": "빅토르 무뇨손",
    "nation": "스페인",
    "birthYear": 2003,
    "pos": "RW",
    "club": "리버 머지"
  },
  "liv-18": {
    "name": "기오르기 마마르다시빌린",
    "nation": "조지아",
    "birthYear": 2000,
    "pos": "GK",
    "club": "리버 머지"
  },
  "liv-19": {
    "name": "프레디 우드먼드",
    "nation": "잉글랜드",
    "birthYear": 1997,
    "pos": "GK",
    "club": "리버 머지"
  },
  "liv-20": {
    "name": "브래들리 바르콜란",
    "nation": "프랑스",
    "birthYear": 2002,
    "pos": "LW",
    "club": "리버 머지"
  },
  "liv-21": {
    "name": "제레미 프림퐁그",
    "nation": "네덜란드",
    "birthYear": 2000,
    "pos": "RB",
    "club": "리버 머지"
  },
  "liv-22": {
    "name": "로날드 아라우혼",
    "nation": "우루과이",
    "birthYear": 1999,
    "pos": "CB",
    "club": "리버 머지"
  },
  "liv-23": {
    "name": "라이언 흐라번베르흐트",
    "nation": "네덜란드",
    "birthYear": 2002,
    "pos": "CM",
    "club": "리버 머지"
  },
  "liv-24": {
    "name": "트레이 뇨닌",
    "nation": "잉글랜드",
    "birthYear": 2007,
    "pos": "CM",
    "club": "리버 머지"
  },
  "liv-25": {
    "name": "제임스 매코널라",
    "nation": "잉글랜드",
    "birthYear": 2004,
    "pos": "CM",
    "club": "리버 머지"
  },
  "liv-26": {
    "name": "비테즐라프 야로신",
    "nation": "체코",
    "birthYear": 2001,
    "pos": "GK",
    "club": "리버 머지"
  },
  "liv-27": {
    "name": "리오 응구모한",
    "nation": "잉글랜드",
    "birthYear": 2008,
    "pos": "LW",
    "club": "리버 머지"
  },
  "mci-01": {
    "name": "잔루이지 돈나룸만",
    "nation": "이탈리아",
    "birthYear": 1999,
    "pos": "GK",
    "club": "맨체스 블루"
  },
  "mci-02": {
    "name": "후벵 디아손",
    "nation": "포르투갈",
    "birthYear": 1997,
    "pos": "CB",
    "club": "맨체스 블루"
  },
  "mci-03": {
    "name": "엘리엇 앤더슨드",
    "nation": "잉글랜드",
    "birthYear": 2002,
    "pos": "CM",
    "club": "맨체스 블루"
  },
  "mci-04": {
    "name": "마크 게힌",
    "nation": "잉글랜드",
    "birthYear": 2000,
    "pos": "CB",
    "club": "맨체스 블루"
  },
  "mci-05": {
    "name": "일리만 은디아옌",
    "nation": "세네갈",
    "birthYear": 2000,
    "pos": "LW",
    "club": "맨체스 블루"
  },
  "mci-06": {
    "name": "마테오 코바치츠",
    "nation": "크로아티아",
    "birthYear": 1994,
    "pos": "CM",
    "club": "맨체스 블루"
  },
  "mci-07": {
    "name": "엘링 홀란드",
    "nation": "노르웨이",
    "birthYear": 2000,
    "pos": "ST",
    "club": "맨체스 블루"
  },
  "mci-08": {
    "name": "라얀 셰르킨",
    "nation": "프랑스",
    "birthYear": 2003,
    "pos": "CAM",
    "club": "맨체스 블루"
  },
  "mci-09": {
    "name": "제레미 도쿤",
    "nation": "벨기에",
    "birthYear": 2002,
    "pos": "LW",
    "club": "맨체스 블루"
  },
  "mci-10": {
    "name": "마커스 베티넬린",
    "nation": "잉글랜드",
    "birthYear": 1992,
    "pos": "GK",
    "club": "맨체스 블루"
  },
  "mci-11": {
    "name": "엔소 페르난데손",
    "nation": "아르헨티나",
    "birthYear": 2001,
    "pos": "CM",
    "club": "맨체스 블루"
  },
  "mci-12": {
    "name": "라얀 아이트누린",
    "nation": "알제리",
    "birthYear": 2001,
    "pos": "LB",
    "club": "맨체스 블루"
  },
  "mci-13": {
    "name": "비토르 헤이손",
    "nation": "브라질",
    "birthYear": 2006,
    "pos": "CB",
    "club": "맨체스 블루"
  },
  "mci-14": {
    "name": "요슈코 그바르디올라",
    "nation": "크로아티아",
    "birthYear": 2002,
    "pos": "CB",
    "club": "맨체스 블루"
  },
  "mci-15": {
    "name": "마테우스 누네손",
    "nation": "포르투갈",
    "birthYear": 1998,
    "pos": "RB",
    "club": "맨체스 블루"
  },
  "mci-16": {
    "name": "헤로니모 룰린",
    "nation": "아르헨티나",
    "birthYear": 1992,
    "pos": "GK",
    "club": "맨체스 블루"
  },
  "mci-17": {
    "name": "아유브 부아딘",
    "nation": "모로코",
    "birthYear": 2007,
    "pos": "CDM",
    "club": "맨체스 블루"
  },
  "mci-18": {
    "name": "니코 오라일린",
    "nation": "잉글랜드",
    "birthYear": 2005,
    "pos": "CM",
    "club": "맨체스 블루"
  },
  "mci-19": {
    "name": "알란드",
    "nation": "브라질",
    "birthYear": 2004,
    "pos": "LW",
    "club": "맨체스 블루"
  },
  "mci-20": {
    "name": "앙투안 세메뇬",
    "nation": "가나",
    "birthYear": 2000,
    "pos": "RW",
    "club": "맨체스 블루"
  },
  "mci-21": {
    "name": "압두코디르 후사노브스",
    "nation": "우즈베키스탄",
    "birthYear": 2004,
    "pos": "CB",
    "club": "맨체스 블루"
  },
  "mci-22": {
    "name": "필 포드느",
    "nation": "잉글랜드",
    "birthYear": 2000,
    "pos": "CAM",
    "club": "맨체스 블루"
  },
  "mci-23": {
    "name": "조시 윌슨에스브랜든",
    "nation": "잉글랜드",
    "birthYear": 2002,
    "pos": "LB",
    "club": "맨체스 블루"
  },
  "mci-24": {
    "name": "리코 루이손",
    "nation": "잉글랜드",
    "birthYear": 2004,
    "pos": "RB",
    "club": "맨체스 블루"
  },
  "new-01": {
    "name": "닉 포픈",
    "nation": "잉글랜드",
    "birthYear": 1992,
    "pos": "GK",
    "club": "뉴캐슬 매파이"
  },
  "new-02": {
    "name": "티노 리브라멘톤",
    "nation": "잉글랜드",
    "birthYear": 2002,
    "pos": "RB",
    "club": "뉴캐슬 매파이"
  },
  "new-03": {
    "name": "루이스 홀라",
    "nation": "잉글랜드",
    "birthYear": 2004,
    "pos": "LB",
    "club": "뉴캐슬 매파이"
  },
  "new-04": {
    "name": "스벤 보트마르",
    "nation": "네덜란드",
    "birthYear": 2000,
    "pos": "CB",
    "club": "뉴캐슬 매파이"
  },
  "new-05": {
    "name": "파비안 셰언",
    "nation": "스위스",
    "birthYear": 1991,
    "pos": "CB",
    "club": "뉴캐슬 매파이"
  },
  "new-06": {
    "name": "니코 곤살레손",
    "nation": "스페인",
    "birthYear": 2002,
    "pos": "CM",
    "club": "뉴캐슬 매파이"
  },
  "new-07": {
    "name": "조엘린토느",
    "nation": "브라질",
    "birthYear": 1996,
    "pos": "CM",
    "club": "뉴캐슬 매파이"
  },
  "new-08": {
    "name": "알라지 밤반",
    "nation": "프랑스",
    "birthYear": 2006,
    "pos": "CM",
    "club": "뉴캐슬 매파이"
  },
  "new-09": {
    "name": "요안 위산",
    "nation": "콩고민주공화국",
    "birthYear": 1996,
    "pos": "ST",
    "club": "뉴캐슬 매파이"
  },
  "new-10": {
    "name": "윌리엄 오술란",
    "nation": "덴마크",
    "birthYear": 2003,
    "pos": "ST",
    "club": "뉴캐슬 매파이"
  },
  "new-11": {
    "name": "하비 반손",
    "nation": "잉글랜드",
    "birthYear": 1997,
    "pos": "LW",
    "club": "뉴캐슬 매파이"
  },
  "new-12": {
    "name": "말리크 티아운",
    "nation": "독일",
    "birthYear": 2001,
    "pos": "CB",
    "club": "뉴캐슬 매파이"
  },
  "new-13": {
    "name": "션 스퇴른",
    "nation": "네덜란드",
    "birthYear": 2008,
    "pos": "CM",
    "club": "뉴캐슬 매파이"
  },
  "new-14": {
    "name": "바주마나 투렌",
    "nation": "코트디부아르",
    "birthYear": 2006,
    "pos": "LW",
    "club": "뉴캐슬 매파이"
  },
  "new-15": {
    "name": "안토니 엘랑간",
    "nation": "스웨덴",
    "birthYear": 2002,
    "pos": "RW",
    "club": "뉴캐슬 매파이"
  },
  "new-16": {
    "name": "마티아스 페르난데스파르돈",
    "nation": "벨기에",
    "birthYear": 2005,
    "pos": "LW",
    "club": "뉴캐슬 매파이"
  },
  "new-17": {
    "name": "루카시 호르니체큰",
    "nation": "체코",
    "birthYear": 2002,
    "pos": "GK",
    "club": "뉴캐슬 매파이"
  },
  "new-18": {
    "name": "제이컵 머핀",
    "nation": "잉글랜드",
    "birthYear": 1995,
    "pos": "RW",
    "club": "뉴캐슬 매파이"
  },
  "new-19": {
    "name": "유언 자우에느",
    "nation": "프랑스",
    "birthYear": 2005,
    "pos": "GK",
    "club": "뉴캐슬 매파이"
  },
  "new-20": {
    "name": "조 윌로큰",
    "nation": "잉글랜드",
    "birthYear": 1999,
    "pos": "CM",
    "club": "뉴캐슬 매파이"
  },
  "new-21": {
    "name": "마크 길레스핀",
    "nation": "잉글랜드",
    "birthYear": 1992,
    "pos": "GK",
    "club": "뉴캐슬 매파이"
  },
  "new-22": {
    "name": "댄 버느",
    "nation": "잉글랜드",
    "birthYear": 1992,
    "pos": "CB",
    "club": "뉴캐슬 매파이"
  },
  "new-23": {
    "name": "아마르 데디츠",
    "nation": "보스니아헤르체고비나",
    "birthYear": 2002,
    "pos": "RB",
    "club": "뉴캐슬 매파이"
  },
  "new-24": {
    "name": "제이컵 램진",
    "nation": "잉글랜드",
    "birthYear": 2001,
    "pos": "CAM",
    "club": "뉴캐슬 매파이"
  },
  "new-25": {
    "name": "루이스 마일린",
    "nation": "잉글랜드",
    "birthYear": 2006,
    "pos": "CM",
    "club": "뉴캐슬 매파이"
  },
  "nfo-01": {
    "name": "우스만 디오망덴",
    "nation": "코트디부아르",
    "birthYear": 2003,
    "pos": "CB",
    "club": "노팅엄 포레스터"
  },
  "nfo-02": {
    "name": "네코 윌리엄손",
    "nation": "웨일스",
    "birthYear": 2001,
    "pos": "RB",
    "club": "노팅엄 포레스터"
  },
  "nfo-03": {
    "name": "무릴룬",
    "nation": "브라질",
    "birthYear": 2002,
    "pos": "CB",
    "club": "노팅엄 포레스터"
  },
  "nfo-04": {
    "name": "이브라힘 상가렌",
    "nation": "코트디부아르",
    "birthYear": 1997,
    "pos": "CDM",
    "club": "노팅엄 포레스터"
  },
  "nfo-05": {
    "name": "칼럼 허드슨오도인",
    "nation": "잉글랜드",
    "birthYear": 2000,
    "pos": "LW",
    "club": "노팅엄 포레스터"
  },
  "nfo-06": {
    "name": "니콜라스 도밍게노",
    "nation": "아르헨티나",
    "birthYear": 1998,
    "pos": "CM",
    "club": "노팅엄 포레스터"
  },
  "nfo-07": {
    "name": "크리스 우든",
    "nation": "뉴질랜드",
    "birthYear": 1991,
    "pos": "ST",
    "club": "노팅엄 포레스터"
  },
  "nfo-08": {
    "name": "모건 깁스화이튼",
    "nation": "잉글랜드",
    "birthYear": 2000,
    "pos": "CAM",
    "club": "노팅엄 포레스터"
  },
  "nfo-09": {
    "name": "이고르 제주손",
    "nation": "브라질",
    "birthYear": 2001,
    "pos": "ST",
    "club": "노팅엄 포레스터"
  },
  "nfo-10": {
    "name": "존 빅토른",
    "nation": "브라질",
    "birthYear": 1996,
    "pos": "GK",
    "club": "노팅엄 포레스터"
  },
  "nfo-11": {
    "name": "단 은도옌",
    "nation": "스위스",
    "birthYear": 2000,
    "pos": "RW",
    "club": "노팅엄 포레스터"
  },
  "nfo-12": {
    "name": "아르노 칼리무엔돈",
    "nation": "프랑스",
    "birthYear": 2002,
    "pos": "ST",
    "club": "노팅엄 포레스터"
  },
  "nfo-13": {
    "name": "리암 델라픈",
    "nation": "잉글랜드",
    "birthYear": 2003,
    "pos": "ST",
    "club": "노팅엄 포레스터"
  },
  "nfo-14": {
    "name": "크사버 슐라거스",
    "nation": "오스트리아",
    "birthYear": 1997,
    "pos": "CM",
    "club": "노팅엄 포레스터"
  },
  "nfo-15": {
    "name": "라이언 예이추",
    "nation": "잉글랜드",
    "birthYear": 1997,
    "pos": "CDM",
    "club": "노팅엄 포레스터"
  },
  "nfo-16": {
    "name": "자이르 쿠냔",
    "nation": "브라질",
    "birthYear": 2005,
    "pos": "CB",
    "club": "노팅엄 포레스터"
  },
  "nfo-17": {
    "name": "제임스 매카틴",
    "nation": "잉글랜드",
    "birthYear": 2002,
    "pos": "CAM",
    "club": "노팅엄 포레스터"
  },
  "nfo-18": {
    "name": "루카 네추",
    "nation": "독일",
    "birthYear": 2003,
    "pos": "LB",
    "club": "노팅엄 포레스터"
  },
  "nfo-19": {
    "name": "마츠 셀손",
    "nation": "벨기에",
    "birthYear": 1992,
    "pos": "GK",
    "club": "노팅엄 포레스터"
  },
  "nfo-20": {
    "name": "다니엘 무뇨손",
    "nation": "콜롬비아",
    "birthYear": 1996,
    "pos": "RB",
    "club": "노팅엄 포레스터"
  },
  "nfo-21": {
    "name": "니콜라 밀렌코비츠",
    "nation": "세르비아",
    "birthYear": 1997,
    "pos": "CB",
    "club": "노팅엄 포레스터"
  },
  "nfo-22": {
    "name": "슈테펜 벤단",
    "nation": "독일",
    "birthYear": 1998,
    "pos": "GK",
    "club": "노팅엄 포레스터"
  },
  "nfo-23": {
    "name": "올라 아이난",
    "nation": "나이지리아",
    "birthYear": 1996,
    "pos": "RB",
    "club": "노팅엄 포레스터"
  },
  "nfo-24": {
    "name": "니콜로 사보난",
    "nation": "이탈리아",
    "birthYear": 2003,
    "pos": "CB",
    "club": "노팅엄 포레스터"
  },
  "sun-01": {
    "name": "케빈 단손",
    "nation": "오스트리아",
    "birthYear": 1998,
    "pos": "CB",
    "club": "선덜랜드 블랙캣"
  },
  "sun-02": {
    "name": "대니얼 밸러든",
    "nation": "북아일랜드",
    "birthYear": 1999,
    "pos": "CB",
    "club": "선덜랜드 블랙캣"
  },
  "sun-03": {
    "name": "다얀 메탈린",
    "nation": "프랑스",
    "birthYear": 2006,
    "pos": "CB",
    "club": "선덜랜드 블랙캣"
  },
  "sun-04": {
    "name": "솀스딘 탈빈",
    "nation": "모로코",
    "birthYear": 2005,
    "pos": "RW",
    "club": "선덜랜드 블랙캣"
  },
  "sun-05": {
    "name": "앨런 브라운드",
    "nation": "아일랜드",
    "birthYear": 1995,
    "pos": "CM",
    "club": "선덜랜드 블랙캣"
  },
  "sun-06": {
    "name": "브라이언 브로베인",
    "nation": "네덜란드",
    "birthYear": 2002,
    "pos": "ST",
    "club": "선덜랜드 블랙캣"
  },
  "sun-07": {
    "name": "닐손 앙굴론",
    "nation": "에콰도르",
    "birthYear": 2003,
    "pos": "LW",
    "club": "선덜랜드 블랙캣"
  },
  "sun-08": {
    "name": "크리스 리근",
    "nation": "잉글랜드",
    "birthYear": 2007,
    "pos": "CAM",
    "club": "선덜랜드 블랙캣"
  },
  "sun-09": {
    "name": "토마 뫼니엔",
    "nation": "벨기에",
    "birthYear": 1991,
    "pos": "RB",
    "club": "선덜랜드 블랙캣"
  },
  "sun-10": {
    "name": "루크 오니언드",
    "nation": "잉글랜드",
    "birthYear": 1994,
    "pos": "CM",
    "club": "선덜랜드 블랙캣"
  },
  "sun-11": {
    "name": "로메인 문들라",
    "nation": "잉글랜드",
    "birthYear": 2003,
    "pos": "LW",
    "club": "선덜랜드 블랙캣"
  },
  "sun-12": {
    "name": "오마르 알데레텐",
    "nation": "파라과이",
    "birthYear": 1996,
    "pos": "CB",
    "club": "선덜랜드 블랙캣"
  },
  "sun-13": {
    "name": "레이닐둔",
    "nation": "모잠비크",
    "birthYear": 1994,
    "pos": "LB",
    "club": "선덜랜드 블랙캣"
  },
  "sun-14": {
    "name": "윌슨 이시도른",
    "nation": "아이티",
    "birthYear": 2000,
    "pos": "ST",
    "club": "선덜랜드 블랙캣"
  },
  "sun-15": {
    "name": "하비브 디아란",
    "nation": "세네갈",
    "birthYear": 2004,
    "pos": "CM",
    "club": "선덜랜드 블랙캣"
  },
  "sun-16": {
    "name": "노르디 무키엘렌",
    "nation": "프랑스",
    "birthYear": 1997,
    "pos": "RB",
    "club": "선덜랜드 블랙캣"
  },
  "sun-17": {
    "name": "사이먼 무언",
    "nation": "잉글랜드",
    "birthYear": 1990,
    "pos": "GK",
    "club": "선덜랜드 블랙캣"
  },
  "sun-18": {
    "name": "로빈 루프손",
    "nation": "네덜란드",
    "birthYear": 2003,
    "pos": "GK",
    "club": "선덜랜드 블랙캣"
  },
  "sun-19": {
    "name": "노아 사디킨",
    "nation": "콩고민주공화국",
    "birthYear": 2004,
    "pos": "CM",
    "club": "선덜랜드 블랙캣"
  },
  "sun-20": {
    "name": "엔조 르 펜",
    "nation": "프랑스",
    "birthYear": 2000,
    "pos": "CAM",
    "club": "선덜랜드 블랙캣"
  },
  "sun-21": {
    "name": "쥘 아오칸",
    "nation": "콩고민주공화국",
    "birthYear": 2006,
    "pos": "CM",
    "club": "선덜랜드 블랙캣"
  },
  "sun-22": {
    "name": "멜케르 엘보린",
    "nation": "스웨덴",
    "birthYear": 2003,
    "pos": "GK",
    "club": "선덜랜드 블랙캣"
  },
  "sun-23": {
    "name": "트라이 흄드",
    "nation": "북아일랜드",
    "birthYear": 2002,
    "pos": "RB",
    "club": "선덜랜드 블랙캣"
  },
  "sun-24": {
    "name": "그라니트 자칸",
    "nation": "스위스",
    "birthYear": 1992,
    "pos": "CDM",
    "club": "선덜랜드 블랙캣"
  },
  "sun-25": {
    "name": "조슬랭 타 빈",
    "nation": "코트디부아르",
    "birthYear": 2005,
    "pos": "RW",
    "club": "선덜랜드 블랙캣"
  },
  "sun-26": {
    "name": "말리크 포파난",
    "nation": "벨기에",
    "birthYear": 2005,
    "pos": "LW",
    "club": "선덜랜드 블랙캣"
  },
  "sun-27": {
    "name": "아지 알레센",
    "nation": "잉글랜드",
    "birthYear": 2001,
    "pos": "LB",
    "club": "선덜랜드 블랙캣"
  },
  "sun-28": {
    "name": "압둘라 바르",
    "nation": "프랑스",
    "birthYear": 2003,
    "pos": "CM",
    "club": "선덜랜드 블랙캣"
  },
  "tot-01": {
    "name": "앤디 로버트슨드",
    "nation": "스코틀랜드",
    "birthYear": 1994,
    "pos": "LB",
    "club": "북런던 화이트"
  },
  "tot-02": {
    "name": "토신 아다라비오욘",
    "nation": "잉글랜드",
    "birthYear": 1997,
    "pos": "CB",
    "club": "북런던 화이트"
  },
  "tot-03": {
    "name": "마르코스 세네신",
    "nation": "아르헨티나",
    "birthYear": 1997,
    "pos": "CB",
    "club": "북런던 화이트"
  },
  "tot-04": {
    "name": "얀 파울 판헤켄",
    "nation": "네덜란드",
    "birthYear": 2000,
    "pos": "CB",
    "club": "북런던 화이트"
  },
  "tot-05": {
    "name": "사비 시몬손",
    "nation": "네덜란드",
    "birthYear": 2003,
    "pos": "CAM",
    "club": "북런던 화이트"
  },
  "tot-06": {
    "name": "코너 갤러거스",
    "nation": "잉글랜드",
    "birthYear": 2000,
    "pos": "CM",
    "club": "북런던 화이트"
  },
  "tot-07": {
    "name": "히샤를리송드",
    "nation": "브라질",
    "birthYear": 1997,
    "pos": "ST",
    "club": "북런던 화이트"
  },
  "tot-08": {
    "name": "제임스 매디슨드",
    "nation": "잉글랜드",
    "birthYear": 1996,
    "pos": "CAM",
    "club": "북런던 화이트"
  },
  "tot-09": {
    "name": "마티스 텔라",
    "nation": "프랑스",
    "birthYear": 2005,
    "pos": "ST",
    "club": "북런던 화이트"
  },
  "tot-10": {
    "name": "데스티니 우도긴",
    "nation": "이탈리아",
    "birthYear": 2002,
    "pos": "LB",
    "club": "북런던 화이트"
  },
  "tot-11": {
    "name": "아치 그레인",
    "nation": "잉글랜드",
    "birthYear": 2006,
    "pos": "CM",
    "club": "북런던 화이트"
  },
  "tot-12": {
    "name": "루카스 베리발라",
    "nation": "스웨덴",
    "birthYear": 2006,
    "pos": "CM",
    "club": "북런던 화이트"
  },
  "tot-13": {
    "name": "산드로 토날린",
    "nation": "이탈리아",
    "birthYear": 2000,
    "pos": "CDM",
    "club": "북런던 화이트"
  },
  "tot-14": {
    "name": "사비운",
    "nation": "브라질",
    "birthYear": 2004,
    "pos": "LW",
    "club": "북런던 화이트"
  },
  "tot-15": {
    "name": "마테우스 페르난드손",
    "nation": "포르투갈",
    "birthYear": 2004,
    "pos": "CM",
    "club": "북런던 화이트"
  },
  "tot-16": {
    "name": "도미닉 솔란켄",
    "nation": "잉글랜드",
    "birthYear": 1997,
    "pos": "ST",
    "club": "북런던 화이트"
  },
  "tot-17": {
    "name": "모하메드 쿠두손",
    "nation": "가나",
    "birthYear": 2000,
    "pos": "RW",
    "club": "북런던 화이트"
  },
  "tot-18": {
    "name": "데얀 쿨루셉스킨",
    "nation": "스웨덴",
    "birthYear": 2000,
    "pos": "RW",
    "club": "북런던 화이트"
  },
  "tot-19": {
    "name": "오마르 마르무신",
    "nation": "이집트",
    "birthYear": 1999,
    "pos": "RW",
    "club": "북런던 화이트"
  },
  "tot-20": {
    "name": "페드로 포론",
    "nation": "스페인",
    "birthYear": 1999,
    "pos": "RB",
    "club": "북런던 화이트"
  },
  "tot-21": {
    "name": "미하일로 무드리큰",
    "nation": "우크라이나",
    "birthYear": 2001,
    "pos": "LW",
    "club": "북런던 화이트"
  },
  "tot-22": {
    "name": "윌슨 오도베른",
    "nation": "프랑스",
    "birthYear": 2004,
    "pos": "LW",
    "club": "북런던 화이트"
  },
  "tot-23": {
    "name": "로드리고 벤탄쿠른",
    "nation": "우루과이",
    "birthYear": 1997,
    "pos": "CM",
    "club": "북런던 화이트"
  },
  "tot-24": {
    "name": "안토닌 킨스킨",
    "nation": "체코",
    "birthYear": 2003,
    "pos": "GK",
    "club": "북런던 화이트"
  },
  "tot-25": {
    "name": "벤 데이비손",
    "nation": "웨일스",
    "birthYear": 1993,
    "pos": "CB",
    "club": "북런던 화이트"
  },
  "tot-26": {
    "name": "미키 판더페느",
    "nation": "네덜란드",
    "birthYear": 2001,
    "pos": "CB",
    "club": "북런던 화이트"
  },
  "tot-27": {
    "name": "마르틴 두브라프칸",
    "nation": "슬로바키아",
    "birthYear": 1989,
    "pos": "GK",
    "club": "북런던 화이트"
  },
  "tot-28": {
    "name": "브랜던 오스티느",
    "nation": "미국",
    "birthYear": 1999,
    "pos": "GK",
    "club": "북런던 화이트"
  },
  "ala-01": {
    "name": "안토니오 시베로",
    "nation": "스페인",
    "birthYear": 1996,
    "pos": "GK",
    "club": "알라베스 아술"
  },
  "ala-02": {
    "name": "니콜라스 발렌티노",
    "nation": "아르헨티나",
    "birthYear": 2001,
    "pos": "CB",
    "club": "알라베스 아술"
  },
  "ala-03": {
    "name": "유세프 엔리케르",
    "nation": "모로코",
    "birthYear": 2005,
    "pos": "RB",
    "club": "알라베스 아술"
  },
  "ala-04": {
    "name": "데니스 수아레노",
    "nation": "스페인",
    "birthYear": 1994,
    "pos": "CM",
    "club": "알라베스 아술"
  },
  "ala-05": {
    "name": "파쿤도 가르세노",
    "nation": "아르헨티나",
    "birthYear": 1999,
    "pos": "CB",
    "club": "알라베스 아술"
  },
  "ala-06": {
    "name": "안데르 게바로",
    "nation": "스페인",
    "birthYear": 1997,
    "pos": "CDM",
    "club": "알라베스 아술"
  },
  "ala-07": {
    "name": "앙헬 페레노",
    "nation": "스페인",
    "birthYear": 2002,
    "pos": "CAM",
    "club": "알라베스 아술"
  },
  "ala-08": {
    "name": "안토니오 블랑카",
    "nation": "스페인",
    "birthYear": 2000,
    "pos": "CM",
    "club": "알라베스 아술"
  },
  "ala-09": {
    "name": "마리아노 디아노",
    "nation": "도미니카공화국",
    "birthYear": 1993,
    "pos": "ST",
    "club": "알라베스 아술"
  },
  "ala-10": {
    "name": "카를레스 알레뇨",
    "nation": "스페인",
    "birthYear": 1998,
    "pos": "CAM",
    "club": "알라베스 아술"
  },
  "ala-11": {
    "name": "토니 마르티네르",
    "nation": "스페인",
    "birthYear": 1997,
    "pos": "ST",
    "club": "알라베스 아술"
  },
  "ala-12": {
    "name": "우고 노보안",
    "nation": "스페인",
    "birthYear": 2003,
    "pos": "RB",
    "club": "알라베스 아술"
  },
  "ala-13": {
    "name": "아드리안 로드리게노",
    "nation": "아르헨티나",
    "birthYear": 2000,
    "pos": "GK",
    "club": "알라베스 아술"
  },
  "ala-14": {
    "name": "나우엘 테나글리오",
    "nation": "아르헨티나",
    "birthYear": 1996,
    "pos": "RB",
    "club": "알라베스 아술"
  },
  "ala-15": {
    "name": "루카스 보옌",
    "nation": "아르헨티나",
    "birthYear": 1996,
    "pos": "ST",
    "club": "알라베스 아술"
  },
  "ala-16": {
    "name": "빌레 코스킨",
    "nation": "핀란드",
    "birthYear": 2002,
    "pos": "CB",
    "club": "알라베스 아술"
  },
  "ala-17": {
    "name": "조니 오톤",
    "nation": "스페인",
    "birthYear": 1994,
    "pos": "LB",
    "club": "알라베스 아술"
  },
  "ala-18": {
    "name": "미켈 로드리게르",
    "nation": "스페인",
    "birthYear": 2002,
    "pos": "CM",
    "club": "알라베스 아술"
  },
  "ala-19": {
    "name": "파블로 이바네르",
    "nation": "스페인",
    "birthYear": 1998,
    "pos": "CM",
    "club": "알라베스 아술"
  },
  "ala-20": {
    "name": "아이토르 마냐노",
    "nation": "스페인",
    "birthYear": 2003,
    "pos": "LW",
    "club": "알라베스 아술"
  },
  "ala-21": {
    "name": "압데 레바흐",
    "nation": "알제리",
    "birthYear": 1998,
    "pos": "RW",
    "club": "알라베스 아술"
  },
  "ala-22": {
    "name": "미겔 로드리게산",
    "nation": "스페인",
    "birthYear": 2003,
    "pos": "CM",
    "club": "알라베스 아술"
  },
  "ala-23": {
    "name": "카를로스 프로테소닌",
    "nation": "우루과이",
    "birthYear": 1998,
    "pos": "CDM",
    "club": "알라베스 아술"
  },
  "ala-24": {
    "name": "셀루 디알론",
    "nation": "기니",
    "birthYear": 2003,
    "pos": "CM",
    "club": "알라베스 아술"
  },
  "ala-25": {
    "name": "그레고이르 시비데르스칸",
    "nation": "캐나다",
    "birthYear": 2005,
    "pos": "GK",
    "club": "알라베스 아술"
  },
  "ath-01": {
    "name": "우나이 시몬드",
    "nation": "스페인",
    "birthYear": 1997,
    "pos": "GK",
    "club": "바스크 아슬레"
  },
  "ath-02": {
    "name": "다니 비비앙",
    "nation": "스페인",
    "birthYear": 1999,
    "pos": "CB",
    "club": "바스크 아슬레"
  },
  "ath-03": {
    "name": "아이토르 파레데노",
    "nation": "스페인",
    "birthYear": 2000,
    "pos": "CB",
    "club": "바스크 아슬레"
  },
  "ath-04": {
    "name": "예라이 알바레노",
    "nation": "스페인",
    "birthYear": 1995,
    "pos": "CB",
    "club": "바스크 아슬레"
  },
  "ath-05": {
    "name": "베냐트 프라도르",
    "nation": "스페인",
    "birthYear": 2001,
    "pos": "CDM",
    "club": "바스크 아슬레"
  },
  "ath-06": {
    "name": "알렉스 베렝게로",
    "nation": "스페인",
    "birthYear": 1995,
    "pos": "LW",
    "club": "바스크 아슬레"
  },
  "ath-07": {
    "name": "오이안 산세타",
    "nation": "스페인",
    "birthYear": 2000,
    "pos": "CAM",
    "club": "바스크 아슬레"
  },
  "ath-08": {
    "name": "이냐키 윌리엄슨",
    "nation": "가나",
    "birthYear": 1994,
    "pos": "ST",
    "club": "바스크 아슬레"
  },
  "ath-09": {
    "name": "니코 윌리엄슨",
    "nation": "스페인",
    "birthYear": 2002,
    "pos": "LW",
    "club": "바스크 아슬레"
  },
  "ath-10": {
    "name": "고르카 구루세토",
    "nation": "스페인",
    "birthYear": 1996,
    "pos": "ST",
    "club": "바스크 아슬레"
  },
  "ath-11": {
    "name": "헤수스 아레손",
    "nation": "스페인",
    "birthYear": 1999,
    "pos": "RB",
    "club": "바스크 아슬레"
  },
  "ath-12": {
    "name": "알렉스 파디요",
    "nation": "멕시코",
    "birthYear": 2003,
    "pos": "GK",
    "club": "바스크 아슬레"
  },
  "ath-13": {
    "name": "에므리크 라포르타",
    "nation": "스페인",
    "birthYear": 1994,
    "pos": "CB",
    "club": "바스크 아슬레"
  },
  "ath-14": {
    "name": "우고 린콘드",
    "nation": "스페인",
    "birthYear": 2003,
    "pos": "RB",
    "club": "바스크 아슬레"
  },
  "ath-15": {
    "name": "이니고 루이스 데 갈라레토",
    "nation": "스페인",
    "birthYear": 1993,
    "pos": "CM",
    "club": "바스크 아슬레"
  },
  "ath-16": {
    "name": "유리 베르치첸",
    "nation": "스페인",
    "birthYear": 1990,
    "pos": "LB",
    "club": "바스크 아슬레"
  },
  "ath-17": {
    "name": "미켈 하우레기사른",
    "nation": "스페인",
    "birthYear": 2003,
    "pos": "CDM",
    "club": "바스크 아슬레"
  },
  "ath-18": {
    "name": "알레한드로 레곤",
    "nation": "스페인",
    "birthYear": 2003,
    "pos": "CM",
    "club": "바스크 아슬레"
  },
  "ath-19": {
    "name": "마로안 산나딘",
    "nation": "모로코",
    "birthYear": 2001,
    "pos": "ST",
    "club": "바스크 아슬레"
  },
  "ath-20": {
    "name": "니코 세라논",
    "nation": "스페인",
    "birthYear": 2003,
    "pos": "RW",
    "club": "바스크 아슬레"
  },
  "ath-21": {
    "name": "로베르트 나바론",
    "nation": "스페인",
    "birthYear": 2002,
    "pos": "LW",
    "club": "바스크 아슬레"
  },
  "ath-22": {
    "name": "베냐트 헤레나바레노",
    "nation": "스페인",
    "birthYear": 2003,
    "pos": "CM",
    "club": "바스크 아슬레"
  },
  "ath-23": {
    "name": "알바로 자론",
    "nation": "기니비사우",
    "birthYear": 1999,
    "pos": "RW",
    "club": "바스크 아슬레"
  },
  "ath-24": {
    "name": "페이오 카날레노",
    "nation": "스페인",
    "birthYear": 2005,
    "pos": "CAM",
    "club": "바스크 아슬레"
  },
  "ath-25": {
    "name": "요아네코 루이잔",
    "nation": "프랑스",
    "birthYear": 2004,
    "pos": "RB",
    "club": "바스크 아슬레"
  },
  "atm-01": {
    "name": "후안 무손",
    "nation": "아르헨티나",
    "birthYear": 1994,
    "pos": "GK",
    "club": "마드리드 로히"
  },
  "atm-02": {
    "name": "오베드 바르가노",
    "nation": "멕시코",
    "birthYear": 2005,
    "pos": "CDM",
    "club": "마드리드 로히"
  },
  "atm-03": {
    "name": "로드리고 멘도산",
    "nation": "스페인",
    "birthYear": 2005,
    "pos": "CM",
    "club": "마드리드 로히"
  },
  "atm-04": {
    "name": "자니 카르도손",
    "nation": "미국",
    "birthYear": 2001,
    "pos": "CDM",
    "club": "마드리드 로히"
  },
  "atm-05": {
    "name": "코켄",
    "nation": "스페인",
    "birthYear": 1992,
    "pos": "CM",
    "club": "마드리드 로히"
  },
  "atm-06": {
    "name": "이간인",
    "nation": "대한민국",
    "birthYear": 2001,
    "pos": "CAM",
    "club": "마드리드 로히"
  },
  "atm-07": {
    "name": "파블로 바리오노",
    "nation": "스페인",
    "birthYear": 2003,
    "pos": "CM",
    "club": "마드리드 로히"
  },
  "atm-08": {
    "name": "알렉산데르 쇠를로타",
    "nation": "노르웨이",
    "birthYear": 1995,
    "pos": "ST",
    "club": "마드리드 로히"
  },
  "atm-09": {
    "name": "알렉스 바에노",
    "nation": "스페인",
    "birthYear": 2001,
    "pos": "CAM",
    "club": "마드리드 로히"
  },
  "atm-10": {
    "name": "아데몰라 루크몬",
    "nation": "나이지리아",
    "birthYear": 1997,
    "pos": "RW",
    "club": "마드리드 로히"
  },
  "atm-11": {
    "name": "얀 오블라킨",
    "nation": "슬로베니아",
    "birthYear": 1993,
    "pos": "GK",
    "club": "마드리드 로히"
  },
  "atm-12": {
    "name": "마르코스 요렌토",
    "nation": "스페인",
    "birthYear": 1995,
    "pos": "CM",
    "club": "마드리드 로히"
  },
  "atm-13": {
    "name": "조너선 데이비스",
    "nation": "캐나다",
    "birthYear": 2000,
    "pos": "ST",
    "club": "마드리드 로히"
  },
  "atm-14": {
    "name": "아르나우 오르티노",
    "nation": "스페인",
    "birthYear": 2001,
    "pos": "CM",
    "club": "마드리드 로히"
  },
  "atm-15": {
    "name": "다비드 한츠콘",
    "nation": "슬로바키아",
    "birthYear": 1997,
    "pos": "CB",
    "club": "마드리드 로히"
  },
  "atm-16": {
    "name": "마르크 푸비요",
    "nation": "스페인",
    "birthYear": 2003,
    "pos": "RB",
    "club": "마드리드 로히"
  },
  "atm-17": {
    "name": "훌리안 알바레노",
    "nation": "아르헨티나",
    "birthYear": 2000,
    "pos": "ST",
    "club": "마드리드 로히"
  },
  "atm-18": {
    "name": "줄리아노 시메오나",
    "nation": "아르헨티나",
    "birthYear": 2002,
    "pos": "RW",
    "club": "마드리드 로히"
  },
  "atm-19": {
    "name": "크리스티안 로메론",
    "nation": "아르헨티나",
    "birthYear": 1998,
    "pos": "CB",
    "club": "마드리드 로히"
  },
  "atm-20": {
    "name": "알레한드로 그리말두",
    "nation": "스페인",
    "birthYear": 1995,
    "pos": "LB",
    "club": "마드리드 로히"
  },
  "atm-21": {
    "name": "모르텐 율마르",
    "nation": "덴마크",
    "birthYear": 1999,
    "pos": "CDM",
    "club": "마드리드 로히"
  },
  "atm-22": {
    "name": "로뱅 르 노르만드",
    "nation": "스페인",
    "birthYear": 1996,
    "pos": "CB",
    "club": "마드리드 로히"
  },
  "atm-23": {
    "name": "살비 에스키베르",
    "nation": "스페인",
    "birthYear": 2005,
    "pos": "GK",
    "club": "마드리드 로히"
  },
  "atm-24": {
    "name": "다니 마르티네노",
    "nation": "스페인",
    "birthYear": 2004,
    "pos": "CB",
    "club": "마드리드 로히"
  },
  "fcb-01": {
    "name": "조안 가르시안",
    "nation": "스페인",
    "birthYear": 2001,
    "pos": "GK",
    "club": "카탈루냐 블라우"
  },
  "fcb-02": {
    "name": "주앙 칸셀로",
    "nation": "포르투갈",
    "birthYear": 1994,
    "pos": "RB",
    "club": "카탈루냐 블라우"
  },
  "fcb-03": {
    "name": "알레한드로 발덴",
    "nation": "스페인",
    "birthYear": 2003,
    "pos": "LB",
    "club": "카탈루냐 블라우"
  },
  "fcb-04": {
    "name": "브리안 파리냐노",
    "nation": "스페인",
    "birthYear": 2006,
    "pos": "CM",
    "club": "카탈루냐 블라우"
  },
  "fcb-05": {
    "name": "파우 쿠바르신",
    "nation": "스페인",
    "birthYear": 2007,
    "pos": "CB",
    "club": "카탈루냐 블라우"
  },
  "fcb-06": {
    "name": "가빈",
    "nation": "스페인",
    "birthYear": 2004,
    "pos": "CM",
    "club": "카탈루냐 블라우"
  },
  "fcb-07": {
    "name": "페르민 로페노",
    "nation": "스페인",
    "birthYear": 2003,
    "pos": "CAM",
    "club": "카탈루냐 블라우"
  },
  "fcb-08": {
    "name": "페드린",
    "nation": "스페인",
    "birthYear": 2002,
    "pos": "CM",
    "club": "카탈루냐 블라우"
  },
  "fcb-09": {
    "name": "가브리엘 제주노",
    "nation": "브라질",
    "birthYear": 1997,
    "pos": "ST",
    "club": "카탈루냐 블라우"
  },
  "fcb-10": {
    "name": "라민 야멀",
    "nation": "스페인",
    "birthYear": 2007,
    "pos": "RW",
    "club": "카탈루냐 블라우"
  },
  "fcb-11": {
    "name": "하피뇨",
    "nation": "브라질",
    "birthYear": 1996,
    "pos": "LW",
    "club": "카탈루냐 블라우"
  },
  "fcb-12": {
    "name": "샤비 에스파르타",
    "nation": "스페인",
    "birthYear": 2007,
    "pos": "LB",
    "club": "카탈루냐 블라우"
  },
  "fcb-13": {
    "name": "보이치에흐 슈쳉스노",
    "nation": "폴란드",
    "birthYear": 1990,
    "pos": "GK",
    "club": "카탈루냐 블라우"
  },
  "fcb-14": {
    "name": "카림 아데예민",
    "nation": "독일",
    "birthYear": 2002,
    "pos": "LW",
    "club": "카탈루냐 블라우"
  },
  "fcb-15": {
    "name": "안드레아스 크리스텐센드",
    "nation": "덴마크",
    "birthYear": 1996,
    "pos": "CB",
    "club": "카탈루냐 블라우"
  },
  "fcb-16": {
    "name": "로드린",
    "nation": "스페인",
    "birthYear": 1996,
    "pos": "CDM",
    "club": "카탈루냐 블라우"
  },
  "fcb-17": {
    "name": "앤서니 고돈",
    "nation": "잉글랜드",
    "birthYear": 2001,
    "pos": "LW",
    "club": "카탈루냐 블라우"
  },
  "fcb-18": {
    "name": "제라르드 마르티노",
    "nation": "스페인",
    "birthYear": 2002,
    "pos": "LB",
    "club": "카탈루냐 블라우"
  },
  "fcb-19": {
    "name": "루니 바르그진",
    "nation": "스웨덴",
    "birthYear": 2005,
    "pos": "RW",
    "club": "카탈루냐 블라우"
  },
  "fcb-20": {
    "name": "다니 올모르",
    "nation": "스페인",
    "birthYear": 1998,
    "pos": "CAM",
    "club": "카탈루냐 블라우"
  },
  "fcb-21": {
    "name": "프렌키 더 요른",
    "nation": "네덜란드",
    "birthYear": 1997,
    "pos": "CM",
    "club": "카탈루냐 블라우"
  },
  "fcb-22": {
    "name": "마르크 베르낼",
    "nation": "스페인",
    "birthYear": 2007,
    "pos": "CDM",
    "club": "카탈루냐 블라우"
  },
  "fcb-23": {
    "name": "쥘 쿤덴",
    "nation": "프랑스",
    "birthYear": 1998,
    "pos": "CB",
    "club": "카탈루냐 블라우"
  },
  "fcb-24": {
    "name": "에리크 가르시안",
    "nation": "스페인",
    "birthYear": 2001,
    "pos": "CB",
    "club": "카탈루냐 블라우"
  },
  "fcb-25": {
    "name": "도미니크 리바코비츠",
    "nation": "크로아티아",
    "birthYear": 1995,
    "pos": "GK",
    "club": "카탈루냐 블라우"
  },
  "cel-01": {
    "name": "알타이 바이은드론",
    "nation": "튀르키예",
    "birthYear": 1998,
    "pos": "GK",
    "club": "비고 셀레스테"
  },
  "cel-02": {
    "name": "칼 스타르펠타",
    "nation": "스웨덴",
    "birthYear": 1995,
    "pos": "CB",
    "club": "비고 셀레스테"
  },
  "cel-03": {
    "name": "마르코스 알론사",
    "nation": "스페인",
    "birthYear": 1990,
    "pos": "LB",
    "club": "비고 셀레스테"
  },
  "cel-04": {
    "name": "압둘라예 파옌",
    "nation": "세네갈",
    "birthYear": 2004,
    "pos": "CB",
    "club": "비고 셀레스테"
  },
  "cel-05": {
    "name": "세르히오 카레이로",
    "nation": "스페인",
    "birthYear": 2000,
    "pos": "RB",
    "club": "비고 셀레스테"
  },
  "cel-06": {
    "name": "일라시 모리반",
    "nation": "기니",
    "birthYear": 2003,
    "pos": "CDM",
    "club": "비고 셀레스테"
  },
  "cel-07": {
    "name": "보르하 이글레시아노",
    "nation": "스페인",
    "birthYear": 1993,
    "pos": "ST",
    "club": "비고 셀레스테"
  },
  "cel-08": {
    "name": "미겔 로마르",
    "nation": "스페인",
    "birthYear": 2002,
    "pos": "CM",
    "club": "비고 셀레스테"
  },
  "cel-09": {
    "name": "페란 후트글란",
    "nation": "스페인",
    "birthYear": 1999,
    "pos": "ST",
    "club": "비고 셀레스테"
  },
  "cel-10": {
    "name": "이아고 아스파노",
    "nation": "스페인",
    "birthYear": 1987,
    "pos": "CAM",
    "club": "비고 셀레스테"
  },
  "cel-11": {
    "name": "파블로 두란드",
    "nation": "스페인",
    "birthYear": 2001,
    "pos": "ST",
    "club": "비고 셀레스테"
  },
  "cel-12": {
    "name": "이오누츠 라둔",
    "nation": "루마니아",
    "birthYear": 1997,
    "pos": "GK",
    "club": "비고 셀레스테"
  },
  "cel-13": {
    "name": "알레익스 페바노",
    "nation": "스페인",
    "birthYear": 1996,
    "pos": "CM",
    "club": "비고 셀레스테"
  },
  "cel-14": {
    "name": "알바로 누녜노",
    "nation": "스페인",
    "birthYear": 2000,
    "pos": "RB",
    "club": "비고 셀레스테"
  },
  "cel-15": {
    "name": "우고 곤살레노",
    "nation": "스페인",
    "birthYear": 2003,
    "pos": "RW",
    "club": "비고 셀레스테"
  },
  "cel-16": {
    "name": "하비 루에단",
    "nation": "스페인",
    "birthYear": 2002,
    "pos": "RB",
    "club": "비고 셀레스테"
  },
  "cel-17": {
    "name": "요엘 라곤",
    "nation": "스페인",
    "birthYear": 2004,
    "pos": "CB",
    "club": "비고 셀레스테"
  },
  "cel-18": {
    "name": "윌리오트 스베드베린",
    "nation": "스웨덴",
    "birthYear": 2004,
    "pos": "LW",
    "club": "비고 셀레스테"
  },
  "cel-19": {
    "name": "하비 로드리게노",
    "nation": "스페인",
    "birthYear": 2003,
    "pos": "CB",
    "club": "비고 셀레스테"
  },
  "cel-20": {
    "name": "세바스티안 카세레노",
    "nation": "우루과이",
    "birthYear": 1999,
    "pos": "CB",
    "club": "비고 셀레스테"
  },
  "cel-21": {
    "name": "하비 갈란드",
    "nation": "스페인",
    "birthYear": 1994,
    "pos": "LB",
    "club": "비고 셀레스테"
  },
  "cel-22": {
    "name": "우고 알바레노",
    "nation": "스페인",
    "birthYear": 2003,
    "pos": "RW",
    "club": "비고 셀레스테"
  },
  "cel-23": {
    "name": "쿠하입 드리우에신",
    "nation": "모로코",
    "birthYear": 2002,
    "pos": "LW",
    "club": "비고 셀레스테"
  },
  "cel-24": {
    "name": "이반 비야른",
    "nation": "스페인",
    "birthYear": 1997,
    "pos": "GK",
    "club": "비고 셀레스테"
  },
  "cel-25": {
    "name": "존스 엘압델라윈",
    "nation": "모로코",
    "birthYear": 2006,
    "pos": "LW",
    "club": "비고 셀레스테"
  },
  "dep-01": {
    "name": "헤르만 파레뇬",
    "nation": "스페인",
    "birthYear": 1993,
    "pos": "GK",
    "club": "코루냐 블랑키아술"
  },
  "dep-02": {
    "name": "아드리아 알티미로",
    "nation": "스페인",
    "birthYear": 2001,
    "pos": "RB",
    "club": "코루냐 블랑키아술"
  },
  "dep-03": {
    "name": "아르나우 코마노",
    "nation": "스페인",
    "birthYear": 2000,
    "pos": "CB",
    "club": "코루냐 블랑키아술"
  },
  "dep-04": {
    "name": "루카스 누빈",
    "nation": "벨기에",
    "birthYear": 2005,
    "pos": "CB",
    "club": "코루냐 블랑키아술"
  },
  "dep-05": {
    "name": "다니 바르시안",
    "nation": "스페인",
    "birthYear": 2003,
    "pos": "CB",
    "club": "코루냐 블랑키아술"
  },
  "dep-06": {
    "name": "마르크 카사돈",
    "nation": "스페인",
    "birthYear": 2003,
    "pos": "CDM",
    "club": "코루냐 블랑키아술"
  },
  "dep-07": {
    "name": "피에르에메릭 오바메얀드",
    "nation": "가봉",
    "birthYear": 1989,
    "pos": "ST",
    "club": "코루냐 블랑키아술"
  },
  "dep-08": {
    "name": "디에고 비야레노",
    "nation": "스페인",
    "birthYear": 1996,
    "pos": "CM",
    "club": "코루냐 블랑키아술"
  },
  "dep-09": {
    "name": "자카리아 에다추린",
    "nation": "네덜란드",
    "birthYear": 2000,
    "pos": "ST",
    "club": "코루냐 블랑키아술"
  },
  "dep-10": {
    "name": "예레마이 에르난데노",
    "nation": "스페인",
    "birthYear": 2002,
    "pos": "LW",
    "club": "코루냐 블랑키아술"
  },
  "dep-11": {
    "name": "다비드 메얀",
    "nation": "스페인",
    "birthYear": 2005,
    "pos": "RW",
    "club": "코루냐 블랑키아술"
  },
  "dep-12": {
    "name": "자코모 콸리아토",
    "nation": "이탈리아",
    "birthYear": 2000,
    "pos": "LB",
    "club": "코루냐 블랑키아술"
  },
  "dep-13": {
    "name": "레오 로마르",
    "nation": "스페인",
    "birthYear": 2000,
    "pos": "GK",
    "club": "코루냐 블랑키아술"
  },
  "dep-14": {
    "name": "리키 로드리게노",
    "nation": "스페인",
    "birthYear": 1997,
    "pos": "CM",
    "club": "코루냐 블랑키아술"
  },
  "dep-15": {
    "name": "미겔 로우레이론",
    "nation": "스페인",
    "birthYear": 1996,
    "pos": "CB",
    "club": "코루냐 블랑키아술"
  },
  "dep-16": {
    "name": "로렌초 아마투친",
    "nation": "이탈리아",
    "birthYear": 2004,
    "pos": "CM",
    "club": "코루냐 블랑키아술"
  },
  "dep-17": {
    "name": "안헬리노",
    "nation": "스페인",
    "birthYear": 1997,
    "pos": "LB",
    "club": "코루냐 블랑키아술"
  },
  "dep-18": {
    "name": "요나탄 아스프 옌슨",
    "nation": "덴마크",
    "birthYear": 2006,
    "pos": "CM",
    "club": "코루냐 블랑키아술"
  },
  "dep-19": {
    "name": "루이스미 크루손",
    "nation": "스페인",
    "birthYear": 2001,
    "pos": "LW",
    "club": "코루냐 블랑키아술"
  },
  "dep-20": {
    "name": "호세 마리아 히메네노",
    "nation": "우루과이",
    "birthYear": 1995,
    "pos": "CB",
    "club": "코루냐 블랑키아술"
  },
  "dep-21": {
    "name": "마리오 소리아논",
    "nation": "스페인",
    "birthYear": 2002,
    "pos": "CAM",
    "club": "코루냐 블랑키아술"
  },
  "dep-22": {
    "name": "시모 나바론",
    "nation": "스페인",
    "birthYear": 1990,
    "pos": "RB",
    "club": "코루냐 블랑키아술"
  },
  "dep-23": {
    "name": "아다마 트라오렌",
    "nation": "스페인",
    "birthYear": 1996,
    "pos": "RW",
    "club": "코루냐 블랑키아술"
  },
  "dep-24": {
    "name": "알바로 페르난데노",
    "nation": "스페인",
    "birthYear": 1998,
    "pos": "GK",
    "club": "코루냐 블랑키아술"
  },
  "dep-25": {
    "name": "빌 은송곤",
    "nation": "카메룬",
    "birthYear": 2004,
    "pos": "ST",
    "club": "코루냐 블랑키아술"
  },
  "dep-26": {
    "name": "테윈 헤이설하르타",
    "nation": "네덜란드",
    "birthYear": 2005,
    "pos": "CM",
    "club": "코루냐 블랑키아술"
  },
  "elc-01": {
    "name": "마티아스 디투론",
    "nation": "아르헨티나",
    "birthYear": 1987,
    "pos": "GK",
    "club": "엘체 프란히베르데"
  },
  "elc-02": {
    "name": "부바 상가렌",
    "nation": "스페인",
    "birthYear": 2007,
    "pos": "RB",
    "club": "엘체 프란히베르데"
  },
  "elc-03": {
    "name": "밤보 디아빈",
    "nation": "스페인",
    "birthYear": 1997,
    "pos": "CB",
    "club": "엘체 프란히베르데"
  },
  "elc-04": {
    "name": "페데리코 레돈두",
    "nation": "아르헨티나",
    "birthYear": 2003,
    "pos": "CDM",
    "club": "엘체 프란히베르데"
  },
  "elc-05": {
    "name": "페드로 비가노",
    "nation": "스페인",
    "birthYear": 1990,
    "pos": "LB",
    "club": "엘체 프란히베르데"
  },
  "elc-06": {
    "name": "야고 산티아곤",
    "nation": "스페인",
    "birthYear": 2003,
    "pos": "RW",
    "club": "엘체 프란히베르데"
  },
  "elc-07": {
    "name": "마르크 아과돈",
    "nation": "스페인",
    "birthYear": 2000,
    "pos": "CM",
    "club": "엘체 프란히베르데"
  },
  "elc-08": {
    "name": "에세키엘 폰센",
    "nation": "아르헨티나",
    "birthYear": 1997,
    "pos": "ST",
    "club": "엘체 프란히베르데"
  },
  "elc-09": {
    "name": "파쿤도 부오나노텐",
    "nation": "아르헨티나",
    "birthYear": 2004,
    "pos": "CAM",
    "club": "엘체 프란히베르데"
  },
  "elc-10": {
    "name": "헤르만 발레란",
    "nation": "스페인",
    "birthYear": 2002,
    "pos": "LW",
    "club": "엘체 프란히베르데"
  },
  "elc-11": {
    "name": "곤살로 비야른",
    "nation": "스페인",
    "birthYear": 1998,
    "pos": "CM",
    "club": "엘체 프란히베르데"
  },
  "elc-12": {
    "name": "페르 니논",
    "nation": "스페인",
    "birthYear": 2000,
    "pos": "ST",
    "club": "엘체 프란히베르데"
  },
  "elc-13": {
    "name": "마르팀 네툰",
    "nation": "포르투갈",
    "birthYear": 2003,
    "pos": "CM",
    "club": "엘체 프란히베르데"
  },
  "elc-14": {
    "name": "호사르",
    "nation": "스페인",
    "birthYear": 1989,
    "pos": "RM",
    "club": "엘체 프란히베르데"
  },
  "elc-15": {
    "name": "그레이디 디앙가노",
    "nation": "콩고민주공화국",
    "birthYear": 1998,
    "pos": "LW",
    "club": "엘체 프란히베르데"
  },
  "elc-16": {
    "name": "테테 모렌토",
    "nation": "스페인",
    "birthYear": 1996,
    "pos": "RW",
    "club": "엘체 프란히베르데"
  },
  "elc-17": {
    "name": "루카스 세페단",
    "nation": "칠레",
    "birthYear": 2002,
    "pos": "LW",
    "club": "엘체 프란히베르데"
  },
  "elc-18": {
    "name": "빅토르 추스타",
    "nation": "스페인",
    "birthYear": 2000,
    "pos": "CB",
    "club": "엘체 프란히베르데"
  },
  "elc-19": {
    "name": "아비엘 오소리온",
    "nation": "아르헨티나",
    "birthYear": 2002,
    "pos": "ST",
    "club": "엘체 프란히베르데"
  },
  "elc-20": {
    "name": "마티야 바르지츠",
    "nation": "크로아티아",
    "birthYear": 2004,
    "pos": "CB",
    "club": "엘체 프란히베르데"
  },
  "elc-21": {
    "name": "알리 우아린",
    "nation": "모로코",
    "birthYear": 2005,
    "pos": "CM",
    "club": "엘체 프란히베르데"
  },
  "elc-22": {
    "name": "아담 보아야른",
    "nation": "모로코",
    "birthYear": 2005,
    "pos": "CM",
    "club": "엘체 프란히베르데"
  },
  "elc-23": {
    "name": "알레한드로 이투르벤",
    "nation": "스페인",
    "birthYear": 2003,
    "pos": "GK",
    "club": "엘체 프란히베르데"
  },
  "elc-24": {
    "name": "하비 모르시욘",
    "nation": "스페인",
    "birthYear": 2006,
    "pos": "CM",
    "club": "엘체 프란히베르데"
  },
  "esy-01": {
    "name": "앙헬 포르투뇬",
    "nation": "스페인",
    "birthYear": 2001,
    "pos": "GK",
    "club": "에스파뇰 페리케"
  },
  "esy-02": {
    "name": "안도니 고로사벨라",
    "nation": "스페인",
    "birthYear": 1996,
    "pos": "RB",
    "club": "에스파뇰 페리케"
  },
  "esy-03": {
    "name": "킬린츠키 하르트마르",
    "nation": "네덜란드",
    "birthYear": 2001,
    "pos": "LB",
    "club": "에스파뇰 페리케"
  },
  "esy-04": {
    "name": "우르코 곤살레스 데 사라텐",
    "nation": "스페인",
    "birthYear": 2001,
    "pos": "CDM",
    "club": "에스파뇰 페리케"
  },
  "esy-05": {
    "name": "클레멘스 리델라",
    "nation": "독일",
    "birthYear": 2003,
    "pos": "CB",
    "club": "에스파뇰 페리케"
  },
  "esy-06": {
    "name": "레안드로 카브레란",
    "nation": "우루과이",
    "birthYear": 1991,
    "pos": "CB",
    "club": "에스파뇰 페리케"
  },
  "esy-07": {
    "name": "하비 푸아돈",
    "nation": "스페인",
    "birthYear": 1998,
    "pos": "LW",
    "club": "에스파뇰 페리케"
  },
  "esy-08": {
    "name": "에두 엑스포시톤",
    "nation": "스페인",
    "birthYear": 1996,
    "pos": "CM",
    "club": "에스파뇰 페리케"
  },
  "esy-09": {
    "name": "로베르토 페르난데노",
    "nation": "스페인",
    "birthYear": 2002,
    "pos": "ST",
    "club": "에스파뇰 페리케"
  },
  "esy-10": {
    "name": "폴 로사논",
    "nation": "스페인",
    "birthYear": 1999,
    "pos": "CM",
    "club": "에스파뇰 페리케"
  },
  "esy-11": {
    "name": "페레 미얀",
    "nation": "스페인",
    "birthYear": 1992,
    "pos": "ST",
    "club": "에스파뇰 페리케"
  },
  "esy-12": {
    "name": "마르코 드미트로비츠",
    "nation": "세르비아",
    "birthYear": 1992,
    "pos": "GK",
    "club": "에스파뇰 페리케"
  },
  "esy-13": {
    "name": "우나이 누녜노",
    "nation": "스페인",
    "birthYear": 1997,
    "pos": "CB",
    "club": "에스파뇰 페리케"
  },
  "esy-14": {
    "name": "브라이안 사라고산",
    "nation": "스페인",
    "birthYear": 2001,
    "pos": "LW",
    "club": "에스파뇰 페리케"
  },
  "esy-15": {
    "name": "반야 드르쿠시츠",
    "nation": "슬로베니아",
    "birthYear": 1999,
    "pos": "CB",
    "club": "에스파뇰 페리케"
  },
  "esy-16": {
    "name": "호프레 카레라노",
    "nation": "스페인",
    "birthYear": 2001,
    "pos": "RW",
    "club": "에스파뇰 페리케"
  },
  "esy-17": {
    "name": "마르코스 페르난데스코",
    "nation": "스페인",
    "birthYear": 2003,
    "pos": "LW",
    "club": "에스파뇰 페리케"
  },
  "esy-18": {
    "name": "키케 가르시안",
    "nation": "스페인",
    "birthYear": 1989,
    "pos": "ST",
    "club": "에스파뇰 페리케"
  },
  "esy-19": {
    "name": "가브리엘 모스카르돈",
    "nation": "브라질",
    "birthYear": 2005,
    "pos": "CDM",
    "club": "에스파뇰 페리케"
  },
  "esy-20": {
    "name": "로제르 이노혼",
    "nation": "스페인",
    "birthYear": 2005,
    "pos": "RB",
    "club": "에스파뇰 페리케"
  },
  "esy-21": {
    "name": "알렉스 칼라트라반",
    "nation": "스페인",
    "birthYear": 2000,
    "pos": "CM",
    "club": "에스파뇰 페리케"
  },
  "esy-22": {
    "name": "오마르 엘 힐랄린",
    "nation": "모로코",
    "birthYear": 2003,
    "pos": "RB",
    "club": "에스파뇰 페리케"
  },
  "esy-23": {
    "name": "티리스 돌란드",
    "nation": "잉글랜드",
    "birthYear": 2001,
    "pos": "RW",
    "club": "에스파뇰 페리케"
  },
  "esy-24": {
    "name": "라펠 바우산",
    "nation": "스페인",
    "birthYear": 2005,
    "pos": "CM",
    "club": "에스파뇰 페리케"
  },
  "esy-25": {
    "name": "하비 에르난데산",
    "nation": "스페인",
    "birthYear": 2004,
    "pos": "RW",
    "club": "에스파뇰 페리케"
  },
  "get-01": {
    "name": "이르지 레타첸",
    "nation": "체코",
    "birthYear": 1999,
    "pos": "GK",
    "club": "헤타페 아술"
  },
  "get-02": {
    "name": "다코남 제넨",
    "nation": "토고",
    "birthYear": 1991,
    "pos": "CB",
    "club": "헤타페 아술"
  },
  "get-03": {
    "name": "다빈친",
    "nation": "스페인",
    "birthYear": 2007,
    "pos": "LB",
    "club": "헤타페 아술"
  },
  "get-04": {
    "name": "사바 사조노비",
    "nation": "조지아",
    "birthYear": 2002,
    "pos": "CB",
    "club": "헤타페 아술"
  },
  "get-05": {
    "name": "압델 압카른",
    "nation": "모로코",
    "birthYear": 1999,
    "pos": "CB",
    "club": "헤타페 아술"
  },
  "get-06": {
    "name": "마리오 마르티노",
    "nation": "스페인",
    "birthYear": 2004,
    "pos": "CM",
    "club": "헤타페 아술"
  },
  "get-07": {
    "name": "후안미르",
    "nation": "스페인",
    "birthYear": 1993,
    "pos": "LW",
    "club": "헤타페 아술"
  },
  "get-08": {
    "name": "네마냐 구델라",
    "nation": "세르비아",
    "birthYear": 1991,
    "pos": "CDM",
    "club": "헤타페 아술"
  },
  "get-09": {
    "name": "보르하 마요란",
    "nation": "스페인",
    "birthYear": 1997,
    "pos": "ST",
    "club": "헤타페 아술"
  },
  "get-10": {
    "name": "마르틴 사트리아논",
    "nation": "우루과이",
    "birthYear": 2001,
    "pos": "ST",
    "club": "헤타페 아술"
  },
  "get-11": {
    "name": "라몬 테라친",
    "nation": "스페인",
    "birthYear": 2000,
    "pos": "CM",
    "club": "헤타페 아술"
  },
  "get-12": {
    "name": "다비드 소리안",
    "nation": "스페인",
    "birthYear": 1993,
    "pos": "GK",
    "club": "헤타페 아술"
  },
  "get-13": {
    "name": "세바스티안 보셀린",
    "nation": "우루과이",
    "birthYear": 2003,
    "pos": "CB",
    "club": "헤타페 아술"
  },
  "get-14": {
    "name": "프란초 세라논",
    "nation": "스페인",
    "birthYear": 2001,
    "pos": "CM",
    "club": "헤타페 아술"
  },
  "get-15": {
    "name": "키코 페메니안",
    "nation": "스페인",
    "birthYear": 1991,
    "pos": "RB",
    "club": "헤타페 아술"
  },
  "get-16": {
    "name": "에네스 위날라",
    "nation": "튀르키예",
    "birthYear": 1997,
    "pos": "ST",
    "club": "헤타페 아술"
  },
  "get-17": {
    "name": "크리스탄투스 우첸",
    "nation": "나이지리아",
    "birthYear": 2003,
    "pos": "CM",
    "club": "헤타페 아술"
  },
  "get-18": {
    "name": "안드레스 가르시안",
    "nation": "스페인",
    "birthYear": 2003,
    "pos": "RB",
    "club": "헤타페 아술"
  },
  "get-19": {
    "name": "요한 모히칸",
    "nation": "콜롬비아",
    "birthYear": 1992,
    "pos": "LB",
    "club": "헤타페 아술"
  },
  "get-20": {
    "name": "오렐 망갈란",
    "nation": "벨기에",
    "birthYear": 1998,
    "pos": "CM",
    "club": "헤타페 아술"
  },
  "get-21": {
    "name": "사이드 로메론",
    "nation": "아르헨티나",
    "birthYear": 1999,
    "pos": "CB",
    "club": "헤타페 아술"
  },
  "get-22": {
    "name": "장 이브 발룬",
    "nation": "코트디부아르",
    "birthYear": 2006,
    "pos": "RB",
    "club": "헤타페 아술"
  },
  "lev-01": {
    "name": "파블로 캄포노",
    "nation": "스페인",
    "birthYear": 2002,
    "pos": "GK",
    "club": "레반테 그라노타"
  },
  "lev-02": {
    "name": "아이사 만딘",
    "nation": "알제리",
    "birthYear": 1991,
    "pos": "CB",
    "club": "레반테 그라노타"
  },
  "lev-03": {
    "name": "이페아니 은두크웬",
    "nation": "오스트리아",
    "birthYear": 2008,
    "pos": "CB",
    "club": "레반테 그라노타"
  },
  "lev-04": {
    "name": "아드리안 델란",
    "nation": "스페인",
    "birthYear": 1999,
    "pos": "CB",
    "club": "레반테 그라노타"
  },
  "lev-05": {
    "name": "우고 소텔론",
    "nation": "스페인",
    "birthYear": 2003,
    "pos": "CM",
    "club": "레반테 그라노타"
  },
  "lev-06": {
    "name": "다니 레케난",
    "nation": "스페인",
    "birthYear": 2004,
    "pos": "CM",
    "club": "레반테 그라노타"
  },
  "lev-07": {
    "name": "로제르 브루겐",
    "nation": "스페인",
    "birthYear": 1996,
    "pos": "LW",
    "club": "레반테 그라노타"
  },
  "lev-08": {
    "name": "욘 안데르 올라사가스틴",
    "nation": "스페인",
    "birthYear": 2000,
    "pos": "CDM",
    "club": "레반테 그라노타"
  },
  "lev-09": {
    "name": "이반 로메로스",
    "nation": "스페인",
    "birthYear": 2001,
    "pos": "ST",
    "club": "레반테 그라노타"
  },
  "lev-10": {
    "name": "카를로스 알바레산",
    "nation": "스페인",
    "birthYear": 2003,
    "pos": "CAM",
    "club": "레반테 그라노타"
  },
  "lev-11": {
    "name": "야니스 무수아인",
    "nation": "벨기에",
    "birthYear": 2007,
    "pos": "LW",
    "club": "레반테 그라노타"
  },
  "lev-12": {
    "name": "매슈 라이어드",
    "nation": "호주",
    "birthYear": 1992,
    "pos": "GK",
    "club": "레반테 그라노타"
  },
  "lev-13": {
    "name": "호르헤 카베욘",
    "nation": "스페인",
    "birthYear": 2004,
    "pos": "RB",
    "club": "레반테 그라노타"
  },
  "lev-14": {
    "name": "빅토르 가르시안",
    "nation": "스페인",
    "birthYear": 1997,
    "pos": "RB",
    "club": "레반테 그라노타"
  },
  "lev-15": {
    "name": "엔조 바르델린",
    "nation": "프랑스",
    "birthYear": 2001,
    "pos": "CM",
    "club": "레반테 그라노타"
  },
  "lev-16": {
    "name": "오리올 레인",
    "nation": "스페인",
    "birthYear": 1998,
    "pos": "CDM",
    "club": "레반테 그라노타"
  },
  "lev-17": {
    "name": "카를 에타 에욘",
    "nation": "카메룬",
    "birthYear": 2003,
    "pos": "ST",
    "club": "레반테 그라노타"
  },
  "lev-18": {
    "name": "예레미 톨리안드",
    "nation": "독일",
    "birthYear": 1994,
    "pos": "RB",
    "club": "레반테 그라노타"
  },
  "lev-19": {
    "name": "마누 산체노",
    "nation": "스페인",
    "birthYear": 2000,
    "pos": "LB",
    "club": "레반테 그라노타"
  },
  "lev-20": {
    "name": "티아고 페르난데노",
    "nation": "아르헨티나",
    "birthYear": 2004,
    "pos": "CAM",
    "club": "레반테 그라노타"
  },
  "lev-21": {
    "name": "파코 코르테노",
    "nation": "스페인",
    "birthYear": 2007,
    "pos": "CM",
    "club": "레반테 그라노타"
  },
  "lev-22": {
    "name": "나초 페레노",
    "nation": "스페인",
    "birthYear": 2008,
    "pos": "CB",
    "club": "레반테 그라노타"
  },
  "lev-23": {
    "name": "알렉스 프리몬",
    "nation": "스페인",
    "birthYear": 2004,
    "pos": "GK",
    "club": "레반테 그라노타"
  },
  "mal-01": {
    "name": "알폰소 에레론",
    "nation": "스페인",
    "birthYear": 1994,
    "pos": "GK",
    "club": "말라가 보케론"
  },
  "mal-02": {
    "name": "옌스 카유스텐",
    "nation": "스웨덴",
    "birthYear": 1999,
    "pos": "CM",
    "club": "말라가 보케론"
  },
  "mal-03": {
    "name": "카를로스 푸간",
    "nation": "스페인",
    "birthYear": 2000,
    "pos": "RB",
    "club": "말라가 보케론"
  },
  "mal-04": {
    "name": "에이나르 갈릴레안",
    "nation": "스페인",
    "birthYear": 1994,
    "pos": "CB",
    "club": "말라가 보케론"
  },
  "mal-05": {
    "name": "알렉스 파스토른",
    "nation": "스페인",
    "birthYear": 1999,
    "pos": "CB",
    "club": "말라가 보케론"
  },
  "mal-06": {
    "name": "라모른",
    "nation": "스페인",
    "birthYear": 2001,
    "pos": "CDM",
    "club": "말라가 보케론"
  },
  "mal-07": {
    "name": "하이타름",
    "nation": "모로코",
    "birthYear": 2002,
    "pos": "RW",
    "club": "말라가 보케론"
  },
  "mal-08": {
    "name": "카를로스 도토른",
    "nation": "스페인",
    "birthYear": 2001,
    "pos": "CM",
    "club": "말라가 보케론"
  },
  "mal-09": {
    "name": "추페텐",
    "nation": "스페인",
    "birthYear": 2004,
    "pos": "ST",
    "club": "말라가 보케론"
  },
  "mal-10": {
    "name": "다비드 라루비안",
    "nation": "스페인",
    "birthYear": 2002,
    "pos": "CAM",
    "club": "말라가 보케론"
  },
  "mal-11": {
    "name": "호아킨 무뇨노",
    "nation": "스페인",
    "birthYear": 1999,
    "pos": "LW",
    "club": "말라가 보케론"
  },
  "mal-12": {
    "name": "호세 살리나노",
    "nation": "스페인",
    "birthYear": 2000,
    "pos": "LB",
    "club": "말라가 보케론"
  },
  "mal-13": {
    "name": "라파르",
    "nation": "스페인",
    "birthYear": 2003,
    "pos": "CM",
    "club": "말라가 보케론"
  },
  "mal-14": {
    "name": "앙헬 레시온",
    "nation": "스페인",
    "birthYear": 2003,
    "pos": "RB",
    "club": "말라가 보케론"
  },
  "mal-15": {
    "name": "디에고 무리욘",
    "nation": "스페인",
    "birthYear": 2001,
    "pos": "CB",
    "club": "말라가 보케론"
  },
  "mal-16": {
    "name": "에네코 하우레긴",
    "nation": "스페인",
    "birthYear": 1996,
    "pos": "ST",
    "club": "말라가 보케론"
  },
  "mal-17": {
    "name": "파블로 마르티네산",
    "nation": "스페인",
    "birthYear": 1998,
    "pos": "CM",
    "club": "말라가 보케론"
  },
  "mal-18": {
    "name": "후안 크루손",
    "nation": "스페인",
    "birthYear": 2000,
    "pos": "LW",
    "club": "말라가 보케론"
  },
  "mal-19": {
    "name": "페르난도 칼레론",
    "nation": "스페인",
    "birthYear": 1995,
    "pos": "CB",
    "club": "말라가 보케론"
  },
  "mal-20": {
    "name": "아드리안 니뇬",
    "nation": "스페인",
    "birthYear": 2004,
    "pos": "ST",
    "club": "말라가 보케론"
  },
  "mal-21": {
    "name": "다니 로렌손",
    "nation": "스페인",
    "birthYear": 2003,
    "pos": "CAM",
    "club": "말라가 보케론"
  },
  "mal-22": {
    "name": "이산 메리논",
    "nation": "스페인",
    "birthYear": 2006,
    "pos": "CM",
    "club": "말라가 보케론"
  },
  "mal-23": {
    "name": "훌렌 로베텐",
    "nation": "스페인",
    "birthYear": 2000,
    "pos": "LW",
    "club": "말라가 보케론"
  },
  "mal-24": {
    "name": "후안 베로칼라",
    "nation": "스페인",
    "birthYear": 1999,
    "pos": "CB",
    "club": "말라가 보케론"
  },
  "mal-25": {
    "name": "라피탄",
    "nation": "스페인",
    "birthYear": 2004,
    "pos": "RB",
    "club": "말라가 보케론"
  },
  "mal-26": {
    "name": "아론 오초안",
    "nation": "아일랜드",
    "birthYear": 2007,
    "pos": "CM",
    "club": "말라가 보케론"
  },
  "mal-27": {
    "name": "아담 아즈눈",
    "nation": "모로코",
    "birthYear": 2006,
    "pos": "LB",
    "club": "말라가 보케론"
  },
  "osa-01": {
    "name": "세르히오 에레란",
    "nation": "스페인",
    "birthYear": 1993,
    "pos": "GK",
    "club": "오사수나 로하"
  },
  "osa-02": {
    "name": "호르헤 에란돈",
    "nation": "스페인",
    "birthYear": 2001,
    "pos": "CB",
    "club": "오사수나 로하"
  },
  "osa-03": {
    "name": "루카스 토론",
    "nation": "스페인",
    "birthYear": 1994,
    "pos": "CDM",
    "club": "오사수나 로하"
  },
  "osa-04": {
    "name": "욘 몬카욜란",
    "nation": "스페인",
    "birthYear": 1998,
    "pos": "CM",
    "club": "오사수나 로하"
  },
  "osa-05": {
    "name": "이케르 무뇨노",
    "nation": "스페인",
    "birthYear": 2002,
    "pos": "CM",
    "club": "오사수나 로하"
  },
  "osa-06": {
    "name": "라울 가르시안",
    "nation": "스페인",
    "birthYear": 2000,
    "pos": "ST",
    "club": "오사수나 로하"
  },
  "osa-07": {
    "name": "아이마르 오로산",
    "nation": "스페인",
    "birthYear": 2001,
    "pos": "CAM",
    "club": "오사수나 로하"
  },
  "osa-08": {
    "name": "키케 바르한",
    "nation": "스페인",
    "birthYear": 1997,
    "pos": "LW",
    "club": "오사수나 로하"
  },
  "osa-09": {
    "name": "아이토르 페르난데노",
    "nation": "스페인",
    "birthYear": 1991,
    "pos": "GK",
    "club": "오사수나 로하"
  },
  "osa-10": {
    "name": "루벤 가르시안",
    "nation": "스페인",
    "birthYear": 1993,
    "pos": "RW",
    "club": "오사수나 로하"
  },
  "osa-11": {
    "name": "디에고 리콘",
    "nation": "스페인",
    "birthYear": 1993,
    "pos": "LB",
    "club": "오사수나 로하"
  },
  "osa-12": {
    "name": "모이 고메노",
    "nation": "스페인",
    "birthYear": 1994,
    "pos": "CAM",
    "club": "오사수나 로하"
  },
  "osa-13": {
    "name": "안테 부디미른",
    "nation": "크로아티아",
    "birthYear": 1991,
    "pos": "ST",
    "club": "오사수나 로하"
  },
  "osa-14": {
    "name": "라울 모론",
    "nation": "스페인",
    "birthYear": 2002,
    "pos": "LW",
    "club": "오사수나 로하"
  },
  "osa-15": {
    "name": "발랑탱 로지엔",
    "nation": "프랑스",
    "birthYear": 1996,
    "pos": "RB",
    "club": "오사수나 로하"
  },
  "osa-16": {
    "name": "조너선 두바생드",
    "nation": "벨기에",
    "birthYear": 2000,
    "pos": "CM",
    "club": "오사수나 로하"
  },
  "osa-17": {
    "name": "엔조 보요몬",
    "nation": "카메룬",
    "birthYear": 2001,
    "pos": "CB",
    "club": "오사수나 로하"
  },
  "osa-18": {
    "name": "아벨 브레토네노",
    "nation": "스페인",
    "birthYear": 2000,
    "pos": "LB",
    "club": "오사수나 로하"
  },
  "osa-19": {
    "name": "알레한드로 카테난",
    "nation": "스페인",
    "birthYear": 1994,
    "pos": "CB",
    "club": "오사수나 로하"
  },
  "osa-20": {
    "name": "이니고 아르기비덴",
    "nation": "스페인",
    "birthYear": 2005,
    "pos": "CB",
    "club": "오사수나 로하"
  },
  "osa-21": {
    "name": "아시에르 오삼벨란",
    "nation": "스페인",
    "birthYear": 2004,
    "pos": "CM",
    "club": "오사수나 로하"
  },
  "osa-22": {
    "name": "록슨 예보안",
    "nation": "가나",
    "birthYear": 2004,
    "pos": "CB",
    "club": "오사수나 로하"
  },
  "rac-01": {
    "name": "시몬 에릭슨드",
    "nation": "스웨덴",
    "birthYear": 2006,
    "pos": "GK",
    "club": "산탄데르 베르디블랑"
  },
  "rac-02": {
    "name": "알바로 만티얀",
    "nation": "스페인",
    "birthYear": 2000,
    "pos": "RB",
    "club": "산탄데르 베르디블랑"
  },
  "rac-03": {
    "name": "아론 마르티노",
    "nation": "스페인",
    "birthYear": 1997,
    "pos": "LB",
    "club": "산탄데르 베르디블랑"
  },
  "rac-04": {
    "name": "마누 에르난돈",
    "nation": "스페인",
    "birthYear": 1998,
    "pos": "CB",
    "club": "산탄데르 베르디블랑"
  },
  "rac-05": {
    "name": "파블로 라모른",
    "nation": "스페인",
    "birthYear": 2001,
    "pos": "CB",
    "club": "산탄데르 베르디블랑"
  },
  "rac-06": {
    "name": "이니고 사인스마산",
    "nation": "스페인",
    "birthYear": 1998,
    "pos": "CDM",
    "club": "산탄데르 베르디블랑"
  },
  "rac-07": {
    "name": "기오르기 굴리아시빌린",
    "nation": "조지아",
    "birthYear": 2001,
    "pos": "RW",
    "club": "산탄데르 베르디블랑"
  },
  "rac-08": {
    "name": "안드레 알메이단",
    "nation": "포르투갈",
    "birthYear": 2000,
    "pos": "CM",
    "club": "산탄데르 베르디블랑"
  },
  "rac-09": {
    "name": "후안 카를로스 아라난",
    "nation": "스페인",
    "birthYear": 2000,
    "pos": "ST",
    "club": "산탄데르 베르디블랑"
  },
  "rac-10": {
    "name": "이니고 비센텐",
    "nation": "스페인",
    "birthYear": 1998,
    "pos": "CAM",
    "club": "산탄데르 베르디블랑"
  },
  "rac-11": {
    "name": "안드레스 마르티노",
    "nation": "스페인",
    "birthYear": 1999,
    "pos": "RW",
    "club": "산탄데르 베르디블랑"
  },
  "rac-12": {
    "name": "아시에르 비야리브렌",
    "nation": "스페인",
    "birthYear": 1997,
    "pos": "ST",
    "club": "산탄데르 베르디블랑"
  },
  "rac-13": {
    "name": "훌렌 아기레사발란",
    "nation": "스페인",
    "birthYear": 2000,
    "pos": "GK",
    "club": "산탄데르 베르디블랑"
  },
  "rac-14": {
    "name": "마게트 게옌",
    "nation": "세네갈",
    "birthYear": 2002,
    "pos": "CDM",
    "club": "산탄데르 베르디블랑"
  },
  "rac-15": {
    "name": "파블로 가르시안",
    "nation": "스페인",
    "birthYear": 2006,
    "pos": "LW",
    "club": "산탄데르 베르디블랑"
  },
  "rac-16": {
    "name": "파쿤도 곤살레노",
    "nation": "우루과이",
    "birthYear": 2003,
    "pos": "CB",
    "club": "산탄데르 베르디블랑"
  },
  "rac-17": {
    "name": "호르헤 살리나노",
    "nation": "스페인",
    "birthYear": 2007,
    "pos": "RB",
    "club": "산탄데르 베르디블랑"
  },
  "rac-18": {
    "name": "마테오 프라틴",
    "nation": "이탈리아",
    "birthYear": 2003,
    "pos": "CM",
    "club": "산탄데르 베르디블랑"
  },
  "rac-19": {
    "name": "이케르 루켄",
    "nation": "스페인",
    "birthYear": 2005,
    "pos": "ST",
    "club": "산탄데르 베르디블랑"
  },
  "rac-20": {
    "name": "세르히오 카날레노",
    "nation": "스페인",
    "birthYear": 1991,
    "pos": "CAM",
    "club": "산탄데르 베르디블랑"
  },
  "rac-21": {
    "name": "야시르 자비린",
    "nation": "모로코",
    "birthYear": 2005,
    "pos": "ST",
    "club": "산탄데르 베르디블랑"
  },
  "rac-22": {
    "name": "페드로 펠리펜",
    "nation": "브라질",
    "birthYear": 2004,
    "pos": "CB",
    "club": "산탄데르 베르디블랑"
  },
  "rac-23": {
    "name": "이반 마르티노",
    "nation": "스페인",
    "birthYear": 1999,
    "pos": "CM",
    "club": "산탄데르 베르디블랑"
  },
  "rac-24": {
    "name": "자뉘엘 벨로시안드",
    "nation": "프랑스",
    "birthYear": 2005,
    "pos": "CB",
    "club": "산탄데르 베르디블랑"
  },
  "ray-01": {
    "name": "다니 카르데나노",
    "nation": "스페인",
    "birthYear": 1997,
    "pos": "GK",
    "club": "라요 프랑코"
  },
  "ray-02": {
    "name": "안드레이 라치운",
    "nation": "루마니아",
    "birthYear": 1998,
    "pos": "RB",
    "club": "라요 프랑코"
  },
  "ray-03": {
    "name": "마라시 쿰불란",
    "nation": "알바니아",
    "birthYear": 2000,
    "pos": "CB",
    "club": "라요 프랑코"
  },
  "ray-04": {
    "name": "페드로 디아노",
    "nation": "스페인",
    "birthYear": 1998,
    "pos": "CM",
    "club": "라요 프랑코"
  },
  "ray-05": {
    "name": "루이스 펠리펜",
    "nation": "이탈리아",
    "birthYear": 1997,
    "pos": "CB",
    "club": "라요 프랑코"
  },
  "ray-06": {
    "name": "파테 시손",
    "nation": "세네갈",
    "birthYear": 1994,
    "pos": "CDM",
    "club": "라요 프랑코"
  },
  "ray-07": {
    "name": "이시 팔라손드",
    "nation": "스페인",
    "birthYear": 1994,
    "pos": "RW",
    "club": "라요 프랑코"
  },
  "ray-08": {
    "name": "우나이 로페노",
    "nation": "스페인",
    "birthYear": 1995,
    "pos": "CM",
    "club": "라요 프랑코"
  },
  "ray-09": {
    "name": "알레망드",
    "nation": "브라질",
    "birthYear": 1998,
    "pos": "ST",
    "club": "라요 프랑코"
  },
  "ray-10": {
    "name": "세르히오 카메욘",
    "nation": "스페인",
    "birthYear": 2001,
    "pos": "ST",
    "club": "라요 프랑코"
  },
  "ray-11": {
    "name": "랜디 은테칸",
    "nation": "앙골라",
    "birthYear": 1997,
    "pos": "LW",
    "club": "라요 프랑코"
  },
  "ray-12": {
    "name": "아우구스토 바탈란",
    "nation": "아르헨티나",
    "birthYear": 1996,
    "pos": "GK",
    "club": "라요 프랑코"
  },
  "ray-13": {
    "name": "기오르기 치타이시빌린",
    "nation": "조지아",
    "birthYear": 2000,
    "pos": "CAM",
    "club": "라요 프랑코"
  },
  "ray-14": {
    "name": "아드리아 페드로산",
    "nation": "스페인",
    "birthYear": 1998,
    "pos": "LB",
    "club": "라요 프랑코"
  },
  "ray-15": {
    "name": "알바로 가르시안",
    "nation": "스페인",
    "birthYear": 1992,
    "pos": "LW",
    "club": "라요 프랑코"
  },
  "ray-16": {
    "name": "호르헤 데 프루토노",
    "nation": "스페인",
    "birthYear": 1997,
    "pos": "RW",
    "club": "라요 프랑코"
  },
  "ray-17": {
    "name": "이반 발리운",
    "nation": "알바니아",
    "birthYear": 1992,
    "pos": "RB",
    "club": "라요 프랑코"
  },
  "ray-18": {
    "name": "프란 페레노",
    "nation": "스페인",
    "birthYear": 2002,
    "pos": "RW",
    "club": "라요 프랑코"
  },
  "ray-19": {
    "name": "펠라요 페르난데노",
    "nation": "스페인",
    "birthYear": 2003,
    "pos": "CB",
    "club": "라요 프랑코"
  },
  "ray-20": {
    "name": "오스카르 발렌티노",
    "nation": "스페인",
    "birthYear": 1994,
    "pos": "CDM",
    "club": "라요 프랑코"
  },
  "ray-21": {
    "name": "플로리안 르죄른",
    "nation": "프랑스",
    "birthYear": 1991,
    "pos": "CB",
    "club": "라요 프랑코"
  },
  "ray-22": {
    "name": "조주아 페르트라우트르",
    "nation": "네덜란드",
    "birthYear": 2004,
    "pos": "CB",
    "club": "라요 프랑코"
  },
  "ray-23": {
    "name": "낭고로 부아렌",
    "nation": "스페인",
    "birthYear": 2004,
    "pos": "CM",
    "club": "라요 프랑코"
  },
  "bet-01": {
    "name": "알바로 바예노",
    "nation": "스페인",
    "birthYear": 1997,
    "pos": "GK",
    "club": "베티스 베르데"
  },
  "bet-02": {
    "name": "엑토르 베예리노",
    "nation": "스페인",
    "birthYear": 1995,
    "pos": "RB",
    "club": "베티스 베르데"
  },
  "bet-03": {
    "name": "디에고 요렌토",
    "nation": "스페인",
    "birthYear": 1993,
    "pos": "CB",
    "club": "베티스 베르데"
  },
  "bet-04": {
    "name": "나타른",
    "nation": "브라질",
    "birthYear": 2001,
    "pos": "CB",
    "club": "베티스 베르데"
  },
  "bet-05": {
    "name": "마르크 바르트란",
    "nation": "스페인",
    "birthYear": 1991,
    "pos": "CB",
    "club": "베티스 베르데"
  },
  "bet-06": {
    "name": "파쿤도 베르날라",
    "nation": "우루과이",
    "birthYear": 2003,
    "pos": "CDM",
    "club": "베티스 베르데"
  },
  "bet-07": {
    "name": "안토닌",
    "nation": "브라질",
    "birthYear": 2000,
    "pos": "RW",
    "club": "베티스 베르데"
  },
  "bet-08": {
    "name": "파블로 포르날손",
    "nation": "스페인",
    "birthYear": 1996,
    "pos": "CM",
    "club": "베티스 베르데"
  },
  "bet-09": {
    "name": "쿠초 에르난데노",
    "nation": "콜롬비아",
    "birthYear": 1999,
    "pos": "ST",
    "club": "베티스 베르데"
  },
  "bet-10": {
    "name": "압데 에살술린",
    "nation": "모로코",
    "birthYear": 2001,
    "pos": "LW",
    "club": "베티스 베르데"
  },
  "bet-11": {
    "name": "프란 가르시안",
    "nation": "스페인",
    "birthYear": 1999,
    "pos": "LB",
    "club": "베티스 베르데"
  },
  "bet-12": {
    "name": "앙헬 오르티노",
    "nation": "스페인",
    "birthYear": 2004,
    "pos": "RB",
    "club": "베티스 베르데"
  },
  "bet-13": {
    "name": "디에고 콘덴",
    "nation": "스페인",
    "birthYear": 1998,
    "pos": "GK",
    "club": "베티스 베르데"
  },
  "bet-14": {
    "name": "이케르 로사단",
    "nation": "스페인",
    "birthYear": 2001,
    "pos": "LW",
    "club": "베티스 베르데"
  },
  "bet-15": {
    "name": "알바로 피달곤",
    "nation": "멕시코",
    "birthYear": 1997,
    "pos": "CM",
    "club": "베티스 베르데"
  },
  "bet-16": {
    "name": "발렌틴 고메노",
    "nation": "아르헨티나",
    "birthYear": 2003,
    "pos": "CB",
    "club": "베티스 베르데"
  },
  "bet-17": {
    "name": "로드리고 리켈멘",
    "nation": "스페인",
    "birthYear": 2000,
    "pos": "RW",
    "club": "베티스 베르데"
  },
  "bet-18": {
    "name": "넬손 데오산",
    "nation": "콜롬비아",
    "birthYear": 2000,
    "pos": "CM",
    "club": "베티스 베르데"
  },
  "bet-19": {
    "name": "트로이 패러트",
    "nation": "아일랜드",
    "birthYear": 2002,
    "pos": "ST",
    "club": "베티스 베르데"
  },
  "bet-20": {
    "name": "조반니 로 셀손",
    "nation": "아르헨티나",
    "birthYear": 1996,
    "pos": "CAM",
    "club": "베티스 베르데"
  },
  "bet-21": {
    "name": "마르크 로칸",
    "nation": "스페인",
    "birthYear": 1996,
    "pos": "CDM",
    "club": "베티스 베르데"
  },
  "bet-22": {
    "name": "이스콘",
    "nation": "스페인",
    "birthYear": 1992,
    "pos": "CAM",
    "club": "베티스 베르데"
  },
  "bet-23": {
    "name": "주니오르 피르폰",
    "nation": "도미니카공화국",
    "birthYear": 1996,
    "pos": "LB",
    "club": "베티스 베르데"
  },
  "bet-24": {
    "name": "아이토르 루이발라",
    "nation": "스페인",
    "birthYear": 1996,
    "pos": "RW",
    "club": "베티스 베르데"
  },
  "bet-25": {
    "name": "다니 세바요노",
    "nation": "스페인",
    "birthYear": 1996,
    "pos": "CM",
    "club": "베티스 베르데"
  },
  "rma-01": {
    "name": "티보 쿠르투안",
    "nation": "벨기에",
    "birthYear": 1992,
    "pos": "GK",
    "club": "마드리드 블랑코"
  },
  "rma-02": {
    "name": "라울 아센시온",
    "nation": "스페인",
    "birthYear": 2003,
    "pos": "CB",
    "club": "마드리드 블랑코"
  },
  "rma-03": {
    "name": "에데르 밀리당",
    "nation": "브라질",
    "birthYear": 1998,
    "pos": "CB",
    "club": "마드리드 블랑코"
  },
  "rma-04": {
    "name": "딘 하위섬",
    "nation": "스페인",
    "birthYear": 2005,
    "pos": "CB",
    "club": "마드리드 블랑코"
  },
  "rma-05": {
    "name": "주드 벨링험",
    "nation": "잉글랜드",
    "birthYear": 2003,
    "pos": "CAM",
    "club": "마드리드 블랑코"
  },
  "rma-06": {
    "name": "에두아르도 카마빙간",
    "nation": "프랑스",
    "birthYear": 2002,
    "pos": "CM",
    "club": "마드리드 블랑코"
  },
  "rma-07": {
    "name": "비니시우스 주니오른",
    "nation": "브라질",
    "birthYear": 2000,
    "pos": "LW",
    "club": "마드리드 블랑코"
  },
  "rma-08": {
    "name": "페데리코 발베르덴",
    "nation": "우루과이",
    "birthYear": 1998,
    "pos": "CM",
    "club": "마드리드 블랑코"
  },
  "rma-09": {
    "name": "엔드리코",
    "nation": "브라질",
    "birthYear": 2006,
    "pos": "ST",
    "club": "마드리드 블랑코"
  },
  "rma-10": {
    "name": "킬리안 음바펜",
    "nation": "프랑스",
    "birthYear": 1998,
    "pos": "ST",
    "club": "마드리드 블랑코"
  },
  "rma-11": {
    "name": "호드리군",
    "nation": "브라질",
    "birthYear": 2001,
    "pos": "RW",
    "club": "마드리드 블랑코"
  },
  "rma-12": {
    "name": "트렌트 알렉산더아널든",
    "nation": "잉글랜드",
    "birthYear": 1998,
    "pos": "RB",
    "club": "마드리드 블랑코"
  },
  "rma-13": {
    "name": "안드리 루니르",
    "nation": "우크라이나",
    "birthYear": 1999,
    "pos": "GK",
    "club": "마드리드 블랑코"
  },
  "rma-14": {
    "name": "오렐리앵 추아메닌",
    "nation": "프랑스",
    "birthYear": 2000,
    "pos": "CDM",
    "club": "마드리드 블랑코"
  },
  "rma-15": {
    "name": "아르다 귈레른",
    "nation": "튀르키예",
    "birthYear": 2005,
    "pos": "CAM",
    "club": "마드리드 블랑코"
  },
  "rma-16": {
    "name": "이브라히마 코나텐",
    "nation": "프랑스",
    "birthYear": 1999,
    "pos": "CB",
    "club": "마드리드 블랑코"
  },
  "rma-17": {
    "name": "마르크 쿠쿠레얀",
    "nation": "스페인",
    "birthYear": 1998,
    "pos": "LB",
    "club": "마드리드 블랑코"
  },
  "rma-18": {
    "name": "알바로 카레라노",
    "nation": "스페인",
    "birthYear": 2003,
    "pos": "LB",
    "club": "마드리드 블랑코"
  },
  "rma-19": {
    "name": "카를로스 에스핀",
    "nation": "스페인",
    "birthYear": 2005,
    "pos": "ST",
    "club": "마드리드 블랑코"
  },
  "rma-20": {
    "name": "베르나르두 실반",
    "nation": "포르투갈",
    "birthYear": 1994,
    "pos": "RW",
    "club": "마드리드 블랑코"
  },
  "rma-21": {
    "name": "브라힘 디아노",
    "nation": "모로코",
    "birthYear": 1999,
    "pos": "RW",
    "club": "마드리드 블랑코"
  },
  "rma-22": {
    "name": "안토니오 뤼디건",
    "nation": "독일",
    "birthYear": 1993,
    "pos": "CB",
    "club": "마드리드 블랑코"
  },
  "rma-23": {
    "name": "페를랑 멘딘",
    "nation": "프랑스",
    "birthYear": 1995,
    "pos": "LB",
    "club": "마드리드 블랑코"
  },
  "rma-24": {
    "name": "덴젤 뒴프리손",
    "nation": "네덜란드",
    "birthYear": 1996,
    "pos": "RB",
    "club": "마드리드 블랑코"
  },
  "rma-25": {
    "name": "얀 디오망덴",
    "nation": "코트디부아르",
    "birthYear": 2006,
    "pos": "RW",
    "club": "마드리드 블랑코"
  },
  "rma-26": {
    "name": "티아고 피타르친",
    "nation": "스페인",
    "birthYear": 2007,
    "pos": "CM",
    "club": "마드리드 블랑코"
  },
  "rso-01": {
    "name": "알렉스 레미론",
    "nation": "스페인",
    "birthYear": 1995,
    "pos": "GK",
    "club": "도노스티 추리우르딘"
  },
  "rso-02": {
    "name": "욘 아람부룬",
    "nation": "베네수엘라",
    "birthYear": 2002,
    "pos": "RB",
    "club": "도노스티 추리우르딘"
  },
  "rso-03": {
    "name": "아이엔 무뇨노",
    "nation": "스페인",
    "birthYear": 1997,
    "pos": "LB",
    "club": "도노스티 추리우르딘"
  },
  "rso-04": {
    "name": "욘 고로차테긴",
    "nation": "스페인",
    "birthYear": 2002,
    "pos": "CM",
    "club": "도노스티 추리우르딘"
  },
  "rso-05": {
    "name": "이고르 수벨디안",
    "nation": "스페인",
    "birthYear": 1997,
    "pos": "CB",
    "club": "도노스티 추리우르딘"
  },
  "rso-06": {
    "name": "욘 마르티노",
    "nation": "스페인",
    "birthYear": 2006,
    "pos": "CB",
    "club": "도노스티 추리우르딘"
  },
  "rso-07": {
    "name": "안데르 바레네체안",
    "nation": "스페인",
    "birthYear": 2001,
    "pos": "LW",
    "club": "도노스티 추리우르딘"
  },
  "rso-08": {
    "name": "베냐트 투리엔테노",
    "nation": "스페인",
    "birthYear": 2002,
    "pos": "CM",
    "club": "도노스티 추리우르딘"
  },
  "rso-09": {
    "name": "오리 오스카르손드",
    "nation": "아이슬란드",
    "birthYear": 2004,
    "pos": "ST",
    "club": "도노스티 추리우르딘"
  },
  "rso-10": {
    "name": "미켈 오야르사발라",
    "nation": "스페인",
    "birthYear": 1997,
    "pos": "ST",
    "club": "도노스티 추리우르딘"
  },
  "rso-11": {
    "name": "곤살루 게데노",
    "nation": "포르투갈",
    "birthYear": 1996,
    "pos": "LW",
    "club": "도노스티 추리우르딘"
  },
  "rso-12": {
    "name": "잡 오치엥그",
    "nation": "케냐",
    "birthYear": 2003,
    "pos": "RW",
    "club": "도노스티 추리우르딘"
  },
  "rso-13": {
    "name": "우나이 마레론",
    "nation": "스페인",
    "birthYear": 2001,
    "pos": "GK",
    "club": "도노스티 추리우르딘"
  },
  "rso-14": {
    "name": "쿠보 다케후산",
    "nation": "일본",
    "birthYear": 2001,
    "pos": "RW",
    "club": "도노스티 추리우르딘"
  },
  "rso-15": {
    "name": "파블로 마리노",
    "nation": "스페인",
    "birthYear": 2003,
    "pos": "CM",
    "club": "도노스티 추리우르딘"
  },
  "rso-16": {
    "name": "욘 파체콘",
    "nation": "스페인",
    "birthYear": 2001,
    "pos": "CB",
    "club": "도노스티 추리우르딘"
  },
  "rso-17": {
    "name": "세르히오 고메노",
    "nation": "스페인",
    "birthYear": 2000,
    "pos": "LM",
    "club": "도노스티 추리우르딘"
  },
  "rso-18": {
    "name": "카를로스 솔레른",
    "nation": "스페인",
    "birthYear": 1997,
    "pos": "CM",
    "club": "도노스티 추리우르딘"
  },
  "rso-19": {
    "name": "마마두 사른",
    "nation": "세네갈",
    "birthYear": 2005,
    "pos": "CB",
    "club": "도노스티 추리우르딘"
  },
  "rso-20": {
    "name": "알바로 오드리오솔란",
    "nation": "스페인",
    "birthYear": 1995,
    "pos": "RB",
    "club": "도노스티 추리우르딘"
  },
  "rso-21": {
    "name": "양헬 에레란",
    "nation": "베네수엘라",
    "birthYear": 1998,
    "pos": "CDM",
    "club": "도노스티 추리우르딘"
  },
  "rso-22": {
    "name": "엑토르 포르타",
    "nation": "스페인",
    "birthYear": 2006,
    "pos": "RB",
    "club": "도노스티 추리우르딘"
  },
  "rso-23": {
    "name": "아르센 자하리안드",
    "nation": "러시아",
    "birthYear": 2003,
    "pos": "CAM",
    "club": "도노스티 추리우르딘"
  },
  "rso-24": {
    "name": "루카 수치츠",
    "nation": "크로아티아",
    "birthYear": 2002,
    "pos": "CM",
    "club": "도노스티 추리우르딘"
  },
  "sev-01": {
    "name": "오디세아스 블라호디모노",
    "nation": "그리스",
    "birthYear": 1994,
    "pos": "GK",
    "club": "세비야 로호"
  },
  "sev-02": {
    "name": "후안 이글레시아노",
    "nation": "스페인",
    "birthYear": 1998,
    "pos": "RB",
    "club": "세비야 로호"
  },
  "sev-03": {
    "name": "훌리오 디아노",
    "nation": "스페인",
    "birthYear": 2005,
    "pos": "LB",
    "club": "세비야 로호"
  },
  "sev-04": {
    "name": "키케 살라노",
    "nation": "스페인",
    "birthYear": 2002,
    "pos": "CB",
    "club": "세비야 로호"
  },
  "sev-05": {
    "name": "안드레스 카스트리노",
    "nation": "스페인",
    "birthYear": 2003,
    "pos": "CB",
    "club": "세비야 로호"
  },
  "sev-06": {
    "name": "뤼시앵 아구멘",
    "nation": "프랑스",
    "birthYear": 2002,
    "pos": "CDM",
    "club": "세비야 로호"
  },
  "sev-07": {
    "name": "알폰 곤살레노",
    "nation": "스페인",
    "birthYear": 1999,
    "pos": "LW",
    "club": "세비야 로호"
  },
  "sev-08": {
    "name": "기오르기 코초라시빌린",
    "nation": "조지아",
    "birthYear": 1999,
    "pos": "CM",
    "club": "세비야 로호"
  },
  "sev-09": {
    "name": "로비 유언",
    "nation": "스코틀랜드",
    "birthYear": 2004,
    "pos": "ST",
    "club": "세비야 로호"
  },
  "sev-10": {
    "name": "페케 페르난데노",
    "nation": "스페인",
    "birthYear": 2002,
    "pos": "CAM",
    "club": "세비야 로호"
  },
  "sev-11": {
    "name": "루벤 바르가노",
    "nation": "스위스",
    "birthYear": 1998,
    "pos": "LW",
    "club": "세비야 로호"
  },
  "sev-12": {
    "name": "아루나 상간텐",
    "nation": "세네갈",
    "birthYear": 2002,
    "pos": "CB",
    "club": "세비야 로호"
  },
  "sev-13": {
    "name": "프란 곤살레산",
    "nation": "스페인",
    "birthYear": 2005,
    "pos": "GK",
    "club": "세비야 로호"
  },
  "sev-14": {
    "name": "마누 부에논",
    "nation": "스페인",
    "birthYear": 2004,
    "pos": "CM",
    "club": "세비야 로호"
  },
  "sev-15": {
    "name": "이사크 로메론",
    "nation": "스페인",
    "birthYear": 2000,
    "pos": "ST",
    "club": "세비야 로호"
  },
  "sev-16": {
    "name": "가브리엘 수아손",
    "nation": "칠레",
    "birthYear": 1997,
    "pos": "LB",
    "club": "세비야 로호"
  },
  "sev-17": {
    "name": "욘 구리딘",
    "nation": "스페인",
    "birthYear": 1995,
    "pos": "CM",
    "club": "세비야 로호"
  },
  "sev-18": {
    "name": "루카스 스타생드",
    "nation": "벨기에",
    "birthYear": 2004,
    "pos": "ST",
    "club": "세비야 로호"
  },
  "sev-19": {
    "name": "펠릭스 코헤이안",
    "nation": "포르투갈",
    "birthYear": 2001,
    "pos": "RW",
    "club": "세비야 로호"
  },
  "sev-20": {
    "name": "치데라 에주켄",
    "nation": "나이지리아",
    "birthYear": 1998,
    "pos": "LW",
    "club": "세비야 로호"
  },
  "sev-21": {
    "name": "호세 앙헬 카르모난",
    "nation": "스페인",
    "birthYear": 2002,
    "pos": "RB",
    "club": "세비야 로호"
  },
  "sev-22": {
    "name": "마르캉드",
    "nation": "브라질",
    "birthYear": 1996,
    "pos": "CB",
    "club": "세비야 로호"
  },
  "sev-23": {
    "name": "유수프 포파난",
    "nation": "프랑스",
    "birthYear": 1999,
    "pos": "CDM",
    "club": "세비야 로호"
  },
  "sev-24": {
    "name": "니코 기옌드",
    "nation": "스페인",
    "birthYear": 2008,
    "pos": "CM",
    "club": "세비야 로호"
  },
  "sev-25": {
    "name": "미겔 시에란",
    "nation": "스페인",
    "birthYear": 2004,
    "pos": "RW",
    "club": "세비야 로호"
  },
  "val-01": {
    "name": "스톨레 디미트리에프스킨",
    "nation": "북마케도니아",
    "birthYear": 1993,
    "pos": "GK",
    "club": "발렌시아 무르시엘"
  },
  "val-02": {
    "name": "기도 로드리게노",
    "nation": "아르헨티나",
    "birthYear": 1994,
    "pos": "CDM",
    "club": "발렌시아 무르시엘"
  },
  "val-03": {
    "name": "호세 코페텐",
    "nation": "스페인",
    "birthYear": 1999,
    "pos": "CB",
    "club": "발렌시아 무르시엘"
  },
  "val-04": {
    "name": "무크타르 디아카빈",
    "nation": "기니",
    "birthYear": 1996,
    "pos": "CB",
    "club": "발렌시아 무르시엘"
  },
  "val-05": {
    "name": "세사르 타레간",
    "nation": "스페인",
    "birthYear": 2002,
    "pos": "CB",
    "club": "발렌시아 무르시엘"
  },
  "val-06": {
    "name": "우마르 사디큰",
    "nation": "나이지리아",
    "birthYear": 1997,
    "pos": "ST",
    "club": "발렌시아 무르시엘"
  },
  "val-07": {
    "name": "아르나우트 단주만",
    "nation": "네덜란드",
    "birthYear": 1997,
    "pos": "LW",
    "club": "발렌시아 무르시엘"
  },
  "val-08": {
    "name": "하비 게란",
    "nation": "스페인",
    "birthYear": 2003,
    "pos": "CM",
    "club": "발렌시아 무르시엘"
  },
  "val-09": {
    "name": "우고 두론",
    "nation": "스페인",
    "birthYear": 1999,
    "pos": "ST",
    "club": "발렌시아 무르시엘"
  },
  "val-10": {
    "name": "하비 엘리어트",
    "nation": "잉글랜드",
    "birthYear": 2003,
    "pos": "CAM",
    "club": "발렌시아 무르시엘"
  },
  "val-11": {
    "name": "루이스 리오한",
    "nation": "스페인",
    "birthYear": 1993,
    "pos": "LW",
    "club": "발렌시아 무르시엘"
  },
  "val-12": {
    "name": "유스틴 더 하손",
    "nation": "네덜란드",
    "birthYear": 2000,
    "pos": "RB",
    "club": "발렌시아 무르시엘"
  },
  "val-13": {
    "name": "크리스티안 리베론",
    "nation": "스페인",
    "birthYear": 1998,
    "pos": "GK",
    "club": "발렌시아 무르시엘"
  },
  "val-14": {
    "name": "호세 가얀",
    "nation": "스페인",
    "birthYear": 1995,
    "pos": "LB",
    "club": "발렌시아 무르시엘"
  },
  "val-15": {
    "name": "알리우 디엥그",
    "nation": "말리",
    "birthYear": 1997,
    "pos": "CDM",
    "club": "발렌시아 무르시엘"
  },
  "val-16": {
    "name": "디에고 로페노",
    "nation": "스페인",
    "birthYear": 2002,
    "pos": "RW",
    "club": "발렌시아 무르시엘"
  },
  "val-17": {
    "name": "페펠룬",
    "nation": "스페인",
    "birthYear": 1998,
    "pos": "CM",
    "club": "발렌시아 무르시엘"
  },
  "val-18": {
    "name": "다니 라반",
    "nation": "스페인",
    "birthYear": 1995,
    "pos": "RW",
    "club": "발렌시아 무르시엘"
  },
  "val-19": {
    "name": "디미트리 풀키엔",
    "nation": "과들루프",
    "birthYear": 1993,
    "pos": "RB",
    "club": "발렌시아 무르시엘"
  },
  "val-20": {
    "name": "헤수스 바스케노",
    "nation": "스페인",
    "birthYear": 2003,
    "pos": "LB",
    "club": "발렌시아 무르시엘"
  },
  "val-21": {
    "name": "아르나우 마르티네노",
    "nation": "스페인",
    "birthYear": 2003,
    "pos": "RB",
    "club": "발렌시아 무르시엘"
  },
  "val-22": {
    "name": "필리프 우그리니츠",
    "nation": "스위스",
    "birthYear": 1999,
    "pos": "CM",
    "club": "발렌시아 무르시엘"
  },
  "val-23": {
    "name": "파블로 마페온",
    "nation": "아르헨티나",
    "birthYear": 1997,
    "pos": "CB",
    "club": "발렌시아 무르시엘"
  },
  "val-24": {
    "name": "카이너 판 오벌른",
    "nation": "네덜란드",
    "birthYear": 2003,
    "pos": "GK",
    "club": "발렌시아 무르시엘"
  },
  "val-25": {
    "name": "사토 류노스켄",
    "nation": "일본",
    "birthYear": 2006,
    "pos": "CAM",
    "club": "발렌시아 무르시엘"
  },
  "vil-01": {
    "name": "루이스 주니오른",
    "nation": "브라질",
    "birthYear": 2001,
    "pos": "GK",
    "club": "비야레 수브마리노"
  },
  "vil-02": {
    "name": "로강 코스탄",
    "nation": "카보베르데",
    "birthYear": 2001,
    "pos": "CB",
    "club": "비야레 수브마리노"
  },
  "vil-03": {
    "name": "알렉스 프리먼드",
    "nation": "미국",
    "birthYear": 2004,
    "pos": "RB",
    "club": "비야레 수브마리노"
  },
  "vil-04": {
    "name": "알라산 디아탄",
    "nation": "세네갈",
    "birthYear": 2005,
    "pos": "CDM",
    "club": "비야레 수브마리노"
  },
  "vil-05": {
    "name": "파우 나바론",
    "nation": "스페인",
    "birthYear": 2005,
    "pos": "CB",
    "club": "비야레 수브마리노"
  },
  "vil-06": {
    "name": "제라르드 모레논",
    "nation": "스페인",
    "birthYear": 1992,
    "pos": "ST",
    "club": "비야레 수브마리노"
  },
  "vil-07": {
    "name": "후안 포이손",
    "nation": "아르헨티나",
    "birthYear": 1998,
    "pos": "CB",
    "club": "비야레 수브마리노"
  },
  "vil-08": {
    "name": "조르제스 미카우타젠",
    "nation": "조지아",
    "birthYear": 2000,
    "pos": "ST",
    "club": "비야레 수브마리노"
  },
  "vil-09": {
    "name": "알베르토 몰레이론",
    "nation": "스페인",
    "birthYear": 2003,
    "pos": "CAM",
    "club": "비야레 수브마리노"
  },
  "vil-10": {
    "name": "일리아스 아코마친",
    "nation": "모로코",
    "birthYear": 2004,
    "pos": "RW",
    "club": "비야레 수브마리노"
  },
  "vil-11": {
    "name": "레나투 베이간",
    "nation": "포르투갈",
    "birthYear": 2003,
    "pos": "CB",
    "club": "비야레 수브마리노"
  },
  "vil-12": {
    "name": "루벤 고메노",
    "nation": "스페인",
    "birthYear": 2002,
    "pos": "GK",
    "club": "비야레 수브마리노"
  },
  "vil-13": {
    "name": "산티 코메사뇬",
    "nation": "스페인",
    "birthYear": 1996,
    "pos": "CM",
    "club": "비야레 수브마리노"
  },
  "vil-14": {
    "name": "산티아고 모우리뇬",
    "nation": "우루과이",
    "birthYear": 2002,
    "pos": "CB",
    "club": "비야레 수브마리노"
  },
  "vil-15": {
    "name": "카를로스 마시안",
    "nation": "스페인",
    "birthYear": 2008,
    "pos": "CM",
    "club": "비야레 수브마리노"
  },
  "vil-16": {
    "name": "타종 뷰캐넌드",
    "nation": "캐나다",
    "birthYear": 1999,
    "pos": "RW",
    "club": "비야레 수브마리노"
  },
  "vil-17": {
    "name": "파페 게옌드",
    "nation": "세네갈",
    "birthYear": 1999,
    "pos": "CDM",
    "club": "비야레 수브마리노"
  },
  "vil-18": {
    "name": "니콜라 페펜",
    "nation": "코트디부아르",
    "birthYear": 1995,
    "pos": "RW",
    "club": "비야레 수브마리노"
  },
  "vil-19": {
    "name": "카를로스 로메론",
    "nation": "스페인",
    "birthYear": 2001,
    "pos": "LB",
    "club": "비야레 수브마리노"
  },
  "vil-20": {
    "name": "타니 올루와세인",
    "nation": "캐나다",
    "birthYear": 2000,
    "pos": "ST",
    "club": "비야레 수브마리노"
  },
  "vil-21": {
    "name": "아요세 페레노",
    "nation": "스페인",
    "birthYear": 1993,
    "pos": "CAM",
    "club": "비야레 수브마리노"
  },
  "vil-22": {
    "name": "세르지 카르도난",
    "nation": "스페인",
    "birthYear": 1999,
    "pos": "LB",
    "club": "비야레 수브마리노"
  },
  "vil-23": {
    "name": "네이선 살리반",
    "nation": "캐나다",
    "birthYear": 2004,
    "pos": "CM",
    "club": "비야레 수브마리노"
  },
  "vil-24": {
    "name": "페테르 굴라친",
    "nation": "헝가리",
    "birthYear": 1990,
    "pos": "GK",
    "club": "비야레 수브마리노"
  },
  "ang-01": {
    "name": "안토니 로페손",
    "nation": "포르투갈",
    "birthYear": 1990,
    "pos": "GK",
    "club": "앙제 SCO"
  },
  "ang-02": {
    "name": "카를랑스 아르퀴손",
    "nation": "아이티",
    "birthYear": 1996,
    "pos": "RB",
    "club": "앙제 SCO"
  },
  "ang-03": {
    "name": "우스만 카마란",
    "nation": "말리",
    "birthYear": 2003,
    "pos": "CB",
    "club": "앙제 SCO"
  },
  "ang-04": {
    "name": "루이 무통드",
    "nation": "프랑스",
    "birthYear": 2002,
    "pos": "CM",
    "club": "앙제 SCO"
  },
  "ang-05": {
    "name": "우스만 심바콜린",
    "nation": "중앙아프리카공화국",
    "birthYear": 2001,
    "pos": "ST",
    "club": "앙제 SCO"
  },
  "ang-06": {
    "name": "브랑코 판덴보므",
    "nation": "네덜란드",
    "birthYear": 1995,
    "pos": "CAM",
    "club": "앙제 SCO"
  },
  "ang-07": {
    "name": "프로스페르 페테른",
    "nation": "프랑스",
    "birthYear": 2007,
    "pos": "ST",
    "club": "앙제 SCO"
  },
  "ang-08": {
    "name": "아민 스바인",
    "nation": "모로코",
    "birthYear": 2000,
    "pos": "LW",
    "club": "앙제 SCO"
  },
  "ang-09": {
    "name": "하루나 지비린드",
    "nation": "카메룬",
    "birthYear": 2006,
    "pos": "LW",
    "club": "앙제 SCO"
  },
  "ang-10": {
    "name": "야신 벨크디므",
    "nation": "모로코",
    "birthYear": 2002,
    "pos": "CM",
    "club": "앙제 SCO"
  },
  "ang-11": {
    "name": "멜뱅 징간",
    "nation": "프랑스",
    "birthYear": 2002,
    "pos": "GK",
    "club": "앙제 SCO"
  },
  "ang-12": {
    "name": "조제프 칼룰룬",
    "nation": "프랑스",
    "birthYear": 2004,
    "pos": "RB",
    "club": "앙제 SCO"
  },
  "ang-13": {
    "name": "짐 알레비난",
    "nation": "가봉",
    "birthYear": 1995,
    "pos": "RW",
    "club": "앙제 SCO"
  },
  "ang-14": {
    "name": "아민 엘와자닌",
    "nation": "모로코",
    "birthYear": 2001,
    "pos": "ST",
    "club": "앙제 SCO"
  },
  "ang-15": {
    "name": "마리우스 루에른",
    "nation": "프랑스",
    "birthYear": 2007,
    "pos": "CB",
    "club": "앙제 SCO"
  },
  "ang-16": {
    "name": "조르당 르포른",
    "nation": "모리타니",
    "birthYear": 1993,
    "pos": "LB",
    "club": "앙제 SCO"
  },
  "ang-17": {
    "name": "에마뉘엘 비움란",
    "nation": "프랑스",
    "birthYear": 2005,
    "pos": "CB",
    "club": "앙제 SCO"
  },
  "ang-18": {
    "name": "앙토니 베르몽드",
    "nation": "프랑스",
    "birthYear": 2005,
    "pos": "RW",
    "club": "앙제 SCO"
  },
  "ang-19": {
    "name": "릴리앙 라올리소안",
    "nation": "프랑스",
    "birthYear": 2000,
    "pos": "CB",
    "club": "앙제 SCO"
  },
  "ang-20": {
    "name": "우마르 포난",
    "nation": "말리",
    "birthYear": 2006,
    "pos": "GK",
    "club": "앙제 SCO"
  },
  "ang-21": {
    "name": "아리스 벨케블란",
    "nation": "알제리",
    "birthYear": 1994,
    "pos": "CDM",
    "club": "앙제 SCO"
  },
  "aux-01": {
    "name": "폴 나르딘",
    "nation": "프랑스",
    "birthYear": 1994,
    "pos": "GK",
    "club": "오세르 부르고"
  },
  "aux-02": {
    "name": "레미 라보 라스카린",
    "nation": "과들루프",
    "birthYear": 2003,
    "pos": "LW",
    "club": "오세르 부르고"
  },
  "aux-03": {
    "name": "악셀 투안제벤",
    "nation": "콩고민주공화국",
    "birthYear": 1997,
    "pos": "CB",
    "club": "오세르 부르고"
  },
  "aux-04": {
    "name": "케뱅 다누안",
    "nation": "프랑스",
    "birthYear": 2004,
    "pos": "CM",
    "club": "오세르 부르고"
  },
  "aux-05": {
    "name": "조쉬에 카시미른",
    "nation": "아이티",
    "birthYear": 2001,
    "pos": "RW",
    "club": "오세르 부르고"
  },
  "aux-06": {
    "name": "나우이루 아하마단",
    "nation": "프랑스",
    "birthYear": 2002,
    "pos": "CDM",
    "club": "오세르 부르고"
  },
  "aux-07": {
    "name": "캐머런 아처스",
    "nation": "잉글랜드",
    "birthYear": 2001,
    "pos": "ST",
    "club": "오세르 부르고"
  },
  "aux-08": {
    "name": "대니 나마손",
    "nation": "카메룬",
    "birthYear": 2000,
    "pos": "ST",
    "club": "오세르 부르고"
  },
  "aux-09": {
    "name": "에로스 마딘",
    "nation": "네덜란드",
    "birthYear": 2001,
    "pos": "LW",
    "club": "오세르 부르고"
  },
  "aux-10": {
    "name": "텔리 시웬",
    "nation": "프랑스",
    "birthYear": 2004,
    "pos": "LB",
    "club": "오세르 부르고"
  },
  "aux-11": {
    "name": "크리스트 마코손",
    "nation": "콩고공화국",
    "birthYear": 2004,
    "pos": "CB",
    "club": "오세르 부르고"
  },
  "aux-12": {
    "name": "피에르 에크완",
    "nation": "프랑스",
    "birthYear": 2002,
    "pos": "CM",
    "club": "오세르 부르고"
  },
  "aux-13": {
    "name": "아산 디우센",
    "nation": "세네갈",
    "birthYear": 1997,
    "pos": "CDM",
    "club": "오세르 부르고"
  },
  "aux-14": {
    "name": "시날리 디오망덴",
    "nation": "코트디부아르",
    "birthYear": 2001,
    "pos": "CB",
    "club": "오세르 부르고"
  },
  "aux-15": {
    "name": "라소 쿨리발린",
    "nation": "코트디부아르",
    "birthYear": 2002,
    "pos": "CM",
    "club": "오세르 부르고"
  },
  "aux-16": {
    "name": "프레드리크 오페고른",
    "nation": "노르웨이",
    "birthYear": 2002,
    "pos": "LB",
    "club": "오세르 부르고"
  },
  "aux-17": {
    "name": "마마두 디오픈",
    "nation": "모리타니",
    "birthYear": 2000,
    "pos": "GK",
    "club": "오세르 부르고"
  },
  "aux-18": {
    "name": "브라이언 오콘",
    "nation": "스위스",
    "birthYear": 2003,
    "pos": "CB",
    "club": "오세르 부르고"
  },
  "aux-19": {
    "name": "라민 시르",
    "nation": "프랑스",
    "birthYear": 2002,
    "pos": "RB",
    "club": "오세르 부르고"
  },
  "aux-20": {
    "name": "로맹 파이브른",
    "nation": "프랑스",
    "birthYear": 1998,
    "pos": "CAM",
    "club": "오세르 부르고"
  },
  "aux-21": {
    "name": "마르뱅 세나얀",
    "nation": "가나",
    "birthYear": 2001,
    "pos": "RB",
    "club": "오세르 부르고"
  },
  "aux-22": {
    "name": "리앙 로댕드",
    "nation": "프랑스",
    "birthYear": 2006,
    "pos": "ST",
    "club": "오세르 부르고"
  },
  "aux-23": {
    "name": "아르튀르 피드포른",
    "nation": "벨기에",
    "birthYear": 2005,
    "pos": "CM",
    "club": "오세르 부르고"
  },
  "aux-24": {
    "name": "아리스티드 조순",
    "nation": "코트디부아르",
    "birthYear": 2005,
    "pos": "CM",
    "club": "오세르 부르고"
  },
  "aux-25": {
    "name": "클레망 아크판",
    "nation": "코트디부아르",
    "birthYear": 2001,
    "pos": "CB",
    "club": "오세르 부르고"
  },
  "aux-26": {
    "name": "세쿠 포파난",
    "nation": "코트디부아르",
    "birthYear": 2003,
    "pos": "CB",
    "club": "오세르 부르고"
  },
  "hav-01": {
    "name": "아메드 투반",
    "nation": "알제리",
    "birthYear": 1998,
    "pos": "CB",
    "club": "르아브르 시엘"
  },
  "hav-02": {
    "name": "쥐니오르 음완간",
    "nation": "프랑스",
    "birthYear": 2003,
    "pos": "CDM",
    "club": "르아브르 시엘"
  },
  "hav-03": {
    "name": "아미르 리샤르송드",
    "nation": "모로코",
    "birthYear": 2002,
    "pos": "CM",
    "club": "르아브르 시엘"
  },
  "hav-04": {
    "name": "조시 마잔",
    "nation": "나이지리아",
    "birthYear": 1998,
    "pos": "ST",
    "club": "르아브르 시엘"
  },
  "hav-05": {
    "name": "펠릭스 맘빔빈",
    "nation": "스위스",
    "birthYear": 2001,
    "pos": "CAM",
    "club": "르아브르 시엘"
  },
  "hav-06": {
    "name": "고드송 키에레멘",
    "nation": "프랑스",
    "birthYear": 2000,
    "pos": "LW",
    "club": "르아브르 시엘"
  },
  "hav-07": {
    "name": "엘리아스 옐레르튼",
    "nation": "덴마크",
    "birthYear": 2003,
    "pos": "RB",
    "club": "르아브르 시엘"
  },
  "hav-08": {
    "name": "포데 두쿠렌",
    "nation": "말리",
    "birthYear": 2001,
    "pos": "CB",
    "club": "르아브르 시엘"
  },
  "hav-09": {
    "name": "라술 은디아옌",
    "nation": "세네갈",
    "birthYear": 2001,
    "pos": "CM",
    "club": "르아브르 시엘"
  },
  "hav-10": {
    "name": "세코 아유문",
    "nation": "일본",
    "birthYear": 2000,
    "pos": "CB",
    "club": "르아브르 시엘"
  },
  "hav-11": {
    "name": "미즈타 가이톤",
    "nation": "일본",
    "birthYear": 2000,
    "pos": "CM",
    "club": "르아브르 시엘"
  },
  "hav-12": {
    "name": "야니스 주아윈",
    "nation": "프랑스",
    "birthYear": 1998,
    "pos": "LB",
    "club": "르아브르 시엘"
  },
  "hav-13": {
    "name": "조앙 탱크른",
    "nation": "프랑스",
    "birthYear": 2006,
    "pos": "LW",
    "club": "르아브르 시엘"
  },
  "hav-14": {
    "name": "뱅상 사손",
    "nation": "프랑스",
    "birthYear": 1991,
    "pos": "CB",
    "club": "르아브르 시엘"
  },
  "hav-15": {
    "name": "음브와나 사마탄",
    "nation": "탄자니아",
    "birthYear": 1992,
    "pos": "ST",
    "club": "르아브르 시엘"
  },
  "hav-16": {
    "name": "시몽 에보노근",
    "nation": "프랑스",
    "birthYear": 2004,
    "pos": "CM",
    "club": "르아브르 시엘"
  },
  "hav-17": {
    "name": "엔조 코핀",
    "nation": "프랑스",
    "birthYear": 2006,
    "pos": "RW",
    "club": "르아브르 시엘"
  },
  "hav-18": {
    "name": "스테팡 자가둔",
    "nation": "프랑스",
    "birthYear": 2008,
    "pos": "LB",
    "club": "르아브르 시엘"
  },
  "hav-19": {
    "name": "나카무라 소탄",
    "nation": "일본",
    "birthYear": 2002,
    "pos": "ST",
    "club": "르아브르 시엘"
  },
  "hav-20": {
    "name": "티모테 펨벨렌",
    "nation": "프랑스",
    "birthYear": 2002,
    "pos": "RB",
    "club": "르아브르 시엘"
  },
  "hav-21": {
    "name": "모크란 벤투민",
    "nation": "프랑스",
    "birthYear": 2005,
    "pos": "CM",
    "club": "르아브르 시엘"
  },
  "hav-22": {
    "name": "이스마일 부네브스",
    "nation": "프랑스",
    "birthYear": 2006,
    "pos": "CM",
    "club": "르아브르 시엘"
  },
  "hav-23": {
    "name": "폴 아르그넨",
    "nation": "프랑스",
    "birthYear": 2006,
    "pos": "GK",
    "club": "르아브르 시엘"
  },
  "hav-24": {
    "name": "리오넬 음파신",
    "nation": "콩고민주공화국",
    "birthYear": 1994,
    "pos": "GK",
    "club": "르아브르 시엘"
  },
  "hav-25": {
    "name": "다렌 모셍곤",
    "nation": "프랑스",
    "birthYear": 2006,
    "pos": "CM",
    "club": "르아브르 시엘"
  },
  "hav-26": {
    "name": "고티에 갈롱드",
    "nation": "프랑스",
    "birthYear": 1993,
    "pos": "GK",
    "club": "르아브르 시엘"
  },
  "lmn-01": {
    "name": "에완 아트푸르",
    "nation": "프랑스",
    "birthYear": 2000,
    "pos": "GK",
    "club": "르망 시르퀴"
  },
  "lmn-02": {
    "name": "아롤드 부아옌",
    "nation": "마르티니크",
    "birthYear": 1997,
    "pos": "CB",
    "club": "르망 시르퀴"
  },
  "lmn-03": {
    "name": "에드윈 쿠아르신",
    "nation": "프랑스",
    "birthYear": 1995,
    "pos": "CDM",
    "club": "르망 시르퀴"
  },
  "lmn-04": {
    "name": "빌랄 브라히민",
    "nation": "알제리",
    "birthYear": 2000,
    "pos": "RW",
    "club": "르망 시르퀴"
  },
  "lmn-05": {
    "name": "알렉상드르 로렌",
    "nation": "프랑스",
    "birthYear": 1997,
    "pos": "CM",
    "club": "르망 시르퀴"
  },
  "lmn-06": {
    "name": "앙투안 라비야른",
    "nation": "프랑스",
    "birthYear": 1995,
    "pos": "ST",
    "club": "르망 시르퀴"
  },
  "lmn-07": {
    "name": "장 베르크루이손",
    "nation": "프랑스",
    "birthYear": 2000,
    "pos": "CAM",
    "club": "르망 시르퀴"
  },
  "lmn-08": {
    "name": "아딜 부라반",
    "nation": "알제리",
    "birthYear": 2005,
    "pos": "CM",
    "club": "르망 시르퀴"
  },
  "lmn-09": {
    "name": "루이 마푸탄",
    "nation": "중앙아프리카공화국",
    "birthYear": 1994,
    "pos": "ST",
    "club": "르망 시르퀴"
  },
  "lmn-10": {
    "name": "노아 부아센",
    "nation": "프랑스",
    "birthYear": 2006,
    "pos": "CB",
    "club": "르망 시르퀴"
  },
  "lmn-11": {
    "name": "라울 토렌텐",
    "nation": "스페인",
    "birthYear": 2001,
    "pos": "CB",
    "club": "르망 시르퀴"
  },
  "lmn-12": {
    "name": "사뮈엘 요운",
    "nation": "프랑스",
    "birthYear": 1991,
    "pos": "CB",
    "club": "르망 시르퀴"
  },
  "lmn-13": {
    "name": "뤼카 부아든",
    "nation": "프랑스",
    "birthYear": 1997,
    "pos": "CB",
    "club": "르망 시르퀴"
  },
  "lmn-14": {
    "name": "지브릴 시디벤",
    "nation": "프랑스",
    "birthYear": 1992,
    "pos": "RB",
    "club": "르망 시르퀴"
  },
  "lmn-15": {
    "name": "윌리암 아르우준",
    "nation": "프랑스",
    "birthYear": 1999,
    "pos": "LW",
    "club": "르망 시르퀴"
  },
  "lmn-16": {
    "name": "테오 에유므",
    "nation": "프랑스",
    "birthYear": 2002,
    "pos": "LB",
    "club": "르망 시르퀴"
  },
  "lmn-17": {
    "name": "뤼카 칼로단",
    "nation": "프랑스",
    "birthYear": 2002,
    "pos": "RB",
    "club": "르망 시르퀴"
  },
  "lmn-18": {
    "name": "다우다 트라오렌",
    "nation": "프랑스",
    "birthYear": 2006,
    "pos": "CM",
    "club": "르망 시르퀴"
  },
  "lmn-19": {
    "name": "밀랑 로뱅드",
    "nation": "프랑스",
    "birthYear": 1999,
    "pos": "CM",
    "club": "르망 시르퀴"
  },
  "lmn-20": {
    "name": "담 게옌",
    "nation": "세네갈",
    "birthYear": 1995,
    "pos": "ST",
    "club": "르망 시르퀴"
  },
  "lmn-21": {
    "name": "라얀 밤반",
    "nation": "프랑스",
    "birthYear": 2004,
    "pos": "LB",
    "club": "르망 시르퀴"
  },
  "lmn-22": {
    "name": "마르탱 로시뇰라",
    "nation": "프랑스",
    "birthYear": 2003,
    "pos": "CM",
    "club": "르망 시르퀴"
  },
  "lmn-23": {
    "name": "에르완 콜란",
    "nation": "프랑스",
    "birthYear": 1997,
    "pos": "LW",
    "club": "르망 시르퀴"
  },
  "lmn-24": {
    "name": "뤼카 브르텔라",
    "nation": "프랑스",
    "birthYear": 2002,
    "pos": "CDM",
    "club": "르망 시르퀴"
  },
  "lmn-25": {
    "name": "야세르 라루신",
    "nation": "알제리",
    "birthYear": 2001,
    "pos": "LB",
    "club": "르망 시르퀴"
  },
  "lmn-26": {
    "name": "니콜라 코시큰",
    "nation": "프랑스",
    "birthYear": 1998,
    "pos": "GK",
    "club": "르망 시르퀴"
  },
  "lmn-27": {
    "name": "엔조 바그네른",
    "nation": "브라질",
    "birthYear": 2006,
    "pos": "ST",
    "club": "르망 시르퀴"
  },
  "len-01": {
    "name": "레지스 귀르트네른",
    "nation": "프랑스",
    "birthYear": 1986,
    "pos": "GK",
    "club": "랑스 상글리에"
  },
  "len-02": {
    "name": "뤼방 아길라른",
    "nation": "프랑스",
    "birthYear": 1993,
    "pos": "RB",
    "club": "랑스 상글리에"
  },
  "len-03": {
    "name": "마이크 나브로츠킨",
    "nation": "폴란드",
    "birthYear": 2001,
    "pos": "CB",
    "club": "랑스 상글리에"
  },
  "len-04": {
    "name": "니달 첼리큰",
    "nation": "보스니아헤르체고비나",
    "birthYear": 2006,
    "pos": "CB",
    "club": "랑스 상글리에"
  },
  "len-05": {
    "name": "안드리야 불라토비츠",
    "nation": "몬테네그로",
    "birthYear": 2006,
    "pos": "CM",
    "club": "랑스 상글리에"
  },
  "len-06": {
    "name": "삼손 바이돈",
    "nation": "오스트리아",
    "birthYear": 2004,
    "pos": "CB",
    "club": "랑스 상글리에"
  },
  "len-07": {
    "name": "플로리앙 소토칸",
    "nation": "프랑스",
    "birthYear": 1990,
    "pos": "RW",
    "club": "랑스 상글리에"
  },
  "len-08": {
    "name": "야신 티트라윈",
    "nation": "알제리",
    "birthYear": 2003,
    "pos": "CDM",
    "club": "랑스 상글리에"
  },
  "len-09": {
    "name": "토르강 아자른",
    "nation": "벨기에",
    "birthYear": 1993,
    "pos": "LW",
    "club": "랑스 상글리에"
  },
  "len-10": {
    "name": "플로리앙 토뱅드",
    "nation": "프랑스",
    "birthYear": 1993,
    "pos": "CAM",
    "club": "랑스 상글리에"
  },
  "len-11": {
    "name": "오종 에두아른",
    "nation": "프랑스",
    "birthYear": 1998,
    "pos": "ST",
    "club": "랑스 상글리에"
  },
  "len-12": {
    "name": "조아네르 차베손",
    "nation": "에콰도르",
    "birthYear": 2002,
    "pos": "LB",
    "club": "랑스 상글리에"
  },
  "len-13": {
    "name": "마티외 위돌라",
    "nation": "프랑스",
    "birthYear": 1996,
    "pos": "LB",
    "club": "랑스 상글리에"
  },
  "len-14": {
    "name": "마티외 고르젤랭드",
    "nation": "프랑스",
    "birthYear": 1990,
    "pos": "GK",
    "club": "랑스 상글리에"
  },
  "len-15": {
    "name": "압달라 시만",
    "nation": "세네갈",
    "birthYear": 2001,
    "pos": "LW",
    "club": "랑스 상글리에"
  },
  "len-16": {
    "name": "장클레르 토디본",
    "nation": "프랑스",
    "birthYear": 1999,
    "pos": "CB",
    "club": "랑스 상글리에"
  },
  "len-17": {
    "name": "아마두 아이다란",
    "nation": "말리",
    "birthYear": 1998,
    "pos": "CM",
    "club": "랑스 상글리에"
  },
  "len-18": {
    "name": "미하우 스코라신",
    "nation": "폴란드",
    "birthYear": 2000,
    "pos": "RW",
    "club": "랑스 상글리에"
  },
  "len-19": {
    "name": "사우드 압둘하미든",
    "nation": "사우디아라비아",
    "birthYear": 1999,
    "pos": "RB",
    "club": "랑스 상글리에"
  },
  "len-20": {
    "name": "조나탕 그라딘",
    "nation": "프랑스",
    "birthYear": 1992,
    "pos": "CB",
    "club": "랑스 상글리에"
  },
  "len-21": {
    "name": "이스마엘로 가니운",
    "nation": "프랑스",
    "birthYear": 2005,
    "pos": "CB",
    "club": "랑스 상글리에"
  },
  "len-22": {
    "name": "미카엘 퀴상손",
    "nation": "프랑스",
    "birthYear": 1999,
    "pos": "CM",
    "club": "랑스 상글리에"
  },
  "len-23": {
    "name": "쥐니오르 카딜라",
    "nation": "프랑스",
    "birthYear": 2002,
    "pos": "LW",
    "club": "랑스 상글리에"
  },
  "len-24": {
    "name": "프란요 이바노비츠",
    "nation": "크로아티아",
    "birthYear": 2003,
    "pos": "ST",
    "club": "랑스 상글리에"
  },
  "len-25": {
    "name": "술레이만 사냥드",
    "nation": "말리",
    "birthYear": 2005,
    "pos": "CB",
    "club": "랑스 상글리에"
  },
  "len-26": {
    "name": "로뱅 리세른",
    "nation": "프랑스",
    "birthYear": 2004,
    "pos": "GK",
    "club": "랑스 상글리에"
  },
  "lil-01": {
    "name": "베르케 외제른",
    "nation": "튀르키예",
    "birthYear": 2000,
    "pos": "GK",
    "club": "릴 도그"
  },
  "lil-02": {
    "name": "룬 스르다노비츠",
    "nation": "스위스",
    "birthYear": 2006,
    "pos": "RB",
    "club": "릴 도그"
  },
  "lil-03": {
    "name": "나탕 응고인",
    "nation": "벨기에",
    "birthYear": 2003,
    "pos": "CB",
    "club": "릴 도그"
  },
  "lil-04": {
    "name": "알렉산드룬",
    "nation": "브라질",
    "birthYear": 1999,
    "pos": "CB",
    "club": "릴 도그"
  },
  "lil-05": {
    "name": "나빌 벤탈레브스",
    "nation": "알제리",
    "birthYear": 1994,
    "pos": "CM",
    "club": "릴 도그"
  },
  "lil-06": {
    "name": "딜란 바크완",
    "nation": "프랑스",
    "birthYear": 2002,
    "pos": "RW",
    "club": "릴 도그"
  },
  "lil-07": {
    "name": "에탕 음바펜",
    "nation": "프랑스",
    "birthYear": 2006,
    "pos": "CAM",
    "club": "릴 도그"
  },
  "lil-08": {
    "name": "올리비에 지룬",
    "nation": "프랑스",
    "birthYear": 1986,
    "pos": "ST",
    "club": "릴 도그"
  },
  "lil-09": {
    "name": "하콘 하랄드손드",
    "nation": "아이슬란드",
    "birthYear": 2003,
    "pos": "CAM",
    "club": "릴 도그"
  },
  "lil-10": {
    "name": "오사메 사라윈",
    "nation": "모로코",
    "birthYear": 2001,
    "pos": "LW",
    "club": "릴 도그"
  },
  "lil-11": {
    "name": "오를란도 힐라",
    "nation": "파라과이",
    "birthYear": 2000,
    "pos": "GK",
    "club": "릴 도그"
  },
  "lil-12": {
    "name": "마우리츠 케르고른",
    "nation": "덴마크",
    "birthYear": 2003,
    "pos": "CM",
    "club": "릴 도그"
  },
  "lil-13": {
    "name": "로맹 페론",
    "nation": "프랑스",
    "birthYear": 1997,
    "pos": "LB",
    "club": "릴 도그"
  },
  "lil-14": {
    "name": "아르노 보다른",
    "nation": "벨기에",
    "birthYear": 1998,
    "pos": "GK",
    "club": "릴 도그"
  },
  "lil-15": {
    "name": "응갈라옐 무카운",
    "nation": "콩고민주공화국",
    "birthYear": 2004,
    "pos": "CDM",
    "club": "릴 도그"
  },
  "lil-16": {
    "name": "우에다 아야센",
    "nation": "일본",
    "birthYear": 1998,
    "pos": "ST",
    "club": "릴 도그"
  },
  "lil-17": {
    "name": "바샤르 외날라",
    "nation": "튀르키예",
    "birthYear": 2004,
    "pos": "ST",
    "club": "릴 도그"
  },
  "lil-18": {
    "name": "뱅자맹 앙드렌",
    "nation": "프랑스",
    "birthYear": 1990,
    "pos": "CDM",
    "club": "릴 도그"
  },
  "lil-19": {
    "name": "티아구 산투손",
    "nation": "포르투갈",
    "birthYear": 2002,
    "pos": "RB",
    "club": "릴 도그"
  },
  "lil-20": {
    "name": "탕기 니앙준",
    "nation": "프랑스",
    "birthYear": 2002,
    "pos": "CB",
    "club": "릴 도그"
  },
  "lil-21": {
    "name": "칼빈 페르동큰",
    "nation": "인도네시아",
    "birthYear": 1997,
    "pos": "LB",
    "club": "릴 도그"
  },
  "lil-22": {
    "name": "이자크 코시엔",
    "nation": "프랑스",
    "birthYear": 2006,
    "pos": "CB",
    "club": "릴 도그"
  },
  "lil-23": {
    "name": "가에탕 페랭드",
    "nation": "프랑스",
    "birthYear": 1996,
    "pos": "CAM",
    "club": "릴 도그"
  },
  "lil-24": {
    "name": "함자 이가마느",
    "nation": "모로코",
    "birthYear": 2002,
    "pos": "ST",
    "club": "릴 도그"
  },
  "lil-25": {
    "name": "소리바 디아운드",
    "nation": "프랑스",
    "birthYear": 2007,
    "pos": "LW",
    "club": "릴 도그"
  },
  "lor-01": {
    "name": "뱅자맹 르루안",
    "nation": "프랑스",
    "birthYear": 1989,
    "pos": "GK",
    "club": "로리앙 메를뤼"
  },
  "lor-02": {
    "name": "알렉 조르장드",
    "nation": "프랑스",
    "birthYear": 1998,
    "pos": "RB",
    "club": "로리앙 메를뤼"
  },
  "lor-03": {
    "name": "몬타사르 탈빈",
    "nation": "튀니지",
    "birthYear": 1998,
    "pos": "CB",
    "club": "로리앙 메를뤼"
  },
  "lor-04": {
    "name": "포르모즈 멘딘",
    "nation": "세네갈",
    "birthYear": 2001,
    "pos": "CB",
    "club": "로리앙 메를뤼"
  },
  "lor-05": {
    "name": "방디우구 파디간",
    "nation": "프랑스",
    "birthYear": 2001,
    "pos": "CM",
    "club": "로리앙 메를뤼"
  },
  "lor-06": {
    "name": "노아 카디운",
    "nation": "과들루프",
    "birthYear": 1998,
    "pos": "CM",
    "club": "로리앙 메를뤼"
  },
  "lor-07": {
    "name": "모하메드 밤반",
    "nation": "코트디부아르",
    "birthYear": 2001,
    "pos": "ST",
    "club": "로리앙 메를뤼"
  },
  "lor-08": {
    "name": "이사크 옌센드",
    "nation": "덴마크",
    "birthYear": 2003,
    "pos": "LW",
    "club": "로리앙 메를뤼"
  },
  "lor-09": {
    "name": "테오 르 브린",
    "nation": "프랑스",
    "birthYear": 2002,
    "pos": "CAM",
    "club": "로리앙 메를뤼"
  },
  "lor-10": {
    "name": "아이예군 토시느",
    "nation": "베냉",
    "birthYear": 1998,
    "pos": "RW",
    "club": "로리앙 메를뤼"
  },
  "lor-11": {
    "name": "장빅토르 마켕곤",
    "nation": "프랑스",
    "birthYear": 1998,
    "pos": "CDM",
    "club": "로리앙 메를뤼"
  },
  "lor-12": {
    "name": "이브라히마 발덴",
    "nation": "프랑스",
    "birthYear": 2003,
    "pos": "ST",
    "club": "로리앙 메를뤼"
  },
  "lor-13": {
    "name": "술레이만 파옌",
    "nation": "세네갈",
    "birthYear": 2003,
    "pos": "LW",
    "club": "로리앙 메를뤼"
  },
  "lor-14": {
    "name": "뎀보 실란",
    "nation": "기니",
    "birthYear": 2002,
    "pos": "RB",
    "club": "로리앙 메를뤼"
  },
  "lor-15": {
    "name": "빈구루 카마란",
    "nation": "세네갈",
    "birthYear": 1996,
    "pos": "GK",
    "club": "로리앙 메를뤼"
  },
  "lor-16": {
    "name": "스르잔 쿠즈미츠",
    "nation": "슬로베니아",
    "birthYear": 2004,
    "pos": "CB",
    "club": "로리앙 메를뤼"
  },
  "lor-17": {
    "name": "너새니얼 아제인",
    "nation": "가나",
    "birthYear": 2002,
    "pos": "CB",
    "club": "로리앙 메를뤼"
  },
  "lor-18": {
    "name": "가뱅 베르나르돈",
    "nation": "프랑스",
    "birthYear": 2006,
    "pos": "CM",
    "club": "로리앙 메를뤼"
  },
  "lor-19": {
    "name": "이봉 음보곤",
    "nation": "스위스",
    "birthYear": 1994,
    "pos": "GK",
    "club": "로리앙 메를뤼"
  },
  "lor-20": {
    "name": "아르센 쿠아신",
    "nation": "부르키나파소",
    "birthYear": 2004,
    "pos": "LB",
    "club": "로리앙 메를뤼"
  },
  "lor-21": {
    "name": "노사 에드워드 오바레티느",
    "nation": "이탈리아",
    "birthYear": 2003,
    "pos": "CB",
    "club": "로리앙 메를뤼"
  },
  "lor-22": {
    "name": "아르튀르 아보므",
    "nation": "카메룬",
    "birthYear": 2004,
    "pos": "CM",
    "club": "로리앙 메를뤼"
  },
  "lor-23": {
    "name": "노아 음밤반",
    "nation": "벨기에",
    "birthYear": 2005,
    "pos": "CDM",
    "club": "로리앙 메를뤼"
  },
  "lor-24": {
    "name": "파노스 카체리손",
    "nation": "그리스",
    "birthYear": 2001,
    "pos": "CM",
    "club": "로리앙 메를뤼"
  },
  "lor-25": {
    "name": "이자크 투렌",
    "nation": "프랑스",
    "birthYear": 2003,
    "pos": "CB",
    "club": "로리앙 메를뤼"
  }
}
