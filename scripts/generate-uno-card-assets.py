from __future__ import annotations

import shutil
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
RESOURCES = ROOT / "resources"
PUBLIC_UNO = ROOT / "apps" / "web" / "public" / "assets" / "uno"
SPRITES = PUBLIC_UNO / "sprites"
CARDS = PUBLIC_UNO / "cards"
LEGACY_THEMES = ROOT / "apps" / "web" / "public" / "card-themes"

OUTPUT_HEIGHT = 720
COLORS = ["red", "yellow", "green", "blue"]
NUMBER_VALUES = [str(value) for value in range(10)]
STANDARD_ACTIONS = ["skip", "reverse", "draw-two"]
NO_MERCY_ACTIONS = ["draw-four", "comeback", "discard-all"]
WILD_KEYS = ["wild", "wild-draw-four", "wild-draw-four-reverse", "wild-draw-six", "wild-draw-ten", "wild-roulette"]

ACCENTS = {
    "red": (255, 59, 48),
    "yellow": (255, 201, 40),
    "green": (30, 215, 96),
    "blue": (45, 140, 255),
    "wild": (245, 245, 245),
}


def ensure_dirs() -> None:
    SPRITES.mkdir(parents=True, exist_ok=True)
    for theme in ["classic", "minimal"]:
        (CARDS / theme).mkdir(parents=True, exist_ok=True)


def reset_generated_cards() -> None:
    for theme in ["classic", "minimal"]:
        folder = CARDS / theme
        if folder.exists():
            shutil.rmtree(folder)
        folder.mkdir(parents=True, exist_ok=True)


def copy_sprite_sources() -> None:
    # 04_12 is the colorful sheet; 03_48 is the modern black/minimal sheet.
    shutil.copyfile(RESOURCES / "ChatGPT Image May 30, 2026, 04_12_22 PM.png", SPRITES / "classic-full-deck.png")
    shutil.copyfile(RESOURCES / "ChatGPT Image May 30, 2026, 03_48_00 PM (2).png", SPRITES / "minimal-full-deck.png")
    shutil.copyfile(RESOURCES / "Classic back plate.png", SPRITES / "classic-back.png")


def upscale_to_height(image: Image.Image, height: int = OUTPUT_HEIGHT) -> Image.Image:
    image = image.convert("RGBA")
    width = max(1, round(image.width * (height / image.height)))
    return image.resize((width, height), Image.Resampling.LANCZOS)


def save_crop(source: Image.Image, box: tuple[int, int, int, int], destination: Path, pad: int = 4) -> None:
    x1, y1, x2, y2 = box
    crop_box = (
        max(0, x1 - pad),
        max(0, y1 - pad),
        min(source.width, x2 + pad),
        min(source.height, y2 + pad),
    )
    crop = source.crop(crop_box)
    upscale_to_height(crop).save(destination)


def save_from_legacy(theme: str, legacy_name: str, destination: Path) -> bool:
    source = LEGACY_THEMES / theme / legacy_name
    if not source.exists():
        return False
    upscale_to_height(Image.open(source)).save(destination)
    return True


def get_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for font_name in ["arialbd.ttf", "arial.ttf", "DejaVuSans-Bold.ttf"]:
        try:
            return ImageFont.truetype(font_name, size)
        except OSError:
            continue
    return ImageFont.load_default()


def draw_fallback_card(theme: str, key: str, destination: Path) -> None:
    color = key.split("-")[0] if "-" in key else "wild"
    accent = ACCENTS.get(color, ACCENTS["wild"])
    size = (456, 720)
    image = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)

    if theme == "classic" and color in ACCENTS and color != "wild":
        fill = accent
        text_fill = (255, 255, 255)
    else:
        fill = (18, 20, 20)
        text_fill = (245, 245, 245)

    draw.rounded_rectangle((18, 18, size[0] - 18, size[1] - 18), radius=38, fill=fill, outline=(255, 255, 255, 210), width=8)
    draw.rounded_rectangle((42, 42, size[0] - 42, size[1] - 42), radius=30, outline=accent, width=5)

    label = key
    for prefix in ["red-", "yellow-", "green-", "blue-", "wild-"]:
        label = label.replace(prefix, "")
    label = label.replace("-", " ").upper()

    big_label = {
        "DRAW FOUR": "+4",
        "WILD DRAW FOUR": "+4",
        "WILD DRAW FOUR REVERSE": "+4 REV",
        "WILD DRAW SIX": "+6",
        "WILD DRAW TEN": "+10",
        "DISCARD ALL": "ALL",
        "COMEBACK": "SKIP ALL",
        "WILD ROULETTE": "ROULETTE",
    }.get(label, label)

    title_font = get_font(56 if len(big_label) <= 6 else 40)
    corner_font = get_font(30)
    bbox = draw.textbbox((0, 0), big_label, font=title_font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]
    draw.text(((size[0] - text_w) / 2, (size[1] - text_h) / 2), big_label, font=title_font, fill=text_fill)
    draw.text((44, 42), big_label[:8], font=corner_font, fill=text_fill)
    draw.text((size[0] - 44, size[1] - 42), big_label[:8], font=corner_font, fill=text_fill, anchor="rs")
    image.save(destination)


def generate_minimal_from_sheet() -> None:
    source = Image.open(SPRITES / "minimal-full-deck.png").convert("RGBA")
    out = CARDS / "minimal"
    row_bands = [(48, 234), (275, 461), (501, 688), (728, 915)]
    x_bands = [
        (14, 92),
        (101, 181),
        (191, 270),
        (279, 361),
        (372, 453),
        (462, 542),
        (552, 634),
        (643, 725),
        (735, 817),
        (826, 908),
        (918, 999),
        (1008, 1089),
        (1100, 1236),
    ]
    values = NUMBER_VALUES + STANDARD_ACTIONS

    for color, y_band in zip(COLORS, row_bands):
        y1, y2 = y_band
        for value, x_band in zip(values, x_bands):
            x1, x2 = x_band
            save_crop(source, (x1, y1, x2, y2), out / f"{color}-{value}.png")

    wild_boxes = [
        (72, 956, 192, 1186),
        (229, 956, 354, 1186),
        (387, 956, 511, 1186),
        (544, 956, 668, 1186),
        (701, 956, 825, 1186),
        (859, 956, 983, 1186),
        (1048, 956, 1174, 1186),
    ]
    for key, box in zip(WILD_KEYS + ["minimal-back"], wild_boxes):
        save_crop(source, box, out / f"{key}.png")


def generate_classic_standard_assets() -> None:
    out = CARDS / "classic"
    for color in COLORS:
        for value in NUMBER_VALUES + STANDARD_ACTIONS:
            legacy = f"{color}-{value.replace('-', '_')}.png"
            if not save_from_legacy("classic", legacy, out / f"{color}-{value}.png"):
                draw_fallback_card("classic", f"{color}-{value}", out / f"{color}-{value}.png")

    save_from_legacy("classic", "wild-0.png", out / "wild.png")
    save_from_legacy("classic", "wild_draw_four-0.png", out / "wild-draw-four.png")
    upscale_to_height(Image.open(SPRITES / "classic-back.png")).save(out / "classic-back.png")


def fill_missing_no_mercy_assets() -> None:
    for theme in ["classic", "minimal"]:
        out = CARDS / theme
        for color in COLORS:
            for value in NO_MERCY_ACTIONS:
                target = out / f"{color}-{value}.png"
                if not target.exists():
                    draw_fallback_card(theme, f"{color}-{value}", target)

        for key in WILD_KEYS:
            target = out / f"{key}.png"
            if not target.exists():
                draw_fallback_card(theme, key, target)

        back_name = "classic-back.png" if theme == "classic" else "minimal-back.png"
        if not (out / back_name).exists():
            draw_fallback_card(theme, f"{theme}-back", out / back_name)

        draw_fallback_card(theme, "missing-card", out / "missing-card.png")


def duplicate_back_aliases() -> None:
    classic = CARDS / "classic"
    minimal = CARDS / "minimal"
    if (classic / "classic-back.png").exists():
        shutil.copyfile(classic / "classic-back.png", classic / "back.png")
    if (minimal / "minimal-back.png").exists():
        shutil.copyfile(minimal / "minimal-back.png", minimal / "back.png")


def main() -> None:
    ensure_dirs()
    reset_generated_cards()
    copy_sprite_sources()
    generate_minimal_from_sheet()
    generate_classic_standard_assets()
    fill_missing_no_mercy_assets()
    duplicate_back_aliases()
    print(f"Generated UNO card assets in {CARDS}")


if __name__ == "__main__":
    main()
