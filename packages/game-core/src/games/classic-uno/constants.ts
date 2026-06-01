import type { ClassicUnoSettings } from "./types";

export const CLASSIC_UNO_VERSION = "0.1.0";

export const DEFAULT_CLASSIC_UNO_SETTINGS: ClassicUnoSettings = {
  cardsPerPlayer: 7,
  turnSeconds: 60,
  allowDrawingWhenPlayable: true,
  timeoutBehavior: "draw_then_pass",
  mustCallUno: true
};

export const UNO_MIN_PLAYERS = 2;
export const UNO_MAX_PLAYERS = 12;
