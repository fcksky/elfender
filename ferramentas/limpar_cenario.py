import numpy as np, cv2
from PIL import Image
src = cv2.imread('ref/ref3.png')
img = src.copy()
H, W = img.shape[:2]
# 1) caixinhas 0-3: copia a caixinha vazia 4
sx0 = 503
tile = src[18:82, sx0:sx0 + 60].copy()
for i in range(4):
    x = int(round(sx0 - 59.9 * (4 - i)))
    img[18:82, x:x + 60] = tile
# 2) máscara de textos para apagar (inpaint)
mask = np.zeros((H, W), np.uint8)
g = cv2.cvtColor(src, cv2.COLOR_BGR2GRAY)
def dark_in(x0, y0, x1, y1, thr, dil=2):
    sub = (g[y0:y1, x0:x1] < thr).astype(np.uint8) * 255
    sub = cv2.dilate(sub, np.ones((3, 3), np.uint8), iterations=dil)
    mask[y0:y1, x0:x1] |= sub
def light_in(x0, y0, x1, y1, thr, dil=2):
    sub = (g[y0:y1, x0:x1] > thr).astype(np.uint8) * 255
    sub = cv2.dilate(sub, np.ones((3, 3), np.uint8), iterations=dil)
    mask[y0:y1, x0:x1] |= sub
dark_in(205, 22, 250, 46, 110)   # 13
dark_in(205, 52, 250, 78, 110)   # 17
# números das esferas: texto branco com contorno escuro
for (x0, x1) in [(24, 82), (942, 1002)]:
    light_in(x0, 40, x1, 64, 200, 2)
# frasco 100
cv2.circle(mask, (388, 581), 12, 255, -1)
cv2.imwrite('cena/mask_small.png', mask)
img = cv2.inpaint(img, mask, 5, cv2.INPAINT_TELEA)
cv2.imwrite('cena/step1.png', img)

# 3) aviso do broadcast: alto-falante e texto
b, gr, r = [src[..., i].astype(int) for i in range(3)]
m2 = np.zeros((H, W), np.uint8)
yy, xx = slice(80, 118), slice(25, 70)
yel = (r[yy, xx] > 170) & (gr[yy, xx] > 130) & (b[yy, xx] < 140)
wht = (r[yy, xx] > 175) & (gr[yy, xx] > 175) & (b[yy, xx] > 160)
sub = ((yel | wht).astype(np.uint8) * 255)
sub = cv2.morphologyEx(sub, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
m2[yy, xx] = cv2.dilate(sub, np.ones((3, 3), np.uint8), iterations=2)
ty, tx = slice(86, 107), slice(74, 396)
txt = (g[ty, tx] > 140).astype(np.uint8) * 255
m2[ty, tx] |= cv2.dilate(txt, np.ones((3, 3), np.uint8), iterations=2)
img = cv2.inpaint(img, m2, 5, cv2.INPAINT_TELEA)
# alto-falante: cobre com a textura da barba logo abaixo, com borda suave
mm = np.zeros((H, W), np.float32)
cv2.ellipse(mm, (46, 99), (25, 21), 0, 0, 360, 1, -1)
mm = cv2.GaussianBlur(mm, (0, 0), 3)
shift = 40
patch = np.roll(img, -shift, axis=0)
img = (img * (1 - mm[..., None]) + patch * mm[..., None]).astype(np.uint8)
# 4) clareia a faixa escura translúcida do aviso (y 84..108, x 60..1008)
f = img.astype(np.float32)
band = np.zeros((H, W), np.float32)
band[84:109, 60:1008] = 1
band = cv2.GaussianBlur(band, (0, 0), sigmaX=6, sigmaY=0.8)
gain = 1 + 0.72 * band
f = np.clip(f * gain[..., None], 0, 255)
img = f.astype(np.uint8)
cv2.imwrite('cena/clean.png', img)
