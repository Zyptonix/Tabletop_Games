from __future__ import annotations

import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
CARD_ROOT = ROOT / "apps" / "web" / "public" / "assets" / "uno" / "cards"
TARGET_HEIGHT = 720
TARGET_FOLDERS = [CARD_ROOT / "classic", CARD_ROOT / "no_mercy"]


def upscale_png(path: Path) -> tuple[int, int] | None:
    image = Image.open(path).convert("RGBA")
    width, height = image.size
    if height >= TARGET_HEIGHT:
        return (width, height)

    target_width = max(1, round(width * (TARGET_HEIGHT / height)))
    upscaled = image.resize((target_width, TARGET_HEIGHT), Image.Resampling.LANCZOS)
    upscaled.save(path, optimize=True)
    return (target_width, TARGET_HEIGHT)


def update_manifest(folder: Path, sizes: dict[str, tuple[int, int]]) -> None:
    manifest_path = folder / "manifest.json"
    if not manifest_path.exists():
        return

    data = json.loads(manifest_path.read_text(encoding="utf-8"))
    for item in data:
        file_name = item.get("file")
        if not isinstance(file_name, str):
            continue
        size = sizes.get(file_name.replace("\\", "/"))
        if not size:
            continue
        if "output_size" in item:
            item["output_size"] = [size[0], size[1]]
        if "size" in item:
            item["size"] = [size[0], size[1]]

    manifest_path.write_text(json.dumps(data, indent=2), encoding="utf-8")


def main() -> None:
    for folder in TARGET_FOLDERS:
      sizes: dict[str, tuple[int, int]] = {}
      for path in sorted(folder.rglob("*.png")):
          size = upscale_png(path)
          if size:
              sizes[path.relative_to(folder).as_posix()] = size
      update_manifest(folder, sizes)
      print(f"Checked {folder.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
