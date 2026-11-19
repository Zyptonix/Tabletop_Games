/**
 * Playing card asset loader and preloader.
 * Supports dual-format loading:
 * - LAN / Local development: Uses original high-resolution PNGs first (preserving highest fidelity over local networks).
 * - Web / Production (Vercel, Render): Uses lightweight WebP cards first (91.5% smaller payload, 86KB vs 1.3MB) for instant 60fps animations.
 * - Automatic fallbacks if an asset fails to load.
 * - In-memory preloading/stashing to eliminate dealing or center-trick card pop-in.
 */

export function isLanEnvironment(): boolean {
  // Explicit environment variable override
  if (process.env.NEXT_PUBLIC_FORCE_CARD_FORMAT === "png") return true;
  if (process.env.NEXT_PUBLIC_FORCE_CARD_FORMAT === "webp") return false;

  if (typeof window === "undefined") return false;

  try {
    // Explicit URL query parameter override (?cards=png or ?cards=webp)
    const params = new URLSearchParams(window.location.search);
    const paramFormat = params.get("cards")?.toLowerCase();
    if (paramFormat === "png") return true;
    if (paramFormat === "webp") return false;

    // Explicit localStorage override
    const stored = window.localStorage.getItem("tabletop_card_format")?.toLowerCase();
    if (stored === "png") return true;
    if (stored === "webp") return false;
  } catch {
    // Ignore in restrictive contexts
  }

  // Detect local / LAN hostnames
  const host = window.location.hostname;
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.endsWith(".local") ||
    /^192\.168\./.test(host) ||
    /^10\./.test(host) ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host)
  );
}

export function getCardAssetCandidates(rank: string, suit: string): string[] {
  const isLan = isLanEnvironment();
  const baseName = `${rank}_of_${suit}`;

  if (isLan) {
    // LAN mode: High-res PNG first, then WebP, then legacy fallbacks
    return [
      `/game-assets/twenty-nine/cards_better/${baseName}.png`,
      `/game-assets/twenty-nine/cards_better/${baseName}.webp`,
      `/game-assets/twenty-nine/cards/${baseName}.png`,
      `/game-assets/twenty-nine/${baseName}.png`,
      `/game-assets/29/cards/${baseName}.png`
    ];
  }

  // Web / Cloud mode: Lightweight WebP first for fast loading & smooth animations, then PNG fallback
  return [
    `/game-assets/twenty-nine/cards_better/${baseName}.webp`,
    `/game-assets/twenty-nine/cards_better/${baseName}.png`,
    `/game-assets/twenty-nine/cards/${baseName}.png`,
    `/game-assets/twenty-nine/${baseName}.png`,
    `/game-assets/29/cards/${baseName}.png`
  ];
}

export function getCardBackCandidates(variant: "default" | "clean" = "default"): string[] {
  const isLan = isLanEnvironment();
  const betterBacks = isLan
    ? [
        "/game-assets/twenty-nine/cards_better/back.png",
        "/game-assets/twenty-nine/cards_better/back.webp"
      ]
    : [
        "/game-assets/twenty-nine/cards_better/back.webp",
        "/game-assets/twenty-nine/cards_better/back.png"
      ];

  if (variant === "clean") {
    return [
      "/game-assets/twenty-nine/cards_clean_back.svg",
      "/game-assets/twenty-nine/cards_clean_back.jpg",
      ...betterBacks,
      "/game-assets/twenty-nine/cards/back.png"
    ];
  }

  return [...betterBacks, "/game-assets/twenty-nine/cards/back.png"];
}

// In-memory cache of preloaded image elements to keep them alive and decoded in memory
const preloadedImages = new Map<string, HTMLImageElement>();

export function preloadPlayingCards(options?: {
  ranks?: string[];
  suits?: string[];
  includeBack?: boolean;
}): Promise<void[]> {
  if (typeof window === "undefined") return Promise.resolve([]);

  const isLan = isLanEnvironment();
  const primaryExt = isLan ? "png" : "webp";

  const ranks = options?.ranks ?? ["7", "8", "9", "10", "J", "Q", "K", "A"];
  const suits = options?.suits ?? ["spades", "hearts", "diamonds", "clubs"];

  const urls: string[] = [];

  if (options?.includeBack !== false) {
    urls.push(
      `/game-assets/twenty-nine/cards_better/back.${primaryExt}`,
      "/game-assets/twenty-nine/cards_clean_back.svg"
    );
  }

  for (const suit of suits) {
    for (const rank of ranks) {
      urls.push(`/game-assets/twenty-nine/cards_better/${rank}_of_${suit}.${primaryExt}`);
    }
  }

  const promises = urls.map((url) => {
    if (preloadedImages.has(url)) {
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      const img = new Image();
      img.src = url;
      preloadedImages.set(url, img);

      if ("decode" in img && typeof img.decode === "function") {
        img
          .decode()
          .then(() => resolve())
          .catch(() => resolve()); // Ignore decode failures, browser will still cache the bytes
      } else {
        img.onload = () => resolve();
        img.onerror = () => resolve();
      }
    });
  });

  return Promise.all(promises);
}

/**
 * Preload all 32 cards for Twenty-Nine + card backs into memory.
 */
export function preloadTwentyNineCards(): Promise<void[]> {
  return preloadPlayingCards({
    ranks: ["7", "8", "9", "10", "J", "Q", "K", "A"],
    suits: ["spades", "hearts", "diamonds", "clubs"],
    includeBack: true
  });
}

/**
 * Preload full 52-card deck (used for Blackjack, Casino, etc.)
 */
export function preloadFullCardDeck(): Promise<void[]> {
  return preloadPlayingCards({
    ranks: ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"],
    suits: ["spades", "hearts", "diamonds", "clubs"],
    includeBack: true
  });
}
