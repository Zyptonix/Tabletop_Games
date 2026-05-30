import type { CardAsset, CardTheme, RenderableCard } from "./cardTypes";
import { CARD_COLOR_ACCENTS } from "./cardThemeConfig";

const CLASSIC_ROOT = "/assets/uno/cards/classic";
const NO_MERCY_ROOT = "/assets/uno/cards/no_mercy";
const MINIMAL_ROOT = "/assets/uno/cards/minimal";
const FALLBACK_CARD = `${CLASSIC_ROOT}/back_cover.png`;

function normalizeValue(value: string): string {
  return value.replaceAll("-", "_");
}

function hashText(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function classicLabel(card: RenderableCard): string {
  const value = normalizeValue(card.value);
  if (card.color === "wild") {
    if (value === "wild_draw_four") return `wild_plus4_${(hashText(card.id) % 2) + 1}`;
    return `wild_${(hashText(card.id) % 2) + 1}`;
  }

  if (value === "draw_two") return `${card.color}_plus2`;
  return `${card.color}_${value}`;
}

function classicSrc(card: RenderableCard | undefined, faceDown = false): { key: string; src: string } {
  if (faceDown || !card) {
    return { key: "back_cover", src: `${CLASSIC_ROOT}/back_cover.png` };
  }

  const key = classicLabel(card);
  return { key, src: `${CLASSIC_ROOT}/${key}.png` };
}

function noMercyColoredLabel(card: RenderableCard): string {
  const value = normalizeValue(card.value);
  if (/^[0-9]$/.test(value)) return `${card.color}_${value}`;
  if (value === "draw_two") return `${card.color}_plus2`;
  if (value === "draw_four") return `${card.color}_plus4`;
  if (value === "comeback") return `${card.color}_swap`;
  if (value === "discard_all") return `${card.color}_discard_all`;
  return `${card.color}_${value}`;
}

function noMercyWildLabel(card: RenderableCard): string {
  const value = normalizeValue(card.value);
  if (value === "wild_draw_four_reverse") return "wild_reverse_plus4";
  if (value === "wild_draw_four") return "wild_reverse_plus4";
  if (value === "wild_draw_six") return "wild_plus6";
  if (value === "wild_draw_ten") return "wild_plus10";
  if (value === "roulette") return "wild_skip_all";
  return "wild_skip_all";
}

function noMercySrc(card: RenderableCard | undefined, faceDown = false): { key: string; src: string } {
  if (faceDown || !card) {
    return { key: "back_cover", src: `${NO_MERCY_ROOT}/back_cover.png` };
  }

  if (card.color === "wild") {
    const key = noMercyWildLabel(card);
    return { key, src: `${NO_MERCY_ROOT}/wild/${key}.png` };
  }

  const key = noMercyColoredLabel(card);
  return { key, src: `${NO_MERCY_ROOT}/${card.color}/${key}.png` };
}

function minimalSrc(card: RenderableCard | undefined, faceDown = false): { key: string; src: string } {
  if (faceDown || !card) {
    return { key: "minimal-back", src: `${MINIMAL_ROOT}/back.png` };
  }

  const value = card.value.replaceAll("_", "-");
  const key = card.color === "wild" ? (value === "roulette" ? "wild-roulette" : value) : `${card.color}-${value}`;
  return { key, src: `${MINIMAL_ROOT}/${key}.png` };
}

export function resolveCardAsset(params: {
  card?: RenderableCard | undefined;
  theme: CardTheme;
  faceDown?: boolean | undefined;
}): CardAsset {
  const resolved = params.theme === "no_mercy"
    ? noMercySrc(params.card, params.faceDown)
    : params.theme === "minimal"
      ? minimalSrc(params.card, params.faceDown)
      : classicSrc(params.card, params.faceDown);
  const accent = params.card ? CARD_COLOR_ACCENTS[params.card.color] : CARD_COLOR_ACCENTS.wild;

  return {
    key: resolved.key,
    src: resolved.src,
    fallbackSrc: FALLBACK_CARD,
    accent
  };
}