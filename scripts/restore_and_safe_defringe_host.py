from pathlib import Path
from PIL import Image
import shutil
from datetime import datetime

OUT_DIR = Path('public/npc')
# Restore from the backup made immediately before the too-aggressive defringe.
SRC_BACKUP = sorted(OUT_DIR.glob('backup-host-defringe-*'))[-1]
NEW_BACKUP = OUT_DIR / ('backup-host-before-safe-defringe-' + datetime.now().strftime('%Y%m%d-%H%M%S'))
NEW_BACKUP.mkdir(parents=True, exist_ok=True)

FILES = sorted(SRC_BACKUP.glob('host_*.png'))
for src in FILES:
    dst = OUT_DIR / src.name
    if dst.exists():
        shutil.copy2(dst, NEW_BACKUP / dst.name)
    shutil.copy2(src, dst)

# Safe defringe: never reduce alpha, never erase pixels. Only recolor near-white edge pixels.
def is_edge(alpha, x, y, radius=2):
    w, h = alpha.size
    for dy in range(-radius, radius + 1):
        for dx in range(-radius, radius + 1):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and alpha.getpixel((nx, ny)) == 0:
                return True
    return False

for path in sorted(OUT_DIR.glob('host_*.png')):
    img = Image.open(path).convert('RGBA')
    alpha = img.getchannel('A')
    px = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            mx, mn = max(r, g, b), min(r, g, b)
            # Only treat nearly white/gray pixels on the outer alpha boundary.
            if is_edge(alpha, x, y, 2) and mx > 190 and mx - mn < 55:
                # Keep opacity to avoid holes; just neutralize the white halo.
                px[x, y] = (int(r * 0.58), int(g * 0.58), int(b * 0.58), a)
    img.save(path)
    print(path.name, img.getchannel('A').getbbox())

print('restored from:', SRC_BACKUP)
print('backup current broken:', NEW_BACKUP)
