import numpy as np, math
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage

def shade_mask(mask, R, dark, mid, light, L=(-0.5, -0.75, 0.55), spec=0.0, ambient=0.18, tex=None, tex_amt=0.0):
    """Sombreia uma silhueta (mask L 0..255) como se fosse um volume arredondado.
    R: raio (px na escala da máscara) até onde a borda arredonda."""
    m = np.asarray(mask, np.float32) / 255.0
    inside = m > 0.5
    dt = ndimage.distance_transform_edt(inside).astype(np.float32)
    dt = ndimage.gaussian_filter(dt, 1.2)
    h = np.clip(dt / R, 0, 1)
    gy, gx = np.gradient(dt)
    gl = np.sqrt(gx * gx + gy * gy) + 1e-6
    # normal: aponta para fora na borda (contra o gradiente), para cima no meio
    s = np.sqrt(np.clip(1 - h * h, 0, 1))
    hz = np.sqrt(np.clip(1 - (1 - h) ** 2, 0, 1))
    nx, ny, nz = -gx / gl * (1 - hz) , -gy / gl * (1 - hz), hz
    nn = np.sqrt(nx * nx + ny * ny + nz * nz) + 1e-6
    nx, ny, nz = nx / nn, ny / nn, nz / nn
    Lv = np.array(L, np.float32); Lv /= np.linalg.norm(Lv)
    dif = np.clip(nx * Lv[0] + ny * Lv[1] + nz * Lv[2], 0, 1)
    v = ambient + (1 - ambient) * dif
    if tex is not None:
        v = v * (1 - tex_amt + tex_amt * tex)
    v = np.clip(v, 0, 1)[..., None]
    dark, mid, light = [np.array(c[:3], np.float32) for c in (dark, mid, light)]
    col = np.where(v < 0.5, dark + (mid - dark) * (v / 0.5), mid + (light - mid) * ((v - 0.5) / 0.5))
    if spec > 0:
        H = Lv + np.array([0, 0, 1], np.float32); H /= np.linalg.norm(H)
        sp = np.clip(nx * H[0] + ny * H[1] + nz * H[2], 0, 1) ** 24 * spec
        col = col + (255 - col) * sp[..., None]
    out = np.zeros(m.shape + (4,), np.uint8)
    out[..., :3] = np.clip(col, 0, 255).astype(np.uint8)
    out[..., 3] = (m * 255).astype(np.uint8)
    return Image.fromarray(out, 'RGBA')

def line_mask(size, path, widths, S):
    """Máscara de um traço de largura variável ao longo de path (coords 1x)."""
    mk = Image.new('L', size, 0)
    d = ImageDraw.Draw(mk)
    n = len(path)
    for i in range(n - 1):
        t = i / (n - 1)
        w = widths(t) * S
        (x0, y0), (x1, y1) = path[i], path[i + 1]
        d.line([(x0 * S, y0 * S), (x1 * S, y1 * S)], fill=255, width=max(1, int(w)))
        r = w / 2
        d.ellipse([x1 * S - r, y1 * S - r, x1 * S + r, y1 * S + r], fill=255)
    r = widths(0) * S / 2
    d.ellipse([path[0][0] * S - r, path[0][1] * S - r, path[0][0] * S + r, path[0][1] * S + r], fill=255)
    return mk

def shade_into(img, mask, R, dark, mid, light, pad=6, **kw):
    """Sombreia só a região ocupada pela máscara e compõe sobre img."""
    bb = mask.getbbox()
    if not bb:
        return None
    x0, y0, x1, y1 = max(0, bb[0] - pad), max(0, bb[1] - pad), min(mask.width, bb[2] + pad), min(mask.height, bb[3] + pad)
    sub = mask.crop((x0, y0, x1, y1))
    tex = kw.pop('tex', None)
    if tex is not None:
        kw['tex'] = tex[y0:y1, x0:x1]
    lay = shade_mask(sub, R, dark, mid, light, **kw)
    img.alpha_composite(lay, (x0, y0))
    return (x0, y0, lay)

def drop_shadow(img, mask, off, blur, alpha):
    sh = Image.new('RGBA', img.size, (0, 0, 0, 0))
    a = mask.point(lambda v: v * alpha // 255)
    sh.putalpha(a)
    sh = sh.filter(ImageFilter.GaussianBlur(blur))
    img.alpha_composite(sh, off)
