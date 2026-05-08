"""
콜라주 이미지 자동 분할 스크립트

사용법:
1. 콜라주 PNG를 public/_raw/{name}.png 에 저장
2. 아래 COLLAGE_CONFIG 매핑 확인
3. python scripts/split_collage.py

각 셀이 자동으로 public/{output_dir}/{id}.png 로 저장됨
"""

from PIL import Image
from pathlib import Path

# 프로젝트 루트
ROOT = Path(__file__).parent.parent
RAW = ROOT / "public" / "_raw"

# 콜라주 분할 매핑
# - rows × cols 그리드
# - cells: [row, col, id] 순서. id는 None이면 스킵 (변형/빈 셀)
COLLAGE_CONFIG = [
    # 캐릭터 4종 (1×4)
    {
        "src": "characters.png",
        "out_dir": "characters",
        "rows": 1,
        "cols": 4,
        "cells": [
            [0, 0, "general"],
            [0, 1, "magistrate"],
            [0, 2, "yangban"],
            [0, 3, "farmer"],
        ],
    },
    # NPC 2종 (1×2)
    {
        "src": "npc.png",
        "out_dir": "npc",
        "rows": 1,
        "cols": 2,
        "cells": [
            [0, 0, "realtor"],
            [0, 1, "loan_shark"],
        ],
    },
    # 컬러셋 스카이라인 (3×4 변형 포함)
    {
        "src": "skyline.png",
        "out_dir": "skyline",
        "rows": 3,
        "cols": 4,
        "cells": [
            [0, 0, "brown"],
            [0, 1, "lightblue"],
            [0, 2, "pink"],
            [1, 0, "orange"],
            [1, 3, "red"],
            [2, 0, "yellow"],
            [2, 1, "green"],
            [2, 2, "darkblue"],
        ],
    },
    # 이벤트 카드 7장 (2×4)
    {
        "src": "event.png",
        "out_dir": "cards/event",
        "rows": 2,
        "cols": 4,
        "cells": [
            [0, 0, "war"],
            [0, 1, "regulation"],
            [0, 2, "fire"],
            [0, 3, "bubble"],
            [1, 0, "redevelopment"],
            [1, 1, "gtx"],
            [1, 2, "subscription"],
        ],
    },
    # 찬스 카드 12장 (3×5 변형 포함)
    {
        "src": "chance.png",
        "out_dir": "cards/chance",
        "rows": 3,
        "cols": 5,
        "cells": [
            [0, 0, "marriage"],
            [0, 1, "job_change"],
            [0, 2, "promotion"],
            [0, 3, "startup"],
            # 결혼 큰 박스 [0, 4]는 변형 스킵
            [1, 0, "childbirth"],
            # [1, 1] 변형 스킵
            [1, 2, "honor_retire"],
            [1, 3, "military"],
            [1, 4, "holiday_bonus"],
            [2, 0, "accident"],
            # [2, 1] 변형 스킵
            [2, 2, "lotto"],
            [2, 3, "subscription_win"],
            [2, 4, "teleport"],
        ],
    },
    # 복지 카드 10장 (받으면 채울 매핑)
    {
        "src": "welfare.png",
        "out_dir": "cards/welfare",
        "rows": 3,
        "cols": 4,
        "cells": [
            [0, 0, "covid"],
            [0, 1, "work_incentive"],
            [0, 2, "basic_pension"],
            [0, 3, "health_check"],
            [1, 0, "national_pension"],
            [1, 1, "community_fee"],
            [1, 2, "relative_wedding"],
            [1, 3, "housing_subscription"],
            [2, 0, "childbirth_grant"],
            [2, 1, "fraud_caught"],
        ],
    },
]


def split_one(config):
    src_path = RAW / config["src"]
    if not src_path.exists():
        print(f"⏭️  스킵 (파일 없음): {src_path}")
        return 0

    img = Image.open(src_path).convert("RGBA")
    W, H = img.size
    rows, cols = config["rows"], config["cols"]
    cell_w = W // cols
    cell_h = H // rows

    out_dir = ROOT / "public" / config["out_dir"]
    out_dir.mkdir(parents=True, exist_ok=True)

    count = 0
    for row, col, cid in config["cells"]:
        if cid is None:
            continue
        left = col * cell_w
        top = row * cell_h
        right = left + cell_w
        bottom = top + cell_h
        cell = img.crop((left, top, right, bottom))
        out_path = out_dir / f"{cid}.png"
        cell.save(out_path, "PNG")
        count += 1
        print(f"  ✅ {config['out_dir']}/{cid}.png ({cell_w}×{cell_h})")

    print(f"  → {count}장 저장 완료\n")
    return count


def main():
    print("=" * 50)
    print("THE REALLIFE — 콜라주 일괄 분할 스크립트")
    print("=" * 50)
    print(f"입력 폴더: {RAW}")
    print()

    if not RAW.exists():
        print(f"❌ {RAW} 폴더가 없습니다. 콜라주 PNG를 먼저 저장하세요.")
        return

    total = 0
    for config in COLLAGE_CONFIG:
        print(f"📦 {config['src']} → public/{config['out_dir']}/")
        total += split_one(config)

    print("=" * 50)
    print(f"🎉 총 {total}장 분할 완료")
    print("=" * 50)


if __name__ == "__main__":
    main()
