from PIL import Image, ImageDraw, ImageFont, ImageFilter
from pathlib import Path

root = Path(r'C:\Users\gurwn\Desktop\Project\RealLife')
out = root / 'public' / 'pwa'
out.mkdir(parents=True, exist_ok=True)


def font(size, bold=True):
    candidates = [
        r'C:\Windows\Fonts\impact.ttf',
        r'C:\Windows\Fonts\arialbd.ttf',
        r'C:\Windows\Fonts\segoeuib.ttf',
    ] if bold else [r'C:\Windows\Fonts\arial.ttf']
    for c in candidates:
        p = Path(c)
        if p.exists():
            return ImageFont.truetype(str(p), size)
    return ImageFont.load_default()


def round_mask(size, radius):
    m = Image.new('L', (size, size), 0)
    d = ImageDraw.Draw(m)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
    return m


def make_icon(size):
    scale = size / 1024
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    bg = Image.new('RGBA', (size, size))
    bd = ImageDraw.Draw(bg)
    for y in range(size):
        t = y / (size - 1)
        r = int(14 * (1 - t) + 225 * t)
        g = int(19 * (1 - t) + 45 * t)
        b = int(32 * (1 - t) + 57 * t)
        bd.line([(0, y), (size, y)], fill=(r, g, b, 255))

    bd.polygon([(0, int(size * .60)), (size, int(size * .33)), (size, size), (0, size)], fill=(214, 31, 48, 235))
    bd.polygon([(0, int(size * .56)), (size, int(size * .29)), (size, int(size * .36)), (0, int(size * .64))], fill=(255, 217, 94, 230))

    step = max(1, int(size * .055))
    for i, x in enumerate(range(int(size * .04), int(size * .96), step)):
        h = int(size * (0.10 + 0.08 * ((i * 37) % 10) / 10))
        y = int(size * .58) - h
        bd.rounded_rectangle([x, y, x + int(size * .035), int(size * .58)], radius=max(1, int(4 * scale)), fill=(7, 14, 24, 120))

    img.alpha_composite(bg)
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([int(size * .015), int(size * .015), int(size * .985), int(size * .985)], radius=int(210 * scale), outline=(255, 226, 138, 255), width=max(4, int(28 * scale)))
    d.rounded_rectangle([int(size * .045), int(size * .045), int(size * .955), int(size * .955)], radius=int(185 * scale), outline=(115, 75, 22, 190), width=max(2, int(10 * scale)))

    cx = size / 2
    top = int(size * .29)
    left = int(size * .25)
    right = int(size * .75)
    bottom = int(size * .80)
    shadow = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    pts = [(left, top), (right, top), (right, int(size * .58)), (cx, bottom), (left, int(size * .58))]
    sd.polygon(pts, fill=(0, 0, 0, 130))
    shadow = shadow.filter(ImageFilter.GaussianBlur(max(1, int(14 * scale))))
    img.alpha_composite(shadow)
    d = ImageDraw.Draw(img)
    d.polygon(pts, fill=(150, 17, 34, 255), outline=(88, 32, 18, 255))
    d.line([(cx, top), (cx, bottom)], fill=(230, 44, 60, 170), width=max(1, int(3 * scale)))
    d.line(pts + [pts[0]], fill=(255, 218, 112, 255), width=max(4, int(18 * scale)), joint='curve')
    d.line([
        (left + int(size * .035), top + int(size * .035)),
        (right - int(size * .035), top + int(size * .035)),
        (right - int(size * .045), int(size * .56)),
        (cx, bottom - int(size * .055)),
        (left + int(size * .045), int(size * .56)),
        (left + int(size * .035), top + int(size * .035)),
    ], fill=(106, 39, 18, 220), width=max(2, int(5 * scale)))

    text = 'RealLife'
    if size <= 192:
        f2 = font(int(size * .34))
        b = d.textbbox((0, 0), 'RL', font=f2, stroke_width=int(4 * scale))
        x2 = (size - (b[2] - b[0])) / 2
        y2 = int(size * .43) - (b[3] - b[1]) / 2
        d.rounded_rectangle([int(size * .20), int(size * .32), int(size * .80), int(size * .68)], radius=int(size * .07), fill=(137, 18, 33, 245), outline=(255, 218, 112, 255), width=max(2, int(8 * scale)))
        d.text((x2, y2), 'RL', font=f2, fill=(255, 238, 180, 255), stroke_width=int(4 * scale), stroke_fill=(87, 23, 18, 255))
    else:
        f = font(int(size * .145))
        bbox = d.textbbox((0, 0), text, font=f, stroke_width=int(5 * scale))
        tw = bbox[2] - bbox[0]
        th = bbox[3] - bbox[1]
        x = (size - tw) / 2
        y = int(size * .44) - th / 2
        d.text((x + int(4 * scale), y + int(5 * scale)), text, font=f, fill=(65, 20, 16, 190), stroke_width=int(5 * scale), stroke_fill=(65, 20, 16, 190))
        d.text((x, y), text, font=f, fill=(255, 238, 180, 255), stroke_width=int(5 * scale), stroke_fill=(97, 25, 20, 255))

    clipped = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    clipped.paste(img, (0, 0), round_mask(size, int(215 * scale)))
    return clipped


for s, name in [
    (1024, 'app-icon-1024.png'),
    (512, 'app-icon-512.png'),
    (192, 'app-icon-192.png'),
    (180, 'apple-touch-icon.png'),
    (167, 'apple-touch-icon-167.png'),
    (152, 'apple-touch-icon-152.png'),
    (120, 'apple-touch-icon-120.png'),
]:
    make_icon(s).save(out / name)

make_icon(1024).save(root / 'public' / 'app-icon.png')
make_icon(180).save(root / 'public' / 'apple-touch-icon.png')
make_icon(32).save(out / 'favicon-32.png')
make_icon(16).save(out / 'favicon-16.png')
make_icon(256).save(root / 'public' / 'favicon.ico', sizes=[(256, 256), (64, 64), (48, 48), (32, 32), (16, 16)])


def make_splash(w, h, name):
    img = Image.new('RGB', (w, h), (5, 5, 8))
    d = ImageDraw.Draw(img)
    for y in range(h):
        t = y / (h - 1)
        d.line([(0, y), (w, y)], fill=(int(8 + 22 * t), int(12 + 10 * t), int(22 + 15 * t)))
    d.polygon([(0, int(h * .62)), (w, int(h * .38)), (w, h), (0, h)], fill=(170, 21, 37))
    d.polygon([(0, int(h * .58)), (w, int(h * .34)), (w, int(h * .39)), (0, int(h * .64))], fill=(229, 183, 71))
    icon = make_icon(min(int(min(w, h) * 0.42), 620))
    ix = (w - icon.width) // 2
    iy = int(h * .42) - icon.height // 2
    img.paste(icon, (ix, iy), icon)
    f = font(max(48, int(min(w, h) * 0.075)))
    text = 'RealLife'
    bbox = d.textbbox((0, 0), text, font=f, stroke_width=4)
    tx = (w - (bbox[2] - bbox[0])) / 2
    ty = iy + icon.height + int(min(w, h) * .06)
    d.text((tx, ty), text, font=f, fill=(255, 239, 184), stroke_width=4, stroke_fill=(80, 18, 20))
    img.save(out / name)


make_splash(1206, 2622, 'splash-iphone17-portrait.png')
make_splash(2622, 1206, 'splash-iphone17-landscape.png')
make_splash(1620, 2160, 'splash-ipad-10-2-portrait.png')
make_splash(2160, 1620, 'splash-ipad-10-2-landscape.png')
print('generated', out)
