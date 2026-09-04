import sys, io
from PIL import Image

# rembg 보다 torch 를 먼저 불러온다. Windows 에서 onnxruntime-gpu 는 CUDA 런타임
# (cublasLt64_12.dll, cudnn64_9.dll)을 PATH 에서 찾는데, CUDA 툴킷을 따로 깔지 않은
# PC 에서는 torch 의 CUDA 빌드가 가진 lib 폴더가 유일한 출처다. torch 를 먼저
# import 하면 그 폴더가 DLL 검색 경로에 등록돼 CUDAExecutionProvider 가 뜬다.
try:
    import torch  # noqa: F401
except Exception:
    pass

from rembg import remove, new_session

# onnxruntime-gpu 가 설치돼 있으면 CUDA 를 쓴다(없으면 CPU).
session = new_session("u2net_human_seg", providers=["CUDAExecutionProvider", "CPUExecutionProvider"])

def cut(src, dst, size=512):
    img = Image.open(src).convert("RGBA")
    out = remove(img, session=session, alpha_matting=False, post_process_mask=True)
    alpha = out.split()[-1]
    # Keep only the biggest connected blob of the mask — the player, not a
    # team-mate or a fan at the edge of the frame — using a coarse BFS.
    small = alpha.resize((alpha.width // 4 or 1, alpha.height // 4 or 1))
    sw, sh = small.size
    px = small.load()
    seen = bytearray(sw * sh)
    best = []
    for y0 in range(sh):
        for x0 in range(sw):
            i0 = y0 * sw + x0
            if seen[i0] or px[x0, y0] < 100:
                continue
            comp = []
            stack = [i0]
            seen[i0] = 1
            while stack:
                i = stack.pop()
                comp.append(i)
                x, y = i % sw, i // sw
                for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                    if 0 <= nx < sw and 0 <= ny < sh:
                        j = ny * sw + nx
                        if not seen[j] and px[nx, ny] >= 100:
                            seen[j] = 1
                            stack.append(j)
            if len(comp) > len(best):
                best = comp
    keep = Image.new("L", (sw, sh), 0)
    kp = keep.load()
    for i in best:
        kp[i % sw, i // sw] = 255
    keep = keep.resize(alpha.size, Image.BILINEAR)
    from PIL import ImageChops
    alpha = ImageChops.multiply(alpha, keep)
    # Make the alpha binary-solid inside the subject: the segmenter leaves
    # half-transparent pixels in dark beards and hair, and those let the card
    # colour bleed through the face. Anything not reachable from outside the
    # subject becomes fully opaque (holes filled), the outer edge is pulled in
    # by a pixel and softened by one pixel only.
    from PIL import ImageFilter, ImageDraw
    hard = alpha.point(lambda a: 255 if a >= 128 else 0)
    # Flood the outside from the four corners; what is left unflooded is subject.
    padded = Image.new("L", (hard.width + 2, hard.height + 2), 0)
    padded.paste(hard, (1, 1))
    ImageDraw.floodfill(padded, (0, 0), 128)
    outside = padded.crop((1, 1, hard.width + 1, hard.height + 1)).point(lambda v: 255 if v == 128 else 0)
    solid = outside.point(lambda v: 0 if v else 255)
    solid = solid.filter(ImageFilter.MinFilter(3))
    alpha = solid.filter(ImageFilter.GaussianBlur(0.6))
    out.putalpha(alpha)
    # Head-first crop without a face detector: from the mask's top edge, look
    # at the rows in the first slice of the subject (the head), take the widest
    # run there as the head width, and cut a square 2.3 heads wide centred on
    # it. Neighbours in a group photo usually sit outside that square.
    bbox = alpha.getbbox()
    if not bbox:
        raise SystemExit(f"no subject in {src}")
    left, top, right, bottom = bbox
    sub_h = bottom - top
    ap = alpha.load()
    head_rows = range(top + int(sub_h * 0.04), top + int(sub_h * 0.10) + 1)
    best_w, best_cx = 0, (left + right) // 2
    for y in head_rows:
        # longest contiguous run of subject pixels in this row
        run, run_start, longest, longest_start = 0, 0, 0, 0
        for x in range(left, right):
            if ap[x, y] >= 128:
                if run == 0:
                    run_start = x
                run += 1
                if run > longest:
                    longest, longest_start = run, run_start
            else:
                run = 0
        if longest > best_w:
            best_w, best_cx = longest, longest_start + longest // 2
    head_w = max(best_w, sub_h // 12)
    side = int(head_w * 2.8)
    l = int(best_cx - side / 2)
    t = int(top - side * 0.08)
    l = max(0, min(l, img.width - side)) if img.width >= side else 0
    t = max(0, t)
    crop = out.crop((l, t, l + side, t + side))
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(crop, (0, 0), crop)
    canvas = canvas.resize((size, size), Image.LANCZOS)
    canvas.save(dst)
    print(dst, side)

if __name__ == "__main__":
    for pair in sys.argv[1:]:
        src, dst = pair.split("=")
        cut(src, dst)
