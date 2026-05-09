from pathlib import Path
from PIL import Image
import sys

src = Path(sys.argv[1])
dst = Path(sys.argv[2])
dst.parent.mkdir(parents=True, exist_ok=True)

img = Image.open(src).convert('RGBA')
pixels = img.load()
w, h = img.size

# Estimate light background from corners.
corners = [pixels[0,0], pixels[w-1,0], pixels[0,h-1], pixels[w-1,h-1]]
br = sum((r+g+b)/3 for r,g,b,a in corners) / len(corners)

for y in range(h):
    for x in range(w):
        r,g,b,a = pixels[x,y]
        mx, mn = max(r,g,b), min(r,g,b)
        brightness = (r+g+b)/3
        saturation = mx - mn
        # Remove near-white/gray studio background; keep colored character.
        if brightness > br - 32 and saturation < 28:
            pixels[x,y] = (r,g,b,0)
        elif brightness > br - 45 and saturation < 42:
            pixels[x,y] = (r,g,b,int(a*0.25))

bbox = img.getchannel('A').getbbox()
if not bbox:
    raise SystemExit('no foreground after bg removal')
char = img.crop(bbox)
char = char.resize((235, 510), Image.Resampling.LANCZOS)
canvas = Image.new('RGBA', (400,600), (0,0,0,0))
canvas.alpha_composite(char, (82,90))
canvas.save(dst)
print(dst)
