from pathlib import Path
from PIL import Image, ImageFilter
import shutil
from datetime import datetime

OUT_DIR = Path('public/npc')
FILES = sorted(OUT_DIR.glob('host_*.png'))
BACKUP_DIR = OUT_DIR / ('backup-host-defringe-' + datetime.now().strftime('%Y%m%d-%H%M%S'))
BACKUP_DIR.mkdir(parents=True, exist_ok=True)

for path in FILES:
    shutil.copy2(path, BACKUP_DIR / path.name)
    img = Image.open(path).convert('RGBA')
    r, g, b, a = img.split()

    # Erode alpha by ~2px to remove white matte outline, then soften edge.
    eroded = a.filter(ImageFilter.MinFilter(5))
    soft = eroded.filter(ImageFilter.GaussianBlur(0.55))

    px = img.load()
    apx = a.load()
    epx = soft.load()
    w, h = img.size

    # For edge pixels that are very light/white, fade more aggressively.
    out = Image.new('RGBA', img.size, (0, 0, 0, 0))
    opx = out.load()
    for y in range(h):
        for x in range(w):
            rr, gg, bb, aa = px[x, y]
            na = epx[x, y]
            if aa == 0 or na == 0:
                continue
            mx, mn = max(rr, gg, bb), min(rr, gg, bb)
            # White-matte contamination on semi/edge pixels.
            if mx > 185 and mx - mn < 56:
                na = int(na * 0.45)
            elif mx > 210 and rr > 190 and gg > 190 and bb > 190:
                na = int(na * 0.3)
            # Slightly darken ultra-light fringe instead of showing white halo.
            if mx > 190 and mx - mn < 70:
                rr = int(rr * 0.72)
                gg = int(gg * 0.72)
                bb = int(bb * 0.72)
            opx[x, y] = (rr, gg, bb, na)

    out.save(path)
    print(path.name, out.getchannel('A').getbbox())
print('backup:', BACKUP_DIR)
