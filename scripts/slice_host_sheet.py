from collections import deque
from datetime import datetime
from pathlib import Path
from PIL import Image
import shutil

SRC = Path(r'C:\Users\gurwn\Desktop\사회자.png')
OUT_DIR = Path('public/npc')
BACKUP_DIR = OUT_DIR / ('backup-host-' + datetime.now().strftime('%Y%m%d-%H%M%S'))
NAMES = [
    ('host_a_closed.png', 'host_a_open.png'),
    ('host_b_closed.png', 'host_b_open.png'),
    ('host_c_closed.png', 'host_c_open.png'),
    ('host_d_closed.png', 'host_d_open.png'),
]
TARGET = (350, 330)

def remove_connected_black_bg(img, threshold=18):
    img = img.convert('RGBA')
    w, h = img.size
    px = img.load()
    seen = set()
    q = deque()

    def is_bg(x, y):
        r, g, b, a = px[x, y]
        return a > 0 and r <= threshold and g <= threshold and b <= threshold

    for x in range(w):
        for y in (0, h - 1):
            if is_bg(x, y):
                q.append((x, y)); seen.add((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if (x, y) not in seen and is_bg(x, y):
                q.append((x, y)); seen.add((x, y))

    while q:
        x, y = q.popleft()
        r, g, b, a = px[x, y]
        px[x, y] = (r, g, b, 0)
        for nx, ny in ((x+1,y), (x-1,y), (x,y+1), (x,y-1)):
            if 0 <= nx < w and 0 <= ny < h and (nx, ny) not in seen and is_bg(nx, ny):
                seen.add((nx, ny)); q.append((nx, ny))
    return img

def keep_largest_component(img):
    img = img.convert('RGBA')
    alpha = img.getchannel('A')
    ap = alpha.load()
    w, h = img.size
    seen = set()
    best_pixels = []

    for y in range(h):
        for x in range(w):
            if (x, y) in seen or ap[x, y] == 0:
                continue
            q = deque([(x, y)])
            seen.add((x, y))
            pixels = []
            while q:
                px, py = q.popleft()
                pixels.append((px, py))
                for nx, ny in ((px+1,py), (px-1,py), (px,py+1), (px,py-1)):
                    if 0 <= nx < w and 0 <= ny < h and (nx, ny) not in seen and ap[nx, ny] > 0:
                        seen.add((nx, ny))
                        q.append((nx, ny))
            if len(pixels) > len(best_pixels):
                best_pixels = pixels

    out = Image.new('RGBA', img.size, (0, 0, 0, 0))
    src = img.load()
    dst = out.load()
    for x, y in best_pixels:
        dst[x, y] = src[x, y]
    return out

def fit_to_canvas(img):
    bbox = img.getchannel('A').getbbox()
    if not bbox:
        return Image.new('RGBA', TARGET, (0, 0, 0, 0))
    fg = img.crop(bbox)
    tw, th = TARGET
    scale = min((tw - 2) / fg.width, (th - 2) / fg.height)
    nw, nh = max(1, round(fg.width * scale)), max(1, round(fg.height * scale))
    fg = fg.resize((nw, nh), Image.Resampling.LANCZOS)
    canvas = Image.new('RGBA', TARGET, (0, 0, 0, 0))
    x = (tw - nw) // 2
    y = th - nh
    canvas.alpha_composite(fg, (x, y))
    return canvas

def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    for row in NAMES:
        for name in row:
            p = OUT_DIR / name
            if p.exists():
                shutil.copy2(p, BACKUP_DIR / name)

    sheet = Image.open(SRC).convert('RGBA')
    w, h = sheet.size
    xs = [0, w // 2, w]
    ys = [round(i * h / 4) for i in range(5)]

    for r in range(4):
        for c in range(2):
            # Include extra lower overlap so feet/hem are not clipped by row cuts.
            # Any head from the next row is a separate component and is discarded below.
            y0 = max(0, ys[r] - 8)
            y1 = min(h, ys[r+1] + 80)
            crop = sheet.crop((xs[c], y0, xs[c+1], y1))
            crop = remove_connected_black_bg(crop)
            crop = keep_largest_component(crop)
            out = fit_to_canvas(crop)
            name = NAMES[r][c]
            out.save(OUT_DIR / name)
            print(name, out.size, out.getchannel('A').getbbox())
    print('backup:', BACKUP_DIR)

if __name__ == '__main__':
    main()
