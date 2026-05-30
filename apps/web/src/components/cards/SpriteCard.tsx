"use client";

import { CardImage } from "./CardImage";
import { resolveCardAsset, type CardTheme, type RenderableCard } from "@/lib/cards";

export function SpriteCard({
  card,
  theme,
  faceDown = false,
  className
}: {
  card?: RenderableCard | undefined;
  theme: CardTheme;
  faceDown?: boolean | undefined;
  className?: string | undefined;
}) {
  const asset = resolveCardAsset({ card, theme, faceDown });
  const alt = faceDown || !card ? "Card back" : `${card.color} ${card.value.replaceAll("_", " ")}`;

  return <CardImage src={asset.src} fallbackSrc={asset.fallbackSrc} alt={alt} className={className} />;
}
