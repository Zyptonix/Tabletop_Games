"use client";

import { CardImage } from "./CardImage";
import { resolveCardAsset, type CardTheme, type RenderableCard } from "@/lib/cards";
import { cn } from "@/lib/utils/cn";

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

  return (
    <span
      className={cn(
        "relative block h-full w-full overflow-hidden rounded-[1rem] border border-white/12 bg-[#05070b] p-[2.5%] shadow-[0_14px_30px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.06)]",
        className
      )}
    >
      <span className="block h-full w-full overflow-hidden rounded-[0.82rem] bg-[#0b0f14]">
        <CardImage
          src={asset.src}
          fallbackSrc={asset.fallbackSrc}
          alt={alt}
          className="p-[1.5%]"
        />
      </span>
    </span>
  );
}