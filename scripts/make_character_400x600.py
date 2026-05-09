from pathlib import Path
from PIL import Image
import sys

src = Path(sys.argv[1])
dst = Path(sys.argv[2])
dst.parent.mkdir(parents=True, exist_ok=True)

img = Image.open(src).convert('RGBA')
alpha = img.getchannel('A')
bbox = alpha.getbbox()
if bbox:
    char = img.crop(bbox)
else:
    char = img

canvas_w, canvas_h = 400, 600
canvas = Image.new('RGBA', (canvas_w, canvas_h), (0, 0, 0, 0))

# Match existing base character assets: transparent 400x600, head starts near y=90, feet at bottom.
target_h = 510
target_w = 300
scale = min(target_w / char.width, target_h / char.height)
new_size = (max(1, int(char.width * scale)), max(1, int(char.height * scale)))
char = char.resize(new_size, Image.Resampling.LANCZOS)

x = (canvas_w - new_size[0]) // 2
y = canvas_h - new_size[1]
canvas.alpha_composite(char, (x, y))
canvas.save(dst)
print(dst)
