import type { CardColor } from "./cardTypes";

export const UNO_CARD_COLORS = ["red", "yellow", "green", "blue"] as const satisfies readonly CardColor[];

export const UNO_NUMBER_VALUES = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;

export const UNO_COLORED_ACTION_KEYS = [
  "skip",
  "reverse",
  "draw-two",
  "draw-four",
  "comeback",
  "discard-all"
] as const;

export const UNO_WILD_KEYS = [
  "wild",
  "wild-draw-four",
  "wild-draw-four-reverse",
  "wild-draw-six",
  "wild-draw-ten",
  "wild-roulette"
] as const;

export const ALL_UNO_CARD_ASSET_KEYS = [
  ...UNO_CARD_COLORS.flatMap((color) => [
    ...UNO_NUMBER_VALUES.map((value) => `${color}-${value}`),
    ...UNO_COLORED_ACTION_KEYS.map((value) => `${color}-${value}`)
  ]),
  ...UNO_WILD_KEYS,
  "classic-back",
  "minimal-back",
  "back",
  "missing-card"
] as const;
