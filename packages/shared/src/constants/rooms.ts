export const ROOM_CODE_LENGTH = 6;
export const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export const ROOM_STATUSES = [
  "lobby",
  "in_game",
  "paused",
  "finished",
  "abandoned"
] as const;

export type RoomStatus = (typeof ROOM_STATUSES)[number];

export const DEFAULT_TURN_SECONDS = 90;
