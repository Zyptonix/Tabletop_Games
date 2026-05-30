export type CardTheme = "classic" | "no_mercy" | "minimal";

export type CardColor = "red" | "yellow" | "green" | "blue" | "wild";

export interface RenderableCard {
  id: string;
  color: CardColor;
  value: string;
  assetKey?: string | undefined;
}

export interface CardAsset {
  key: string;
  src: string;
  fallbackSrc: string;
  accent: string;
}