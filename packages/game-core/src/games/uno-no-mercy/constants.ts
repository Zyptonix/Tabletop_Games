export const NO_MERCY_VERSION = "0.1.0";
export const NO_MERCY_MIN_PLAYERS = 2;
export const NO_MERCY_MAX_PLAYERS = 12;

export const DEFAULT_NO_MERCY_SETTINGS = {
  cardsPerPlayer: 7,
  turnSeconds: 60,
  eliminationHandSize: 25,
  allowDrawingWhenPlayable: true,
  mustCallUno: true
} as const;
