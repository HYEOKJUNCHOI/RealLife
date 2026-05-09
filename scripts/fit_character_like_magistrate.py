from pathlib import Path
from PIL import Image
import sys

src = Path(sys.argv[1])
dst = Path(sys.argv[2])
dst.parent.mkdir(parents=True, exist_ok=True)

img = Image.open(src).convert('RGBA')
bbox = img.getchannel('A').getbbox()
if not bbox:
    raise SystemExit('source has no alpha bbox')

char = img.crop(bbox)
# Exact magistrate.png footprint: canvas 400x600, bbox (82,90)-(317,600) = 235x510
char = char.resize((235, 510), Image.Resampling.LANCZOS)
canvas = Image.new('RGBA', (400, 600), (0, 0, 0, 0))
canvas.alpha_composite(char, (82, 90))
canvas.save(dst)
print(dst)
