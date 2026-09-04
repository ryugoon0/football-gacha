# AI 비서 캐릭터 이미지 프롬프트 (완성본, 복사해서 바로 사용)

docs/AI_ASSISTANT_CANDIDATES.md의 세 후보를 사용자가 준 샘플 화풍(포토리얼
K-뷰티 인물사진, 세로 3:4, 상반신, 얕은 심도)으로 뽑기 위한 프롬프트.
플레이스홀더 없음 — 각 블록을 그대로 프롬프트 칸에 붙인다.

무료로 쓰는 법:
- SeaArt / Tensor.art: 매일 주는 무료 크레딧으로 하루 몇 장씩. 모델은
  `majicMIX realistic`(또는 ChilloutMix), 비율 3:4, Negative 칸에 아래 네거티브.
  같은 얼굴로 표정을 바꿀 때는 첫 장의 Seed를 고정하고 표정 문구만 교체.
- ChatGPT: 프롬프트 앞에 "이 설명대로 사진 같은 인물 이미지를 3:4 세로로
  생성해줘:"를 붙여 요청. 표정 변형은 같은 대화에서 "같은 인물로 표정만
  ○○로" 하고 이어서 요청.

얼굴은 실존 인물이 아닌 생성 얼굴이어야 한다(로스터 실명 금지와 같은 이유).

---

## 공통 네거티브 (Negative Prompt 칸)

```
cartoon, anime, illustration, 3d render, painting, sketch, deformed hands, extra fingers, bad anatomy, blurry, low quality, jpeg artifacts, text, watermark, logo, signature, resembling a real celebrity or idol, lookalike of a real person, oversaturated, plastic skin, doll face, cleavage, revealing clothing
```

---

## 1. 서지안 — 수석 데이터 분석관

```
ultra-realistic photograph of a beautiful Korean woman in her late 20s, natural skin texture, soft natural makeup, long straight black hair tied in a low ponytail, thin silver-rimmed rectangular glasses, calm composed neutral expression, intelligent steady gaze looking at camera, wearing a fitted navy blue blouse with a crisp white collar, holding a tablet displaying football match statistics, background: dim football analytics room with blue monitor glow and out-of-focus data screens, cool blue-toned key light on one side of the face, shallow depth of field, 85mm portrait lens, cinematic soft lighting, editorial photo quality, upper body portrait, vertical 3:4, sharp focus on eyes, 8k, photorealistic
```

표정 변형(위 프롬프트에서 `calm composed neutral expression`만 교체):
- `faint knowing smile, lips barely curved`
- `slightly furrowed brow, focused and analytical`

## 2. 한아름 — 신입 코치 · 매니저

```
ultra-realistic photograph of a beautiful Korean woman in her early 20s, natural skin texture, soft natural makeup, light brown shoulder-length bob hair with a side part, bright wide eyes, warm cheerful open smile, slight natural blush, looking at camera, wearing a green football training jacket with white shoulder stripes and a stand-up collar over a white t-shirt, a silver referee whistle on a black lanyard around her neck, background: sunlit football training pitch with green grass and a goal net softly out of focus, golden afternoon sunlight, warm backlight glowing in her hair, shallow depth of field, 85mm portrait lens, cinematic soft lighting, editorial photo quality, upper body portrait, vertical 3:4, sharp focus on eyes, 8k, photorealistic
```

표정 변형(`warm cheerful open smile, slight natural blush`만 교체):
- `surprised expression, eyes wide, mouth slightly open`
- `pouting, disappointed, looking slightly down`
- `determined expression, small fist raised near chest`
- `gentle soft resting smile`

## 3. 백소연 — 구단 사무국장

```
ultra-realistic photograph of an elegant beautiful Korean woman in her late 30s, youthful and graceful, natural skin texture with subtle fine lines, refined natural makeup, silver-toned ash grey hair in a neat updo with soft side-swept bangs, warm gentle smile with kind eyes looking at camera, wearing a tailored burgundy blazer over a cream silk blouse, a small enamel football club badge on the lapel, holding a white ceramic mug with rising steam, background: football club executive office beside a window, warm afternoon light through venetian blinds, bookshelves and framed trophies out of focus, shallow depth of field, 85mm portrait lens, cinematic soft lighting, editorial photo quality, upper body portrait, vertical 3:4, sharp focus on eyes, 8k, photorealistic
```

표정 변형(`warm gentle smile with kind eyes`만 교체):
- `mildly surprised, eyebrows raised, soft parted lips`
- `serious calm look, lips closed, steady gaze`

나이를 샘플처럼 20대 톤으로 맞추려면 `late 30s`를 `early 30s`로 바꾼다.

---

## 결과물 규격 (게임에 붙일 때)

- 원본 3:4 세로, 최소 768×1024. 게임에는 WebP로 변환해 `public/assistants/<이름>/<표정>.webp`.
- 상반신 프레임이 유지된 컷만 채택(UI 카드가 상반신 크롭).
- 셋의 조명 방향(왼쪽 키라이트)이 맞으면 한 화면에 나란히 놓아도 어색하지 않다.
