from pathlib import Path
from PIL import Image
import shutil
from datetime import datetime

OUT_DIR = Path('public/npc')
BACKUP_DIR = OUT_DIR / ('backup-host-white-outline-' + datetime.now().strftime('%Y%m%d-%H%M%S'))
FILES = sorted(OUT_DIR.glob('host_*.png'))
BACKUP_DIR.mkdir(parents=True, exist_ok=True)

for path in FILES:
    shutil.copy2(path, BACKUP_DIR / path.name)
    img = Image.open(path).convert('RGBA')
    px = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            # Remove near-white sheet outline/label remnants while keeping colored character.
            if r > 218 and g > 218 and b > 218 and max(r, g, b) - min(r, g, b) < 34:
                px[x, y] = (r, g, b, 0)
            elif r > 190 and g > 190 and b > 190 and max(r, g, b) - min(r, g, b) < 28:
                px[x, y] = (r, g, b, int(a * 0.28))
    img.save(path)
    print(path.name, img.getchannel('A').getbbox())
print('backup:', BACKUP_DIR)
