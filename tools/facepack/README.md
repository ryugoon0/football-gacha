# 페이스팩 제작 도구

선수 사진(권리가 확인된 원본)을 게임 카드용 투명 PNG 로 만든다. 게임 저장소에는
사진을 넣지 않는다 — 결과물은 각자 기기의 페이스팩으로 불러온다.

## 설치 (Python 3.11~3.13)

```bash
pip install -r tools/facepack/requirements.txt
```

## GPU (선택)

CUDA GPU 가 있으면 업스케일이 수십 배 빠르다.

```bash
pip install torch --index-url https://download.pytorch.org/whl/cu128
pip uninstall -y onnxruntime
pip install "onnxruntime-gpu==1.22.0"
```

- **onnxruntime-gpu 버전을 torch 의 CUDA 세대에 맞춘다.** 최신 onnxruntime-gpu
  (1.27 이상)는 CUDA 13 런타임(`cublasLt64_13.dll`)을 찾는데, torch cu128 은
  CUDA 12 DLL 만 갖고 있어서 인물 분리가 조용히 CPU 로 떨어진다. CUDA 12 계열인
  1.22.0 을 쓰면 맞는다(RTX 3070 · Python 3.12 에서 확인).
- `onnxruntime`(CPU 판)과 `onnxruntime-gpu` 를 같이 깔아 두면 충돌한다. GPU 를
  쓸 때는 CPU 판을 지운다.
- CUDA 툴킷을 따로 설치할 필요는 없다. `cutout.py` 가 rembg 보다 torch 를 먼저
  import 해서 torch 의 lib 폴더를 DLL 검색 경로에 얹는다.
- 잘 붙었는지 확인:

```bash
python -c "import torch; from rembg import new_session; print(new_session('u2net_human_seg', providers=['CUDAExecutionProvider','CPUExecutionProvider']).inner_session.get_providers())"
```

  `['CUDAExecutionProvider', ...]` 가 나와야 한다. `CUDAExecutionProvider was
  requested but the session is running on CPU` 경고가 뜨면 위 버전이 어긋난 것.

첫 실행 때 Real-ESRGAN 가중치(67MB)와 rembg 인물 분리 모델을 자동으로 내려받는다.

## 사용

```bash
python tools/facepack/make.py --out fp --upscale  bruno.jpg=w76  cunha.jpg=lv140
```

- `사진=카드id` 쌍을 나열한다. 카드 id 는 게임 「계정 → 페이스팩 → 이름표 CSV」에 있다.
- `--upscale`: 원본이 작을 때(700px 아래) 4배 키운 뒤 자른다.
- 결과 `fp/<카드id>.png`(512², 투명 배경). 여러 장이면 zip 으로 묶어 게임에 넣는다.
- 단체 사진이면 먼저 그 선수 주변을 대충 잘라 둔 파일을 넣는 편이 정확하다.

## 동작

1. Real-ESRGAN x4plus(RRDBNet, `upscale.py`) — CUDA 가 있으면 한 번에, 없으면 타일로.
2. rembg `u2net_human_seg` 로 인물 분리, 가장 큰 덩어리만 남김.
3. 알파를 이진화하고 내부 구멍을 메워 카드색이 얼굴에 비치지 않게 한다.
4. 마스크 상단에서 머리 폭을 재서 머리 2.8배 너비의 정사각형으로 자른다.

## 주의

- 사진의 권리는 쓰는 사람이 확인한다. 위키미디어 공용 CC BY / BY-SA 사진은 출처와
  저작자를 함께 적어 둔다(CREDITS.txt 등).
- Windows 의 realesrgan-ncnn-vulkan 은 일부 내장 GPU 에서 죽는다. 이 도구는 그 대신
  PyTorch 로 같은 모델을 돌린다.
