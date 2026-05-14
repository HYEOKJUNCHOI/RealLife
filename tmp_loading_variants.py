from PIL import Image, ImageDraw
from pathlib import Path

src = Path('C:/Users/gurwn/Desktop/Project/RealLife/public/ui/start-loading-frame.png')
im = Image.open(src).convert('RGBA')
w, h = im.size
x1, y1, x2, y2 = 360, 102, 1604, 201

# A. 누끼: central colorful/bright gauge pixels only transparent, preserve dark frame/shadow edges as much as possible
nukki = im.copy()
p = nukki.load()
for y in range(y1, y2):
    for x in range(x1, x2):
        r, g, b, a = p[x, y]
        if a == 0:
            continue
        mx = max(r, g, b)
        mn = min(r, g, b)
        sat = (mx - mn) / max(mx, 1)
        val = mx / 255
        # remove colored/bright fill; keep almost-black outlines/shadows
        if (sat > 0.12 and val > 0.16) or val > 0.72:
            p[x, y] = (r, g, b, 0)

out1 = Path('C:/Users/gurwn/.openclaw/workspace/reallife-loading-frame-nukki.png')
nukki.save(out1)

# B. 도려냄: rounded rectangular hole through full slot area
cut = im.copy()
mask = Image.new('L', (w, h), 0)
d = ImageDraw.Draw(mask)
d.rounded_rectangle([x1, y1, x2, y2], radius=18, fill=255)
alpha = cut.getchannel('A')
alpha.paste(0, mask=mask)
cut.putalpha(alpha)
out2 = Path('C:/Users/gurwn/.openclaw/workspace/reallife-loading-frame-cut-hard.png')
cut.save(out2)

# comparison preview on checker background
scale = 0.42
ow, oh = int(w * scale), int(h * scale)
imgs = [
    ('A. 중간 색만 누끼', nukki.resize((ow, oh), Image.LANCZOS)),
    ('B. 중간 통째 도려냄', cut.resize((ow, oh), Image.LANCZOS)),
]
pad = 36
label_h = 42
gap = 28
canvas = Image.new('RGBA', (ow * 2 + gap + pad * 2, oh + label_h + pad * 2), (246, 241, 230, 255))
d = ImageDraw.Draw(canvas)

def checker(x, y, ww, hh):
    s = 12
    for yy in range(y, y + hh, s):
        for xx in range(x, x + ww, s):
            col = (220, 220, 220, 255) if ((xx - x) // s + (yy - y) // s) % 2 == 0 else (250, 250, 250, 255)
            d.rectangle([xx, yy, min(xx + s, x + ww), min(yy + s, y + hh)], fill=col)

for i, (label, img) in enumerate(imgs):
    x = pad + i * (ow + gap)
    y = pad + label_h
    checker(x, y, ow, oh)
    canvas.alpha_composite(img, (x, y))
    d.text((x, pad), label, fill=(20, 20, 20, 255))

out3 = Path('C:/Users/gurwn/.openclaw/workspace/reallife-loading-frame-nukki-vs-cut.png')
canvas.convert('RGB').save(out3, quality=95)
print(out1)
print(out2)
print(out3)
