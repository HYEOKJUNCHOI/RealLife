"""
캐릭터 4종 PNG 정규화 — 키 통일

원본:
  yangban.png   348×588
  general.png   312×599
  magistrate.png 273×593
  farmer.png    295×511

문제: 자연 픽셀 크기 다름 → 화면에서 같은 width로 렌더하면 키가 다 다르게 보임.

처리:
  1. 각 PNG의 alpha bbox 검출 (캐릭터 실제 영역)
  2. 비율 유지하며 캐릭터 높이를 TARGET_HEIGHT 으로 resize
  3. CANVAS (400×600) 투명 캔버스에 하단 중앙 정렬 paste
  4. 결과: 4 PNG 모두 동일 캔버스 + 캐릭터 발 같은 baseline

실행: python scripts/normalize_characters.py
"""

from pathlib import Path
from PIL import Image

ROOT = Path(__file__).parent.parent
CHAR_DIR = ROOT / "public" / "characters"

CHARACTERS = ["yangban", "general", "magistrate", "farmer"]

# 공통 캔버스 크기
CANVAS_W = 400
CANVAS_H = 600
# 캐릭터 높이 — 가장 작은 farmer (511) 기준
TARGET_HEIGHT = 510


def normalize_one(name: str) -> bool:
    src = CHAR_DIR / f"{name}.png"
    if not src.exists():
        print(f"  {name}: 파일 없음 ({src})")
        return False

    img = Image.open(src).convert("RGBA")
    bbox = img.getbbox()
    if not bbox:
        print(f"  {name}: bbox 없음 (전부 투명?)")
        return False

    # 캐릭터 영역 크롭
    cropped = img.crop(bbox)
    cw, ch = cropped.size

    # 캐릭터 높이를 TARGET_HEIGHT 으로 맞춤 (비율 유지)
    scale = TARGET_HEIGHT / ch
    new_w = max(1, round(cw * scale))
    new_h = TARGET_HEIGHT
    resized = cropped.resize((new_w, new_h), Image.LANCZOS)

    # 캔버스가 캐릭터보다 작으면 캔버스 확장 (안전망)
    canvas_w = max(CANVAS_W, new_w + 20)
    canvas_h = max(CANVAS_H, new_h + 20)

    # 투명 캔버스
    canvas = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
    # 하단 중앙 정렬
    px = (canvas_w - new_w) // 2
    py = canvas_h - new_h  # bottom 정렬
    canvas.paste(resized, (px, py), resized)

    canvas.save(src, "PNG", optimize=True)
    print(
        f"  {name}: {cw}×{ch} → 캐릭터 {new_w}×{new_h} on {canvas_w}×{canvas_h} canvas"
    )
    return True


def main() -> None:
    print("=" * 50)
    print(f"캐릭터 정규화 — target height {TARGET_HEIGHT} on {CANVAS_W}×{CANVAS_H}")
    print(f"폴더: {CHAR_DIR}")
    print("=" * 50)

    if not CHAR_DIR.exists():
        print(f"❌ 폴더 없음: {CHAR_DIR}")
        return

    ok = 0
    for name in CHARACTERS:
        if normalize_one(name):
            ok += 1

    print("=" * 50)
    print(f"{ok}/{len(CHARACTERS)} 정규화 완료")
    print("=" * 50)


if __name__ == "__main__":
    main()
