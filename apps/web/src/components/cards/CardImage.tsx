"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";

export function CardImage({
  src,
  fallbackSrc,
  alt,
  className
}: {
  src: string;
  fallbackSrc: string;
  alt: string;
  className?: string | undefined;
}) {
  const [currentSrc, setCurrentSrc] = useState(src);

  return (
    <img
      src={currentSrc}
      alt={alt}
      draggable={false}
      className={cn("pointer-events-none h-full w-full select-none object-contain", className)}
      onError={() => {
        if (currentSrc !== fallbackSrc) {
          setCurrentSrc(fallbackSrc);
        }
      }}
    />
  );
}
