import { cardThemeOptions, resolveCardAsset, type CardTheme, type RenderableCard } from "@/lib/cards";

export { cardThemeOptions };
export type CardThemeId = CardTheme;
export type UnoRenderableCard = RenderableCard;

export function getCardImageSrc(card: RenderableCard | undefined, theme: CardThemeId, faceDown = false): string {
  return resolveCardAsset({ card, theme, faceDown }).src;
}