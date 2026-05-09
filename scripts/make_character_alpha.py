from pathlib import Path
from PIL import Image
import sys

src = Path(sys.argv[1])
dst = Path(sys.argv[2])
dst.parent.mkdir(parents=True, exist_ok=True)

img = Image.open(src).convert('RGBA')
pixels = img.load()
w, h = img.size

# Remove flat chroma green background while preserving darker olive uniform.
# Generated background target is #00FF00; use strict green dominance.
for y in range(h):
    for x in range(w):
        r, g, b, a = pixels[x, y]
        green_dominant = g > 135 and g > r * 1.45 and g > b * 1.45
        near_chroma = g > 170 and r < 120 and b < 140
        if green_dominant or near_chroma:
            # Soft alpha near edges: strongest green becomes fully transparent.
            dominance = min(255, max(0, g - max(r, b)))
            if dominance > 95:
                pixels[x, y] = (r, g, b, 0)
            else:
                pixels[x, y] = (r, g, b, int(a * 0.35))

# Crop transparent border, then place on 1024 square canvas with margin.
alpha = img.getchannel('A')
bbox = alpha.getbbox()
if bbox:
    cropped = img.crop(bbox)
    canvas_size = 1024
    margin = 72
    max_size = canvas_size - margin * 2
    scale = min(max_size / cropped.width, max_size / cropped.height)
    new_size = (max(1, int(cropped.width * scale)), max(1, int(cropped.height * scale)))
    cropped = cropped.resize(new_size, Image.Resampling.LANCZOS)
    canvas = Image.new('RGBA', (canvas_size, canvas_size), (0, 0, 0, 0))
    x = (canvas_size - new_size[0]) // 2
    y = (canvas_size - new_size[1]) // 2 + 18
    canvas.alpha_composite(cropped, (x, y))
    img = canvas

img.save(dst)
print(dst)
