"""
페이스팩 제작 — 원본 사진 → (선택) 4배 업스케일 → 인물 분리 → 머리·어깨 정사각 컷아웃(투명 PNG).

    python tools/facepack/make.py --out out --upscale  사진.jpg=w76  다른사진.png=lv140 ...

파일명은 카드 id(선수편집 탭·이름표 CSV 참고)로 붙인다. --upscale 은 원본이 700px 아래일 때
쓰고, 결과 PNG 들을 zip 으로 묶어 게임의 「페이스팩 → 이미지·zip 불러오기」에 넣는다.
GPU(CUDA) 가 있으면 자동으로 쓴다: torch 는 CUDA 빌드, onnxruntime-gpu 설치.
"""
import argparse, os, sys, tempfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cutout import cut
from upscale import upscale

ap = argparse.ArgumentParser()
ap.add_argument("pairs", nargs="+", help="원본경로=카드id")
ap.add_argument("--out", default="out")
ap.add_argument("--upscale", action="store_true", help="컷아웃 전에 Real-ESRGAN 4배")
ap.add_argument("--size", type=int, default=512)
ap.add_argument("--head", type=float, default=2.8, help="머리 폭의 몇 배로 자를지(작을수록 얼굴이 크게)")
ap.add_argument("--no-flood", action="store_true", help="검은/흰 스튜디오 배경 플러드 제거를 끈다(검은 배경에 검은 머리가 먹힐 때)")
args = ap.parse_args()
os.makedirs(args.out, exist_ok=True)
for pair in args.pairs:
    src, card = pair.rsplit("=", 1)
    work = src
    if args.upscale:
        work = os.path.join(tempfile.gettempdir(), f"fp_{card}_x4.png")
        upscale(src, work)
    cut(work, os.path.join(args.out, f"{card}.png"), size=args.size, head=args.head, flood=not args.no_flood)
print("완료:", args.out)
