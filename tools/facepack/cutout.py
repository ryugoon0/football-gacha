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

def cut(src, dst, size=512, head=2.8, flood=True):
    img = Image.open(src).convert("RGBA")
    # A file that already carries transparency (an official cut-out) keeps its
    # own mask — re-segmenting it only adds a blocky halo where the ground was.
    src_alpha = img.split()[-1]
    already_cut = src_alpha.getextrema()[0] < 16 and sum(src_alpha.histogram()[:16]) > img.width * img.height * 0.05
    if already_cut:
        out = img.copy()
    else:
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
    # The blob mask was built at quarter size; grow it back out so it only
    # removes stray blobs and never nibbles the subject's edge into 4px steps.
    from PIL import ImageFilter as _IF
    keep = keep.filter(_IF.MaxFilter(11)).point(lambda v: 255 if v > 0 else 0)
    from PIL import ImageChops
    alpha = ImageChops.multiply(alpha, keep)
    # Official headshots sit on a flat near-black (or near-white) ground that the
    # segmenter confuses with dark hair, leaving blocky chunks of ground around
    # the head. Flood the ground in from the border by colour and knock out
    # whatever it reaches; the rembg alpha handles the rest. Dark hair on a black
    # ground (dreadlocks, a fringe) gets eaten by the same flood — pass
    # flood=False (--no-flood) for those and let rembg alone decide.
    from PIL import ImageDraw as _ID, ImageChops as _IC
    rgb = img.convert("RGB")
    flat_bg = rgb.copy()
    marker = (255, 0, 255)
    W, H = flat_bg.size
    for seed in ((0, 0), (W - 1, 0), (0, H - 1), (W - 1, H - 1), (W // 2, 0), (0, H // 2), (W - 1, H // 2)):
        r0, g0, b0 = rgb.getpixel(seed)
        if flood and not already_cut and (max(r0, g0, b0) < 40 or min(r0, g0, b0) > 215):
            _ID.floodfill(flat_bg, seed, marker, thresh=22)
    px = flat_bg.load()
    bg = Image.new("L", flat_bg.size, 0)
    bpx = bg.load()
    for yy in range(H):
        for xx in range(W):
            if px[xx, yy] == marker:
                bpx[xx, yy] = 255
    alpha = _IC.multiply(alpha, _IC.invert(bg))
    out.putalpha(alpha)

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
    # run there as the head width, and cut a square `head` heads wide centred on
    # it. Neighbours in a group photo usually sit outside that square — when a
    # team-mate's arm still creeps into a corner, a tighter --head (2.4~2.5)
    # usually crops it away.
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
    side = int(head_w * head)
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
    flood = "--no-flood" not in sys.argv
    for pair in sys.argv[1:]:
        if pair.startswith("--"):
            continue
        src, dst = pair.split("=")
        cut(src, dst, flood=flood)
