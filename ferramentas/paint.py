"""Pinta o cenário da batalha do Elfender (1120x646) em estilo ilustrado.
Desenha em 2x e reduz no final para suavizar bordas."""
import math, random, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageChops
from scipy import ndimage

W, H = 1120, 646
S = 2
SW, SH = W * S, H * S
rng = random.Random(5)
np.random.seed(5)

def P(x, y):
    return (x * S, y * S)

def lerp(a, b, t):
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(len(a)))

def hexc(h, a=255):
    h = h.lstrip('#')
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a)

def noise(w, h, scale, seed=0, octaves=3):
    """Ruído suave (valor) em [0,1]."""
    r = np.random.RandomState(seed)
    out = np.zeros((h, w), np.float32)
    amp, tot = 1.0, 0.0
    for o in range(octaves):
        sc = max(2, int(scale / (2 ** o)))
        gw, gh = w // sc + 3, h // sc + 3
        g = r.rand(gh, gw).astype(np.float32)
        z = ndimage.zoom(g, (h / (gh - 3) * 1.0, w / (gw - 3) * 1.0), order=3)[:h, :w]
        out += z * amp
        tot += amp
        amp *= 0.5
    out /= tot
    out = (out - out.min()) / (out.max() - out.min() + 1e-6)
    return out

def bezier(pts, n=60):
    """Curva de Bézier (qualquer grau) amostrada."""
    pts = np.array(pts, float)
    out = []
    for i in range(n + 1):
        t = i / n
        p = pts.copy()
        while len(p) > 1:
            p = p[:-1] * (1 - t) + p[1:] * t
        out.append(p[0])
    return out

def catmull(pts, n=16):
    pts = [pts[0]] + list(pts) + [pts[-1]]
    out = []
    for i in range(1, len(pts) - 2):
        p0, p1, p2, p3 = [np.array(p, float) for p in pts[i - 1:i + 3]]
        for k in range(n):
            t = k / n
            t2, t3 = t * t, t * t * t
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3))
    out.append(np.array(pts[-2], float))
    return out

def tube(img, path, widths, dark, mid, light, layers=9, light_dir=(-0.55, -0.85), grain=None):
    """Desenha um tubo sombreado (tronco/cipó) ao longo de 'path'.
    widths: função t->largura (px em 1x)."""
    d = ImageDraw.Draw(img)
    n = len(path)
    for k in range(layers):
        f = k / (layers - 1)
        if f < 0.5:
            col = lerp(dark, mid, f / 0.5)
        else:
            col = lerp(mid, light, (f - 0.5) / 0.5)
        shrink = 1 - 0.82 * f
        off = 0.32 * f
        for i in range(n - 1):
            t = i / (n - 1)
            w = widths(t)
            ox, oy = light_dir[0] * w * off, light_dir[1] * w * off
            # desloca o brilho para o lado da luz, perpendicular ao caminho
            (x0, y0), (x1, y1) = path[i], path[i + 1]
            ww = max(1, w * shrink * S)
            d.line([(x0 * S + ox * S, y0 * S + oy * S), (x1 * S + ox * S, y1 * S + oy * S)], fill=col, width=int(ww))
            r = ww / 2
            d.ellipse([x1 * S + ox * S - r, y1 * S + oy * S - r, x1 * S + ox * S + r, y1 * S + oy * S + r], fill=col)
    # sulcos da casca
    if grain:
        gcol, count = grain
        for g in range(count):
            side = rng.uniform(-0.38, 0.38)
            pts = []
            for i in range(0, n, 2):
                t = i / (n - 1)
                (x0, y0) = path[i]
                (x1, y1) = path[min(n - 1, i + 1)]
                dx, dy = x1 - x0, y1 - y0
                L = math.hypot(dx, dy) or 1
                nx, ny = -dy / L, dx / L
                w = widths(t)
                pts.append(((x0 + nx * w * side) * S, (y0 + ny * w * side) * S))
            a = rng.randint(0, max(1, len(pts) // 3))
            b = min(len(pts), a + rng.randint(len(pts) // 4 + 2, len(pts)))
            if b - a >= 2:
                d.line(pts[a:b], fill=gcol, width=max(1, int(S * rng.uniform(0.8, 1.8))), joint='curve')

def ellipse(img, cx, cy, rx, ry, fill, outline=None, width=1):
    d = ImageDraw.Draw(img)
    d.ellipse([(cx - rx) * S, (cy - ry) * S, (cx + rx) * S, (cy + ry) * S], fill=fill, outline=outline, width=width * S)

def soft_shadow(base, mask_img, offset=(4, 6), blur=8, alpha=110):
    m = mask_img.split()[-1]
    sh = Image.new('RGBA', base.size, (0, 0, 0, 0))
    a = m.point(lambda v: min(alpha, v))
    sh.putalpha(a)
    sh = sh.filter(ImageFilter.GaussianBlur(blur * S))
    base.alpha_composite(sh, (offset[0] * S, offset[1] * S))

# ---------------------------------------------------------------------------
# Horizonte e grama
# ---------------------------------------------------------------------------
def paint_ground():
    img = Image.new('RGBA', (SW, SH), (0, 0, 0, 255))
    yy = np.linspace(0, 1, SH)[:, None]
    # céu enevoado
    sky_top = np.array([196, 218, 214], np.float32)
    sky_bot = np.array([222, 234, 222], np.float32)
    arr = np.zeros((SH, SW, 3), np.float32)
    arr[:] = sky_top + (sky_bot - sky_top) * np.clip(yy / 0.17, 0, 1)[..., None]
    img = Image.fromarray(arr.astype(np.uint8)).convert('RGBA')
    d = ImageDraw.Draw(img)

    # colinas azuladas distantes
    pts = [(0, 92 * S)]
    for x in range(0, W + 20, 20):
        pts.append((x * S, (76 + 7 * math.sin(x * 0.011) + 4 * math.sin(x * 0.037 + 1)) * S))
    pts += [(W * S, 120 * S), (0, 120 * S)]
    d.polygon(pts, fill=(138, 168, 140, 255))
    pts = [(0, 100 * S)]
    for x in range(0, W + 20, 16):
        pts.append((x * S, (88 + 5 * math.sin(x * 0.02 + 2) + 3 * math.sin(x * 0.05)) * S))
    pts += [(W * S, 120 * S), (0, 120 * S)]
    d.polygon(pts, fill=(108, 150, 104, 255))

    # rio
    d.rectangle([0, 98 * S, SW, 112 * S], fill=(176, 204, 210, 255))
    for i in range(60):
        x = rng.uniform(0, W); y = rng.uniform(100, 110); L = rng.uniform(8, 30)
        d.line([(x * S, y * S), ((x + L) * S, y * S)], fill=(230, 242, 244, 200), width=S)

    # pinheiros e arbustos
    for i in range(34):
        x = rng.uniform(200, 950)
        h = rng.uniform(18, 40)
        base = rng.uniform(96, 101)
        dark = (40, 84, 40, 255); light = (86, 140, 70, 255)
        for k in range(4):
            wk = h * 0.36 * (1 - k * 0.2)
            yk = base - k * h * 0.22
            d.polygon([(x * S, (yk - h * 0.42) * S), ((x - wk) * S, yk * S), ((x + wk) * S, yk * S)], fill=dark)
            d.polygon([(x * S, (yk - h * 0.42) * S), ((x - wk * 0.5) * S, (yk - 1) * S), (x * S, (yk - 2) * S)], fill=light)
        d.line([(x * S, base * S), (x * S, (base + 3) * S)], fill=(70, 50, 30, 255), width=2 * S)
    for i in range(20):
        x = rng.uniform(180, 980); y = rng.uniform(98, 104); r = rng.uniform(6, 14)
        ellipse(img, x, y, r * 1.4, r * 0.7, (64, 118, 52, 255))
        ellipse(img, x - r * 0.3, y - r * 0.25, r * 0.8, r * 0.35, (100, 156, 74, 255))
    # rochas
    for i in range(7):
        x = rng.uniform(260, 900); y = rng.uniform(101, 106); r = rng.uniform(8, 16)
        ellipse(img, x, y, r * 1.3, r * 0.8, (110, 108, 98, 255))
        ellipse(img, x - r * 0.3, y - r * 0.35, r * 0.7, r * 0.35, (168, 164, 150, 255))

    # grama: gradiente + manchas
    gy0 = 110
    g = np.zeros((SH, SW, 3), np.float32)
    top = np.array([118, 190, 52], np.float32)
    mid = np.array([84, 170, 34], np.float32)
    bot = np.array([62, 150, 24], np.float32)
    t = np.clip((np.arange(SH) / S - gy0) / (H - gy0), 0, 1)[:, None, None]
    g[:] = np.where(t < 0.35, top + (mid - top) * (t / 0.35), mid + (bot - mid) * ((t - 0.35) / 0.65))
    n1 = noise(SW, SH, 260, 1)[..., None]
    n2 = noise(SW, SH, 60, 2)[..., None]
    n3 = noise(SW, SH, 12, 3, octaves=2)[..., None]
    g *= (0.92 + 0.15 * n1) * (0.94 + 0.12 * n2) * (0.95 + 0.1 * n3)
    g[..., 0:1] += (n1 - 0.5) * 12  # puxa para o amarelo nas manchas claras
    g = np.clip(g, 0, 255)
    grass = Image.fromarray(g.astype(np.uint8)).convert('RGBA')
    # borda irregular da grama no horizonte
    mask = Image.new('L', (SW, SH), 0)
    md = ImageDraw.Draw(mask)
    pts = [(0, SH)]
    for x in range(0, W + 6, 6):
        pts.append((x * S, (gy0 + 2 * math.sin(x * 0.07) + rng.uniform(-1.5, 1.5)) * S))
    pts.append((SW, SH))
    md.polygon(pts, fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(1.2 * S))
    img.paste(grass, (0, 0), mask)

    # tufos de grama pintados
    blades = Image.new('RGBA', (SW, SH), (0, 0, 0, 0))
    bd = ImageDraw.Draw(blades)
    for i in range(26000):
        x = rng.uniform(0, W)
        y = rng.uniform(gy0 + 2, H)
        depth = (y - gy0) / (H - gy0)
        L = (2.5 + rng.uniform(0, 4.5)) * (0.55 + 0.6 * depth)
        a = -math.pi / 2 + rng.uniform(-0.5, 0.5)
        shade = rng.random()
        if shade < 0.45:
            col = (150, 214, 76, int(150 + 80 * rng.random()))
        elif shade < 0.8:
            col = (54, 128, 22, int(110 + 80 * rng.random()))
        else:
            col = (186, 230, 104, int(120 + 90 * rng.random()))
        bd.line([(x * S, y * S), ((x + math.cos(a) * L) * S, (y + math.sin(a) * L) * S)], fill=col, width=max(1, int(S * rng.uniform(0.7, 1.3))))
    # tufos maiores em V, mais claros, como na referência
    for i in range(900):
        x = rng.uniform(0, W); y = rng.uniform(gy0 + 20, H)
        depth = (y - gy0) / (H - gy0)
        L = (5 + rng.uniform(0, 5)) * (0.6 + 0.6 * depth)
        for k in range(rng.randint(3, 5)):
            a = -math.pi / 2 + (k - 2) * 0.32 + rng.uniform(-0.12, 0.12)
            bd.line([(x * S, y * S), ((x + math.cos(a) * L) * S, (y + math.sin(a) * L) * S)], fill=(172, 226, 96, 200), width=S)
        bd.line([((x - 2) * S, (y + 1) * S), ((x + 2) * S, (y + 1) * S)], fill=(40, 100, 18, 120), width=S)
    blades = blades.filter(ImageFilter.GaussianBlur(0.35 * S))
    img.alpha_composite(blades)

    # tronco caído ao fundo (como na referência)
    log = Image.new('RGBA', (SW, SH), (0, 0, 0, 0))
    path = catmull([(250, 116), (300, 113), (360, 115)], 10)
    tube(log, path, lambda t: 9, (70, 56, 40), (120, 98, 72), (176, 156, 120), layers=7, grain=((60, 46, 30, 200), 4))
    ellipse(log, 364, 115, 4, 4.5, (196, 168, 120, 255), (90, 70, 50, 255), 1)
    img.alpha_composite(log)

    # névoa leve na linha do horizonte
    fog = np.zeros((SH, SW, 4), np.uint8)
    yy = np.arange(SH) / S
    a = np.clip(1 - np.abs(yy - 112) / 14, 0, 1) * 70
    fog[..., 0:3] = 235
    fog[..., 3] = a[:, None].astype(np.uint8)
    img.alpha_composite(Image.fromarray(fog))
    return img

# ---------------------------------------------------------------------------
# Árvore verde (esquerda)
# ---------------------------------------------------------------------------
OL_DARK, OL_MID, OL_LIGHT = (38, 52, 14), (92, 112, 30), (168, 184, 70)
GR_DARK, GR_MID, GR_LIGHT = (26, 70, 14), (60, 128, 30), (128, 196, 70)
STUMPS = [242, 356, 470]

def stump(img, cx, cy, rx=44, ry=22, depth=30):
    lay = Image.new('RGBA', img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(lay)
    # lateral: cilindro escuro com casca
    d.rectangle([(cx - rx) * S, cy * S, (cx + rx) * S, (cy + depth) * S], fill=(60, 66, 20, 255))
    d.ellipse([(cx - rx) * S, (cy + depth - ry) * S, (cx + rx) * S, (cy + depth + ry) * S], fill=(60, 66, 20, 255))
    # sombreamento horizontal da lateral
    for i in range(int(2 * rx)):
        x = cx - rx + i
        f = i / (2 * rx)
        light = max(0, 1 - abs(f - 0.32) * 2.4)
        col = lerp((44, 50, 14), (150, 158, 60), light)
        yb = cy + depth + ry * math.sqrt(max(0, 1 - ((x - cx) / rx) ** 2))
        d.line([(x * S, cy * S), (x * S, yb * S)], fill=col + (255,), width=S + 1)
    # casca: estrias verticais
    for k in range(14):
        x = cx - rx + 4 + k * (2 * rx - 8) / 13 + rng.uniform(-2, 2)
        yb = cy + depth + ry * math.sqrt(max(0, 1 - ((x - cx) / rx) ** 2)) - 2
        d.line([(x * S, (cy + 6) * S), ((x + rng.uniform(-3, 3)) * S, yb * S)], fill=(30, 36, 8, 160), width=S)
    # topo
    top = Image.new('RGBA', img.size, (0, 0, 0, 0))
    td = ImageDraw.Draw(top)
    steps = 26
    for i in range(steps):
        f = i / (steps - 1)
        col = lerp((176, 168, 52), (238, 232, 140), f ** 0.8)
        r1, r2 = rx * (1 - 0.92 * f), ry * (1 - 0.92 * f)
        ox, oy = -rx * 0.12 * f, -ry * 0.18 * f
        td.ellipse([(cx + ox - r1) * S, (cy + oy - r2) * S, (cx + ox + r1) * S, (cy + oy + r2) * S], fill=col + (255,))
    # anéis
    for i, f in enumerate([0.22, 0.4, 0.58, 0.76, 0.9]):
        r1, r2 = rx * f, ry * f
        td.ellipse([(cx - r1 - 2) * S, (cy - r2 - 1) * S, (cx + r1 - 2) * S, (cy + r2 - 1) * S], outline=(160, 150, 46, 170), width=S)
    td.ellipse([(cx - rx) * S, (cy - ry) * S, (cx + rx) * S, (cy + ry) * S], outline=(118, 120, 30, 255), width=2 * S)
    # brilho na borda de cima
    td.arc([(cx - rx + 3) * S, (cy - ry + 2) * S, (cx + rx - 3) * S, (cy + ry - 2) * S], 190, 300, fill=(250, 248, 190, 200), width=2 * S)
    lay.alpha_composite(top)
    soft_shadow(img, lay, (3, 5), 4, 120)
    img.alpha_composite(lay)

def left_tree(img):
    lay = Image.new('RGBA', img.size, (0, 0, 0, 0))
    # raízes espalhadas no chão
    roots = [
        [(70, 600), (130, 612), (210, 626), (300, 640), (340, 652)],
        [(60, 590), (120, 600), (180, 596), (250, 604)],
        [(50, 610), (90, 630), (150, 646), (170, 660)],
        [(30, 600), (10, 620), (-10, 640)],
        [(80, 585), (160, 578), (220, 586)],
    ]
    for r in roots:
        tube(lay, catmull(r, 14), lambda t, w0=16: w0 * (1 - 0.8 * t) + 3, OL_DARK, OL_MID, OL_LIGHT, layers=8, grain=((30, 40, 10, 170), 3))
    # três cipós entrelaçados que sobem do chão até a cabeça
    phases = [0, 2.1, 4.2]
    strands = []
    for ph in phases:
        pts = []
        for y in range(650, 120, -12):
            k = (650 - y) / 530
            cx = 52 + 10 * k + 70 * max(0, k - 0.75) ** 1.5 * 6
            x = cx + 22 * math.sin(y * 0.024 + ph)
            pts.append((x, y))
        strands.append(pts)
    # desenha cada cipó em pedaços, alternando frente/trás para dar a torção
    for pass_front in (False, True):
        for si, pts in enumerate(strands):
            path = catmull(pts, 6)
            n = len(path)
            seg = []
            for i in range(n):
                y = path[i][1]
                front = math.cos(y * 0.024 + phases[si]) > 0
                if front == pass_front:
                    seg.append(path[i])
                else:
                    if len(seg) > 2:
                        base = (OL_DARK, OL_MID, OL_LIGHT) if pass_front else ((28, 38, 10), (66, 82, 22), (120, 134, 48))
                        tube(lay, seg, lambda t: 20, *base, layers=9, grain=((28, 36, 8, 190), 4))
                    seg = []
            if len(seg) > 2:
                base = (OL_DARK, OL_MID, OL_LIGHT) if pass_front else ((28, 38, 10), (66, 82, 22), (120, 134, 48))
                tube(lay, seg, lambda t: 20, *base, layers=9, grain=((28, 36, 8, 190), 4))
    # cipós finos verdes enrolados (folhagem viva)
    for ph in (1.0, 3.4):
        pts = [(46 + 30 * math.sin(y * 0.05 + ph), y) for y in range(600, 180, -10)]
        tube(lay, catmull(pts, 4), lambda t: 6, GR_DARK, GR_MID, GR_LIGHT, layers=6)
    soft_shadow(img, lay, (5, 4), 6, 100)
    img.alpha_composite(lay)

    ent_head(img)
    for y in STUMPS:
        stump(img, 56, y)
    leaves(img)

def ent_head(img):
    lay = Image.new('RGBA', img.size, (0, 0, 0, 0))
    cx, cy = 128, 78
    # massa de madeira: muitos cipós verticais formando o rosto
    for k in range(13):
        x0 = cx - 66 + k * 11
        bulge = 1 - abs(k - 6) / 7
        pts = [(x0 - 10, -20), (x0 + rng.uniform(-4, 4), cy - 40), (x0 + (k - 6) * 1.5, cy + 20 + 30 * bulge), (x0 - 30 + (k - 6) * 3 - 20 * (1 - bulge), cy + 110 + 40 * bulge)]
        tube(lay, catmull(pts, 12), lambda t, b=bulge: (13 + 6 * b) * (1 - 0.55 * t), (40, 56, 14), (104, 124, 36), (176, 192, 80), layers=9, grain=((34, 44, 10, 160), 2))
    d = ImageDraw.Draw(lay)
    # testa / sobrancelhas grossas
    for side in (-1, 1):
        brow = [(cx + side * 6, cy - 14), (cx + side * 22, cy - 26), (cx + side * 44, cy - 22), (cx + side * 52, cy - 10)]
        tube(lay, catmull(brow, 10), lambda t: 13 - 5 * t, (46, 60, 14), (120, 140, 40), (200, 212, 100), layers=9)
    # órbitas fundas
    for side in (-1, 1):
        ex, ey = cx + side * 26, cy - 4
        for i in range(10):
            f = i / 9
            col = lerp((70, 86, 22), (12, 18, 2), f)
            ellipse(lay, ex, ey + f * 1.5, 15 * (1 - 0.55 * f), 9 * (1 - 0.55 * f), col + (255,))
        # olho amarelo pequeno e severo
        ellipse(lay, ex + side * 1, ey + 1, 5, 3.4, (232, 220, 70, 255))
        ellipse(lay, ex + side * 1, ey + 1, 2, 2.6, (30, 20, 0, 255))
        ellipse(lay, ex - 1.5, ey - 0.5, 1.2, 1, (255, 255, 230, 255))
    # nariz comprido
    tube(lay, catmull([(cx, cy - 12), (cx + 2, cy + 10), (cx + 4, cy + 30), (cx - 2, cy + 40)], 12), lambda t: 11 + 5 * t, (44, 58, 14), (120, 140, 40), (206, 218, 110), layers=10)
    # boca
    d = ImageDraw.Draw(lay)
    mouth = catmull([(cx - 24, cy + 52), (cx - 6, cy + 60), (cx + 12, cy + 58), (cx + 26, cy + 50)], 10)
    d.line([(x * S, y * S) for x, y in mouth], fill=(16, 22, 4, 255), width=5 * S, joint='curve')
    d.line([(x * S, (y + 3) * S) for x, y in mouth], fill=(150, 168, 60, 180), width=2 * S, joint='curve')
    # barba de cipós caindo
    for k in range(9):
        x0 = cx - 40 + k * 10
        pts = [(x0, cy + 62), (x0 - 6 + rng.uniform(-6, 6), cy + 100), (x0 - 20 + rng.uniform(-8, 8), cy + 140), (x0 - 34 + rng.uniform(-10, 4), cy + 170 + rng.uniform(-10, 30))]
        tube(lay, catmull(pts, 10), lambda t: 9 * (1 - 0.8 * t) + 1.5, (34, 50, 12), (96, 120, 32), (170, 190, 76), layers=7)
    soft_shadow(img, lay, (5, 5), 6, 110)
    img.alpha_composite(lay)

def leaves(img):
    lay = Image.new('RGBA', img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(lay)
    spots = [(20, 160), (98, 210), (14, 300), (100, 320), (16, 420), (98, 430), (30, 540), (110, 548)]
    for (x, y) in spots:
        for k in range(rng.randint(2, 4)):
            a = rng.uniform(-math.pi, 0)
            L = rng.uniform(12, 20)
            tipx, tipy = x + math.cos(a) * L, y + math.sin(a) * L
            nx, ny = -math.sin(a) * L * 0.32, math.cos(a) * L * 0.32
            mx, my = (x + tipx) / 2, (y + tipy) / 2
            leaf = [(x * S, y * S), ((mx + nx) * S, (my + ny) * S), (tipx * S, tipy * S), ((mx - nx) * S, (my - ny) * S)]
            d.polygon(leaf, fill=(54, 120, 26, 255), outline=(26, 66, 10, 255))
            d.polygon([(x * S, y * S), ((mx + nx * 0.6) * S, (my + ny * 0.6) * S), (tipx * S, tipy * S)], fill=(110, 178, 56, 255))
            d.line([(x * S, y * S), (tipx * S, tipy * S)], fill=(30, 80, 14, 255), width=S)
    img.alpha_composite(lay)

# ---------------------------------------------------------------------------
# Árvore vermelha (direita)
# ---------------------------------------------------------------------------
PODS = STUMPS

def right_tree(img):
    lay = Image.new('RGBA', img.size, (0, 0, 0, 0))
    # raízes
    roots = [
        [(W - 70, 600), (W - 140, 614), (W - 220, 628), (W - 320, 646), (W - 360, 656)],
        [(W - 60, 592), (W - 130, 598), (W - 200, 596)],
        [(W - 40, 610), (W - 80, 636), (W - 120, 660)],
        [(W - 30, 600), (W + 10, 620)],
    ]
    for r in roots:
        tube(lay, catmull(r, 14), lambda t: 14 * (1 - 0.75 * t) + 3, (52, 14, 8), (128, 48, 24), (196, 102, 62), layers=8, grain=((40, 10, 6, 170), 3))
    # tronco fibroso: muitas fibras finas seguindo uma curva central
    def center(t):  # t=0 chão, t=1 topo
        y = 650 - t * 600
        x = W - 58 + 16 * math.sin(t * 6.0) - 30 * t ** 3
        return x, y
    cols = [((48, 12, 6), (122, 44, 22), (190, 96, 56)), ((60, 18, 8), (146, 58, 28), (214, 120, 72)), ((40, 10, 6), (100, 34, 18), (164, 76, 44))]
    for f in range(30):
        side = (f / 29 - 0.5) * 2
        ph = rng.uniform(0, 6.28)
        amp = rng.uniform(2, 6)
        pts = []
        for i in range(0, 61):
            t = i / 60
            x, y = center(t)
            width = 40 - 8 * t
            pts.append((x + side * width + amp * math.sin(t * 14 + ph), y))
        c = cols[f % 3]
        tube(lay, catmull(pts, 3), lambda t: rng.choice([5, 6, 7]) if False else 6.5, *c, layers=5)
    soft_shadow(img, lay, (-5, 4), 6, 100)
    img.alpha_composite(lay)
    ram_skull(img)
    for y in PODS:
        pod(img, W - 58, y)

def pod(img, cx, cy, rx=46, ry=24):
    lay = Image.new('RGBA', img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(lay)
    # base cônica que prende o ninho no tronco
    for i in range(20):
        f = i / 19
        col = lerp((70, 28, 66), (150, 86, 146), max(0, 1 - abs(f - 0.35) * 2))
        w = rx * (1 - 0.7 * f)
        d.ellipse([(cx - w) * S, (cy + 4 + f * 30 - ry * 0.6) * S, (cx + w) * S, (cy + 4 + f * 30 + ry * 0.6) * S], fill=col + (255,))
    # aro externo
    for i in range(12):
        f = i / 11
        col = lerp((110, 52, 106), (226, 168, 220), f)
        ellipse(lay, cx - 3 * f, cy - 3 * f, rx * (1 - 0.1 * f), ry * (1 - 0.12 * f), col + (255,))
    # interior em espiral
    for i in range(14):
        f = i / 13
        col = lerp((176, 104, 170), (120, 56, 118), f)
        ellipse(lay, cx + 1, cy + 2 * f, rx * 0.8 * (1 - 0.8 * f), ry * 0.72 * (1 - 0.8 * f), col + (255,))
    for k in range(4):
        r1, r2 = rx * (0.18 + k * 0.15), ry * (0.18 + k * 0.15)
        d.arc([(cx - r1) * S, (cy - r2 + 2) * S, (cx + r1) * S, (cy + r2 + 2) * S], 200 + k * 30, 470 + k * 30, fill=(214, 156, 208, 200), width=S + 1)
    # espinhos claros na borda
    for k in range(22):
        a = k / 22 * math.pi * 2
        bx, by = cx + math.cos(a) * rx * 0.97, cy + math.sin(a) * ry * 0.97
        tx, ty = cx + math.cos(a) * (rx + 7), cy + math.sin(a) * (ry + 5)
        nx, ny = -math.sin(a) * 2.6, math.cos(a) * 2.0
        d.polygon([((bx + nx) * S, (by + ny) * S), (tx * S, ty * S), ((bx - nx) * S, (by - ny) * S)], fill=(244, 226, 236, 255), outline=(120, 70, 110, 255))
    soft_shadow(img, lay, (-3, 5), 4, 120)
    img.alpha_composite(lay)

def ram_skull(img):
    lay = Image.new('RGBA', img.size, (0, 0, 0, 0))
    cx, cy = W - 120, 80
    # juba de pelos vermelhos atrás
    for k in range(40):
        a = rng.uniform(-0.3, math.pi + 0.3)
        L = rng.uniform(40, 80)
        x0, y0 = cx + rng.uniform(-20, 30), cy - 10
        pts = [(x0, y0), (x0 + math.cos(a) * L * 0.5, y0 + abs(math.sin(a)) * L * 0.5 + 10), (x0 + math.cos(a) * L, y0 + L * 0.9 + 10)]
        tube(lay, catmull(pts, 8), lambda t: 6 * (1 - 0.7 * t) + 1, (52, 14, 8), (140, 54, 26), (206, 112, 66), layers=5)
    # chifres curvos (dois, com estrias)
    for side in (-1, 1):
        hx, hy = cx + side * 26, cy - 30
        pts = []
        for i in range(48):
            t = i / 47
            ang = -math.pi / 2 - side * (0.2 + t * 4.4)
            r = 40 * (1 - 0.62 * t)
            pts.append((hx + side * 18 + math.cos(ang) * r * (1 if side > 0 else 1), hy + 26 + math.sin(ang) * r * 1.1))
        pts = pts[::-1]
        tube(lay, pts, lambda t: 6 + 16 * t, (110, 92, 70), (210, 196, 170), (250, 244, 230), layers=10)
        d = ImageDraw.Draw(lay)
        for i in range(4, len(pts) - 1, 3):
            t = i / len(pts)
            (x0, y0), (x1, y1) = pts[i], pts[i + 1]
            dx, dy = x1 - x0, y1 - y0
            L = math.hypot(dx, dy) or 1
            nx, ny = -dy / L, dx / L
            w = (6 + 16 * t) * 0.48
            d.line([((x0 + nx * w) * S, (y0 + ny * w) * S), ((x0 - nx * w) * S, (y0 - ny * w) * S)], fill=(120, 100, 76, 200), width=S)
    # crânio comprido
    d = ImageDraw.Draw(lay)
    skull = catmull([(cx - 26, cy - 34), (cx + 26, cy - 34), (cx + 30, cy), (cx + 16, cy + 44), (cx + 8, cy + 66), (cx - 8, cy + 66), (cx - 16, cy + 44), (cx - 30, cy), (cx - 26, cy - 34)], 10)
    d.polygon([(x * S, y * S) for x, y in skull], fill=(196, 180, 156, 255))
    for i in range(10):
        f = i / 9
        col = lerp((196, 180, 156), (246, 238, 220), f)
        ellipse(lay, cx - 6 * f, cy - 4 - 10 * f, 26 * (1 - 0.6 * f), 30 * (1 - 0.6 * f), col + (255,))
    d.line([(x * S, y * S) for x, y in skull], fill=(70, 56, 40, 255), width=2 * S, joint='curve')
    # órbitas
    for side in (-1, 1):
        ex, ey = cx + side * 15, cy + 2
        d.polygon([((ex - side * 10) * S, (ey - 6) * S), ((ex + side * 10) * S, (ey - 10) * S), ((ex + side * 8) * S, (ey + 8) * S), ((ex - side * 6) * S, (ey + 6) * S)], fill=(28, 14, 8, 255))
        ellipse(lay, ex + side * 1, ey, 2.5, 2.5, (250, 150, 40, 255))
    # focinho
    ellipse(lay, cx - 4, cy + 50, 3, 5, (40, 26, 14, 255))
    ellipse(lay, cx + 4, cy + 50, 3, 5, (40, 26, 14, 255))
    d.line([(cx * S, (cy - 26) * S), (cx * S, (cy + 36) * S)], fill=(150, 132, 110, 200), width=S)
    soft_shadow(img, lay, (-4, 5), 6, 120)
    img.alpha_composite(lay)

# ---------------------------------------------------------------------------
# Moldura amarela pontilhada
# ---------------------------------------------------------------------------
def frame(img, bw=8):
    d = ImageDraw.Draw(img)
    for (x0, y0, x1, y1) in [(0, 0, W, bw), (0, H - bw, W, H), (0, 0, bw, H), (W - bw, 0, W, H)]:
        d.rectangle([x0 * S, y0 * S, x1 * S, y1 * S], fill=(246, 214, 20, 255))
        area = (x1 - x0) * (y1 - y0)
        for i in range(int(area / 9)):
            x = rng.uniform(x0 + 1, x1 - 1); y = rng.uniform(y0 + 1, y1 - 1)
            r = rng.uniform(0.5, 1.1)
            ellipse(img, x, y, r, r, (30, 24, 0, 255))
    d.rectangle([bw * S, bw * S, (W - bw) * S, (H - bw) * S], outline=(120, 96, 0, 255), width=S)

def main(out):
    img = paint_ground()
    left_tree(img)
    right_tree(img)
    frame(img)
    small = img.resize((W, H), Image.LANCZOS).convert('RGB')
    small.save(out)

if __name__ == '__main__':
    main(sys.argv[1])
