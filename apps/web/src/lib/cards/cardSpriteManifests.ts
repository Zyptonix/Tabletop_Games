import type { CardTheme } from "./cardTypes";

export interface SpriteRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface CardSpriteManifest {
  image: string;
  notes: string;
  cards: Record<string, SpriteRect>;
}

/**
 * Runtime card rendering uses separate PNG files in /assets/uno/cards.
 * These manifests are documentation/tuning anchors for source sprite/crop work.
 */
export const CARD_SPRITES: Record<CardTheme, CardSpriteManifest> = {
  classic: {
    image: "/assets/uno/cards/classic/manifest.json",
    notes: "User-provided Classic per-card PNGs. Filenames use labels such as red_7.png and wild_plus4_1.png.",
    cards: {
      "classic-back": { x: 0, y: 0, w: 0, h: 0 }
    }
  },
  no_mercy: {
    image: "/assets/uno/cards/no_mercy/manifest.json",
    notes: "User-provided No Mercy per-card PNGs grouped by color folders. Duplicate variants are selected deterministically by card id.",
    cards: {
      "red-7": { x: 0, y: 0, w: 0, h: 0 },
      "wild-draw-four-reverse": { x: 0, y: 0, w: 0, h: 0 }
    }
  },
  minimal: {
    image: "/assets/uno/sprites/minimal-full-deck.png",
    notes: "Parked for later. Minimal is intentionally hidden from match UI for now.",
    cards: {
      "minimal-back": { x: 1048, y: 956, w: 126, h: 230 }
    }
  }
};