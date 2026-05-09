from pathlib import Path
from PIL import Image
import sys

src = Path(sys.argv[1])
dst = Path(sys.argv[2])
# target bbox copied from magistrate.png: left top right bottom
left, top, right, bottom = map(int, sys.argv[3:7])

dst.parent.mkdir(parents=True, exist_ok=True)
img = Image.open(src).convert('RGBA')
bbox = img.getchannel('A').getbbox()
if not bbox:
    img.save(dst)
    print(dst)
    raise SystemExit

char = img.crop(bbox)
target_w = right - left
target_h = bottom - top
scale = min(target_w / char.width, target_h / char.height)
new_size = (max(1, int(char.width * scale)), max(1, int(char.height * scale)))
char = char.resize(new_size, Image.Resampling.LANCZOS)

canvas = Image.new('RGBA', img.size, (0, 0, 0, 0))
x = left + (target_w - new_size[0]) // 2
y = bottom - new_size[1]
canvas.alpha_composite(char, (x, y))
canvas.save(dst)
print(dst)
