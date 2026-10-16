import math, random, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage
import paint as P0
from paint import W, H, S, SW, SH, catmull, lerp, ellipse, noise, paint_ground, frame
from shade import shade_mask, line_mask, shade_into, drop_shadow

rng = random.Random(11)
SIZE = (SW, SH)
GRAIN_V = None

def grain_tex(seed, sx, sy):
    r = np.random.RandomState(seed)
    g = r.rand(SH // sy + 2, SW // sx + 2).astype(np.float32)
    z = ndimage.zoom(g, (sy, sx), order=1)[:SH, :SW]
    z = ndimage.gaussian_filter(z, (sy * 0.3, sx * 0.3))
    z = (z - z.min()) / (z.max() - z.min())
    return z

def poly_mask(pts):
    mk = Image.new('L', SIZE, 0)
    ImageDraw.Draw(mk).polygon([(x * S, y * S) for x, y in pts], fill=255)
    return mk

def strokes(img, paths, col, width, blur=0.6):
    lay = Image.new('RGBA', SIZE, (0, 0, 0, 0))
    d = ImageDraw.Draw(lay)
    for p in paths:
        d.line([(x * S, y * S) for x, y in p], fill=col, width=max(1, int(width * S)), joint='curve')
    if blur:
        lay = lay.filter(ImageFilter.GaussianBlur(blur * S))
    img.alpha_composite(lay)

OL = ((34, 44, 10), (104, 120, 34), (196, 206, 98))
OL_BACK = ((22, 30, 6), (70, 84, 22), (140, 152, 60))
STUMPS = [242, 356, 470]

def along(path, side, widths):
    out = []
    n = len(path)
    for i in range(n):
        t = i / (n - 1)
        x0, y0 = path[max(0, i - 1)]
        x1, y1 = path[min(n - 1, i + 1)]
        dx, dy = x1 - x0, y1 - y0
        L = math.hypot(dx, dy) or 1
        nx, ny = -dy / L, dx / L
        w = widths(t) / 2
        out.append((path[i][0] + nx * w * side, path[i][1] + ny * w * side))
    return out

def bark_grain(img, path, widths, dark, light, count=7, clipmask=None):
    paths_d, paths_l = [], []
    n = len(path)
    for g in range(count):
        side = rng.uniform(-0.8, 0.8)
        p = along(path, side, widths)
        a = rng.randint(0, n // 3)
        b = min(n, a + rng.randint(n // 3, n))
        paths_d.append(p[a:b])
        pl = along(path, side - 0.12, widths)
        paths_l.append(pl[a:b])
    lay = Image.new('RGBA', SIZE, (0, 0, 0, 0))
    strokes(lay, paths_l, light, 1.0, 0.4)
    strokes(lay, paths_d, dark, 1.6, 0.5)
    if clipmask is not None:
        a = np.minimum(np.asarray(lay.split()[-1]), np.asarray(clipmask))
        lay.putalpha(Image.fromarray(a))
    img.alpha_composite(lay)

def tube2(img, path, widths, cols, grain=7, gcol=((20, 26, 4, 150), (220, 230, 150, 70)), shadow=True, tex=None):
    mk = line_mask(SIZE, path, widths, S)
    if shadow:
        drop_shadow(img, mk, (3 * S, 4 * S), 4 * S, 110)
    R = max(widths(0), widths(0.5)) * S * 0.5
    shade_into(img, mk, R, *cols, tex=tex, tex_amt=0.3 if tex is not None else 0)
    if grain:
        bark_grain(img, path, widths, gcol[0], gcol[1], grain, mk)
    return mk

# ---------------------------------------------------------------------------
def left_tree(img):
    tex = grain_tex(3, 3, 26)
    roots = [
        [(64, 600), (120, 612), (200, 624), (290, 638), (330, 652)],
        [(60, 590), (110, 596), (170, 590), (236, 598)],
        [(52, 612), (84, 630), (130, 646), (150, 662)],
        [(70, 584), (130, 572), (196, 576)],
        [(36, 604), (10, 626), (-12, 642)],
    ]
    for r in roots:
        tube2(img, catmull(r, 14), lambda t: 28 * (1 - 0.8 * t) + 4, OL, grain=4, tex=tex)
    # tronco: dois cipós grossos torcidos
    phases = [0.0, math.pi]
    paths = []
    for ph in phases:
        pts = []
        for y in range(660, 150, -10):
            k = (660 - y) / 510
            cx = 52 + 26 * max(0, k - 0.72) ** 1.4 * 4
            pts.append((cx + 21 * math.sin(y * 0.019 + ph), y))
        paths.append(catmull(pts, 5))
    wfun = lambda t: 48 - 14 * t
    for front in (False, True):
        for si, path in enumerate(paths):
            segs, seg = [], []
            for p in path:
                f = math.cos(p[1] * 0.019 + phases[si]) > 0
                if f == front:
                    seg.append(p)
                elif seg:
                    segs.append(seg); seg = []
            if seg:
                segs.append(seg)
            for sg in segs:
                if len(sg) < 3:
                    continue
                t0 = (660 - sg[0][1]) / 510
                t1 = (660 - sg[-1][1]) / 510
                tube2(img, sg, lambda t, a=t0, b=t1: wfun(a + (b - a) * t), OL if front else OL_BACK, grain=6, tex=tex, shadow=front)
    # cipó verde fino enrolando o tronco
    pts = [(52 + 30 * math.sin(y * 0.045 + 1.2), y) for y in range(610, 200, -8)]
    tube2(img, catmull(pts, 3), lambda t: 7, ((20, 60, 10), (60, 130, 30), (150, 214, 90)), grain=0, shadow=True)
    ent_head(img, tex)
    for y in STUMPS:
        stump(img, 54, y)
    leaves(img)

def ent_head(img, tex):
    cx, cy = 118, 74
    head = catmull([(20, -20), (110, -24), (196, -16), (206, 40), (194, 104), (168, 150), (132, 186), (92, 204), (58, 196), (36, 160), (24, 100), (20, -20)], 10)
    mk = poly_mask(head)
    drop_shadow(img, mk, (5 * S, 6 * S), 7 * S, 130)
    shade_into(img, mk, 50 * S, (36, 48, 10), (110, 128, 38), (204, 214, 106), tex=tex, tex_amt=0.35)
    # dobras de madeira na cabeça
    folds = []
    for k in range(9):
        x0 = 40 + k * 18
        folds.append(catmull([(x0, -10), (x0 + rng.uniform(-6, 6), 30), (x0 - 4 + (k - 4) * 2, 80), (x0 - 18 + (k - 4) * 4, 150)], 8))
    lay = Image.new('RGBA', SIZE, (0, 0, 0, 0))
    strokes(lay, [[(x + 1.5, y) for x, y in f] for f in folds], (230, 236, 150, 70), 2.0, 0.8)
    strokes(lay, folds, (24, 32, 6, 150), 2.2, 0.8)
    a = np.minimum(np.asarray(lay.split()[-1]), np.asarray(mk))
    lay.putalpha(Image.fromarray(a))
    img.alpha_composite(lay)
    # órbitas côncavas
    for side in (-1, 1):
        ex, ey = cx + side * 27, cy - 2
        em = Image.new('L', SIZE, 0)
        ImageDraw.Draw(em).ellipse([(ex - 17) * S, (ey - 11) * S, (ex + 17) * S, (ey + 11) * S], fill=255)
        shade_into(img, em, 10 * S, (8, 12, 0), (40, 52, 10), (110, 126, 40), L=(0.5, 0.75, 0.55))
        ellipse(img, ex + side, ey + 1, 6, 4, (236, 222, 64, 255))
        ellipse(img, ex + side * 1.5, ey + 1, 2.2, 3.2, (24, 16, 0, 255))
        ellipse(img, ex - 2, ey - 1, 1.4, 1.1, (255, 255, 230, 255))
    # sobrancelhas e nariz em relevo
    for side in (-1, 1):
        brow = catmull([(cx + side * 4, cy - 12), (cx + side * 22, cy - 26), (cx + side * 44, cy - 22), (cx + side * 56, cy - 8)], 10)
        tube2(img, brow, lambda t: 15 - 7 * t, ((40, 54, 12), (128, 146, 44), (220, 228, 126)), grain=2)
    nose = catmull([(cx, cy - 14), (cx + 2, cy + 10), (cx + 4, cy + 32), (cx - 1, cy + 42)], 12)
    tube2(img, nose, lambda t: 12 + 8 * t, ((40, 54, 12), (128, 146, 44), (220, 228, 126)), grain=2)
    # boca
    mouth = catmull([(cx - 28, cy + 54), (cx - 8, cy + 64), (cx + 14, cy + 62), (cx + 30, cy + 52)], 10)
    strokes(img, [mouth], (14, 20, 2, 255), 5, 0.6)
    strokes(img, [[(x, y + 3.5) for x, y in mouth]], (200, 214, 110, 140), 2, 0.6)
    # barba de cipós caindo pela frente do tronco
    for k in range(10):
        x0 = cx - 46 + k * 10
        pts = catmull([(x0, cy + 70), (x0 - 6 + rng.uniform(-5, 5), cy + 104), (x0 - 20 + rng.uniform(-6, 6), cy + 136), (x0 - 30 + rng.uniform(-8, 6), cy + 158 + rng.uniform(-6, 26))], 10)
        tube2(img, pts, lambda t: 10 * (1 - 0.75 * t) + 1.5, ((30, 44, 10), (100, 122, 34), (190, 204, 96)), grain=1)

def stump(img, cx, cy, rx=46, ry=22, depth=32):
    side = Image.new('L', SIZE, 0)
    d = ImageDraw.Draw(side)
    d.rectangle([(cx - rx) * S, cy * S, (cx + rx) * S, (cy + depth) * S], fill=255)
    d.ellipse([(cx - rx) * S, (cy + depth - ry) * S, (cx + rx) * S, (cy + depth + ry) * S], fill=255)
    drop_shadow(img, side, (3 * S, 6 * S), 5 * S, 140)
    tex = grain_tex(int(cy), 2, 18)
    shade_into(img, side, 30 * S, (30, 36, 8), (92, 104, 30), (176, 186, 80), L=(-0.7, 0.0, 0.6), tex=tex, tex_amt=0.45)
    # estrias da casca
    paths = []
    for k in range(16):
        x = cx - rx + 4 + k * (2 * rx - 8) / 15 + rng.uniform(-2, 2)
        yb = cy + depth + ry * math.sqrt(max(0, 1 - ((x - cx) / rx) ** 2)) - 3
        paths.append([(x, cy + 4), (x + rng.uniform(-2, 2), (cy + yb) / 2), (x + rng.uniform(-3, 3), yb)])
    lay = Image.new('RGBA', SIZE, (0, 0, 0, 0))
    strokes(lay, paths, (20, 24, 4, 150), 1.4, 0.5)
    a = np.minimum(np.asarray(lay.split()[-1]), np.asarray(side)); lay.putalpha(Image.fromarray(a))
    img.alpha_composite(lay)
    # topo cortado
    topm = Image.new('L', SIZE, 0)
    ImageDraw.Draw(topm).ellipse([(cx - rx) * S, (cy - ry) * S, (cx + rx) * S, (cy + ry) * S], fill=255)
    yy, xx = np.mgrid[0:SH, 0:SW].astype(np.float32)
    rr = np.sqrt(((xx / S - cx + 4) / rx) ** 2 + ((yy / S - cy + 2) / ry) ** 2)
    base = np.array([226, 220, 112], np.float32); edge = np.array([170, 162, 50], np.float32); hi = np.array([246, 242, 170], np.float32)
    f = np.clip(rr, 0, 1)[..., None]
    col = hi + (base - hi) * np.clip(f / 0.5, 0, 1) + (edge - base) * np.clip((f - 0.5) / 0.5, 0, 1)
    rings = (0.5 + 0.5 * np.cos(rr * 34)) ** 6
    col = col * (1 - 0.14 * rings[..., None])
    out = np.zeros((SH, SW, 4), np.uint8)
    out[..., :3] = np.clip(col, 0, 255)
    out[..., 3] = np.asarray(topm)
    bb = topm.getbbox()
    img.alpha_composite(Image.fromarray(out).crop(bb), bb[:2])
    ImageDraw.Draw(img).ellipse([(cx - rx) * S, (cy - ry) * S, (cx + rx) * S, (cy + ry) * S], outline=(110, 112, 26, 255), width=2 * S)
    ImageDraw.Draw(img).arc([(cx - rx + 3) * S, (cy - ry + 2) * S, (cx + rx - 3) * S, (cy + ry - 1) * S], 195, 300, fill=(252, 250, 200, 220), width=2 * S)

def leaves(img):
    lay = Image.new('RGBA', SIZE, (0, 0, 0, 0))
    d = ImageDraw.Draw(lay)
    for (x, y) in [(16, 196), (96, 214), (10, 300), (98, 318), (12, 414), (100, 430), (24, 540), (108, 548), (150, 180)]:
        for k in range(rng.randint(2, 4)):
            a = rng.uniform(-math.pi * 0.95, -0.05)
            L = rng.uniform(14, 22)
            tx, ty = x + math.cos(a) * L, y + math.sin(a) * L
            nx, ny = -math.sin(a) * L * 0.3, math.cos(a) * L * 0.3
            mx, my = (x + tx) / 2, (y + ty) / 2
            d.polygon([(x * S, y * S), ((mx + nx) * S, (my + ny) * S), (tx * S, ty * S), ((mx - nx) * S, (my - ny) * S)], fill=(50, 116, 22, 255))
            d.polygon([(x * S, y * S), ((mx + nx * 0.7) * S, (my + ny * 0.7) * S), (tx * S, ty * S)], fill=(112, 182, 54, 255))
            d.line([(x * S, y * S), (tx * S, ty * S)], fill=(28, 76, 12, 255), width=S)
    drop_shadow(img, lay.split()[-1], (2 * S, 3 * S), 2 * S, 110)
    img.alpha_composite(lay)

# ---------------------------------------------------------------------------
RED = ((52, 12, 6), (150, 56, 28), (226, 132, 82))
RED_BACK = ((34, 8, 4), (104, 36, 18), (170, 86, 52))

def right_tree(img):
    tex = grain_tex(9, 3, 30)
    roots = [
        [(W - 66, 600), (W - 130, 612), (W - 214, 626), (W - 310, 642), (W - 350, 656)],
        [(W - 60, 590), (W - 120, 594), (W - 190, 590)],
        [(W - 44, 612), (W - 80, 634), (W - 122, 660)],
        [(W - 30, 602), (W + 12, 622)],
    ]
    for r in roots:
        tube2(img, catmull(r, 14), lambda t: 20 * (1 - 0.8 * t) + 3, RED, grain=5, gcol=((30, 6, 2, 160), (250, 170, 120, 70)), tex=tex)
    # tronco principal e um galho torcido de trás
    def cpath(ph, amp):
        pts = []
        for y in range(660, 120, -10):
            k = (660 - y) / 540
            cx = W - 56 - 46 * max(0, k - 0.7) ** 1.3 * 2.4
            pts.append((cx + amp * math.sin(y * 0.018 + ph), y))
        return catmull(pts, 5)
    back = cpath(2.4, 16)
    tube2(img, back, lambda t: 34 - 10 * t, RED_BACK, grain=10, gcol=((24, 4, 2, 170), (240, 150, 100, 60)), tex=tex)
    main = cpath(0, 10)
    tube2(img, main, lambda t: 58 - 18 * t, RED, grain=26, gcol=((30, 6, 2, 170), (252, 176, 126, 80)), tex=tex)
    ram_head(img, tex)
    for y in STUMPS:
        pod(img, W - 58, y)

def ram_head(img, tex):
    cx, cy = W - 112, 70
    # juba
    for k in range(26):
        a = rng.uniform(1.0, 2.1)
        L = rng.uniform(34, 64)
        x0 = cx + rng.uniform(-26, 30)
        pts = catmull([(x0, cy - 20), (x0 + math.cos(a) * L * 0.4, cy + L * 0.4), (x0 + math.cos(a) * L * 0.7, cy + L * 0.95)], 8)
        tube2(img, pts, lambda t: 9 * (1 - 0.7 * t) + 2, RED, grain=1, gcol=((30, 6, 2, 160), (250, 170, 120, 70)), shadow=False)
    # focinho comprido apontando para baixo
    head = catmull([(cx - 30, cy - 34), (cx + 30, cy - 34), (cx + 32, cy + 4), (cx + 18, cy + 50), (cx + 10, cy + 78), (cx - 10, cy + 78), (cx - 18, cy + 50), (cx - 32, cy + 4), (cx - 30, cy - 34)], 10)
    mk = poly_mask(head)
    drop_shadow(img, mk, (-4 * S, 6 * S), 6 * S, 130)
    shade_into(img, mk, 24 * S, (110, 72, 44), (196, 160, 120), (246, 230, 200), tex=tex, tex_amt=0.2)
    # pelo marrom no focinho
    lay = Image.new('RGBA', SIZE, (0, 0, 0, 0))
    strokes(lay, [[(cx + o, cy - 30), (cx + o * 0.7, cy + 20), (cx + o * 0.4, cy + 70)] for o in range(-20, 22, 4)], (120, 70, 36, 90), 1.6, 0.6)
    a = np.minimum(np.asarray(lay.split()[-1]), np.asarray(mk)); lay.putalpha(Image.fromarray(a))
    img.alpha_composite(lay)
    # olhos fundos e brilhando
    for side in (-1, 1):
        ex, ey = cx + side * 18, cy + 4
        em = poly_mask([(ex - side * 11, ey - 7), (ex + side * 11, ey - 11), (ex + side * 9, ey + 7), (ex - side * 7, ey + 6)])
        shade_into(img, em, 6 * S, (10, 4, 0), (40, 20, 8), (90, 56, 30), L=(0.5, 0.75, 0.55))
        ellipse(img, ex + side, ey - 1, 3.2, 2.6, (255, 170, 40, 255))
        ellipse(img, ex + side, ey - 1, 1.2, 1.2, (255, 250, 200, 255))
    ellipse(img, cx - 5, cy + 66, 3.5, 5, (40, 20, 10, 255))
    ellipse(img, cx + 5, cy + 66, 3.5, 5, (40, 20, 10, 255))
    # chifres de carneiro: saem do alto da cabeça, sobem para trás e enrolam para baixo
    for side in (-1, 1):
        ox, oy = cx + side * 42, cy - 8
        pts = []
        a0 = math.atan2(-(cy - 30 - oy), side * (cx + side * 12 - ox))
        for i in range(80):
            t = i / 79
            ang = a0 - 2 * math.pi * 1.25 * t
            r = 40 * (1 - 0.72 * t)
            pts.append((ox + side * math.cos(ang) * r, oy - math.sin(ang) * r))
        wf = lambda t: 26 * (1 - 0.7 * t) + 3
        mkh = line_mask(SIZE, pts, wf, S)
        drop_shadow(img, mkh, (-3 * S, 5 * S), 4 * S, 120)
        shade_into(img, mkh, 12 * S, (112, 92, 64), (214, 198, 166), (252, 246, 228), spec=0.4)
        # estrias
        lay = Image.new('RGBA', SIZE, (0, 0, 0, 0))
        d = ImageDraw.Draw(lay)
        for i in range(2, len(pts) - 1, 3):
            t = i / (len(pts) - 1)
            (x0, y0), (x1, y1) = pts[i - 1], pts[i + 1]
            dx, dy = x1 - x0, y1 - y0
            L = math.hypot(dx, dy) or 1
            nx, ny = -dy / L, dx / L
            w = wf(t) / 2
            d.line([((pts[i][0] + nx * w) * S, (pts[i][1] + ny * w) * S), ((pts[i][0] - nx * w) * S, (pts[i][1] - ny * w) * S)], fill=(120, 96, 66, 180), width=int(1.4 * S))
        lay = lay.filter(ImageFilter.GaussianBlur(0.4 * S))
        a = np.minimum(np.asarray(lay.split()[-1]), np.asarray(mkh)); lay.putalpha(Image.fromarray(a))
        img.alpha_composite(lay)

def pod(img, cx, cy, rx=48, ry=24):
    # haste/base presa no tronco
    base = poly_mask([(cx - rx * 0.9, cy + 4), (cx + rx * 0.9, cy + 4), (cx + 12, cy + 40), (cx - 12, cy + 40)])
    shade_into(img, base, 14 * S, (54, 18, 50), (126, 62, 120), (190, 120, 184))
    # almofada
    mk = Image.new('L', SIZE, 0)
    ImageDraw.Draw(mk).ellipse([(cx - rx) * S, (cy - ry) * S, (cx + rx) * S, (cy + ry + 8) * S], fill=255)
    drop_shadow(img, mk, (-3 * S, 6 * S), 5 * S, 140)
    shade_into(img, mk, 20 * S, (84, 32, 80), (176, 106, 170), (240, 196, 236), spec=0.25)
    # cavidade interna em espiral
    inner = Image.new('L', SIZE, 0)
    ImageDraw.Draw(inner).ellipse([(cx - rx * 0.66) * S, (cy - ry * 0.6) * S, (cx + rx * 0.66) * S, (cy + ry * 0.62) * S], fill=255)
    shade_into(img, inner, 12 * S, (70, 24, 66), (140, 70, 134), (200, 140, 196), L=(0.5, 0.75, 0.55))
    lay = Image.new('RGBA', SIZE, (0, 0, 0, 0))
    d = ImageDraw.Draw(lay)
    for k in range(4):
        r1, r2 = rx * (0.14 + k * 0.13), ry * (0.14 + k * 0.13)
        d.arc([(cx - r1) * S, (cy - r2) * S, (cx + r1) * S, (cy + r2) * S], 200 + k * 40, 480 + k * 40, fill=(222, 170, 218, 190), width=int(1.4 * S))
    img.alpha_composite(lay.filter(ImageFilter.GaussianBlur(0.4 * S)))
    # espinhos curtos na borda
    lay = Image.new('RGBA', SIZE, (0, 0, 0, 0))
    d = ImageDraw.Draw(lay)
    for k in range(24):
        a = k / 24 * math.pi * 2 + 0.1
        bx, by = cx + math.cos(a) * rx * 0.92, cy + 4 + math.sin(a) * (ry + 4) * 0.92
        tx, ty = cx + math.cos(a) * (rx + 6), cy + 4 + math.sin(a) * (ry + 10)
        nx, ny = -math.sin(a) * 2.4, math.cos(a) * 1.8
        d.polygon([((bx + nx) * S, (by + ny) * S), (tx * S, ty * S), ((bx - nx) * S, (by - ny) * S)], fill=(246, 230, 238, 255), outline=(126, 76, 118, 255))
    img.alpha_composite(lay)

def main(out):
    img = paint_ground()
    left_tree(img)
    right_tree(img)
    frame(img)
    img.resize((W, H), Image.LANCZOS).convert('RGB').save(out)

if __name__ == '__main__':
    main(sys.argv[1])
