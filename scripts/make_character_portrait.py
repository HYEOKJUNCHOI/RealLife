from pathlib import Path
from PIL import Image
import sys

src = Path(sys.argv[1])
dst = Path(sys.argv[2])
dst.parent.mkdir(parents=True, exist_ok=True)

img = Image.open(src).convert('RGBA')
alpha = img.getchannel('A')
bbox = alpha.getbbox()
if not bbox:
    img.save(dst)
    print(dst)
    raise SystemExit

left, top, right, bottom = bbox
width = right - left
height = bottom - top

# Portrait crop: keep full head + upper torso, similar to existing roster heads.
crop_left = max(0, int(left - width * 0.18))
crop_right = min(img.width, int(right + width * 0.18))
crop_top = max(0, int(top - height * 0.06))
crop_bottom = min(img.height, int(top + height * 0.62))
portrait = img.crop((crop_left, crop_top, crop_right, crop_bottom))

canvas_size = 1024
canvas = Image.new('RGBA', (canvas_size, canvas_size), (0, 0, 0, 0))

# Fill most of the square but leave breathing room for circular masks.
max_w = int(canvas_size * 0.86)
max_h = int(canvas_size * 0.90)
scale = min(max_w / portrait.width, max_h / portrait.height)
new_size = (max(1, int(portrait.width * scale)), max(1, int(portrait.height * scale)))
portrait = portrait.resize(new_size, Image.Resampling.LANCZOS)

x = (canvas_size - new_size[0]) // 2
y = int(canvas_size * 0.06)
canvas.alpha_composite(portrait, (x, y))
canvas.save(dst)
print(dst)
