# 전술 캘리브레이션 자료 (Data Sources)

전술 엔진의 수치를 실제 축구에 맞춰 조정할 때 참고할 **공개** 자료를 정리한다.
상용 데이터(Opta / StatsPerform 등)의 원본은 수집하지도, 저장소에 포함하지도 않는다.

현재 저장소에는 어떤 외부 데이터도 포함되어 있지 않다. 아래는 향후 캘리브레이션을 할 때
어디를 보고 무엇을 뽑을지에 대한 지도다.

## 1. 이벤트 데이터

### StatsBomb Open Data
- 공개 라이선스로 배포되는 경기 이벤트 데이터(pass, carry, shot, pressure, interception,
  tackle, dribble, possession chain, location, lineup). 일부 경기는 360 프레임 포함.
- 뽑을 수 있는 팀 단위 지표: 패스 길이 분포, 전진 패스 비율, final third entry,
  penalty area entry, high turnover 위치, pressure 위치 분포, defensive action height,
  전환 공격 빈도, 슈팅 위치 분포.
- 엔진 대응: `sequence.ts`의 `keepBall` · `carry` · 루트 가중치, `metrics.ts`의
  finalThirdEntries · highTurnovers 기준값.

### Wyscout 공개 학술 데이터셋
- 논문과 함께 공개된 대규모 이벤트 데이터. 리그별 패스 성공률과 슈팅 수의 기준선을
  잡을 때 사용한다.
- 엔진 대응: 패스 성공률 목표치(현재 77%), 경기당 슈팅 수(현재 15).

## 2. 트래킹 데이터

### Metrica Sports Sample Data
- 이벤트 + 트래킹이 함께 공개된 샘플 경기. 공간 지표를 직접 계산할 수 있다.
- 뽑을 지표: team width, team length, defensive height, team centroid,
  compactness(수직·수평), 공수 전환 시 팀 확장·수축 폭.
- 엔진 대응: `state.ts`의 `teamWidth`(현재 34~49m), `teamLength`(현재 30~44m),
  `defensiveHeight`(현재 24~54m), `compactness`.
- 주의: 관측된 범위는 절대 상한이 아니다. 포메이션 · 전술 · 국면에 따라 넘어갈 수 있다.

## 3. 행동 가치 평가

### socceraction / SPADL / xT / VAEP
- 행동을 "성공했는가"가 아니라 "이후 득점 위협을 얼마나 바꿨는가"로 평가하는 프레임워크.
- 엔진 대응: 지금은 `sequence.ts`가 찬스 하나당 xG proxy(0~1)를 직접 만든다. 다음 단계로
  피치를 격자로 나눈 ThreatValue 표를 두고, 전개 단계마다 위협값 변화를 누적하는 방식으로
  바꿀 수 있다. 그 표를 xT로 대체하면 캘리브레이션이 끝난다.

## 4. 전술 이론

- FIFA Training Centre의 공개 전술 분석 자료
- 포지셔널 플레이 / Juego de Posición, 게겐프레싱, 미드·로우 블록, 카운터, 롱볼,
  하프스페이스, 오버랩·언더랩, rest defence, 오프사이드 트랩에 대한 공개 전술 분석
- team width / length / centroid / compactness를 다룬 학술 논문
- pressing · counterpress · PPDA 정의를 다룬 공개 자료

이 게임은 위 개념들을 **특수 능력으로 넣지 않는다.** 전부 `params.ts`의 21개 값 조합으로
표현되며, 새로운 전술 유행이 나와도 파라미터 조합만 추가하면 된다.

## 5. 캘리브레이션 절차 (권장)

1. 공개 데이터에서 리그 평균 지표를 뽑는다(패스 성공률, 슈팅 수, 점유율, PPDA,
   final third entry, team width/length).
2. `tests/tacticsSim.test.ts`의 시뮬레이션 요약을 같은 형식으로 출력한다.
3. 차이가 큰 항목부터 해당 모듈의 상수를 조정한다. 조정 후 A~F 테스트가 모두
   통과하는지 확인한다 — 방향성이 깨지면 캘리브레이션이 아니라 왜곡이다.
4. 밸런스 테스트(아키타입 라운드로빈)로 특정 전술이 지배적이 되지 않았는지 본다.

## 6. 하지 않는 것

- 상용 데이터 스크래핑 · 저장 · 배포
- 실제 선수/구단 실명 데이터 반입 (이 게임의 선수와 구단은 모두 가상이다)
- 데이터에 맞추기 위해 전술 상성 표를 만드는 것
