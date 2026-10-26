export const SUITS = ["♠", "♥", "♦", "♣"];
export const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
export function freshDeck(): string[] { return SUITS.flatMap((suit) => RANKS.map((rank) => `${rank}${suit}`)); }
