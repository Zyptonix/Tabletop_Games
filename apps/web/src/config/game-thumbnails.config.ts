export interface GameVisualMeta {
  id: string;
  displayName: string;
  tagline: string;
  category: "cards" | "board" | "strategy" | "party";
  categoryLabel: string;
  thumbnailUrl: string;
  fallbackGradient: string;
  accentColor: string; // Hex for glow
  badge?: string;
  highlight?: string;
}

export const GAME_VISUAL_META: Record<string, GameVisualMeta> = {
  "classic-uno": {
    id: "classic-uno",
    displayName: "Classic UNO",
    tagline: "The timeless card showdown of matching colors, numbers, and wild reversals.",
    category: "cards",
    categoryLabel: "Classic Card Game",
    thumbnailUrl: "/game-assets/thumbnails/classic-uno.jpg",
    fallbackGradient: "from-rose-600/30 via-amber-500/10 to-transparent",
    accentColor: "#ef4444",
    badge: "Popular",
    highlight: "2–10 Players"
  },
  "uno-no-mercy": {
    id: "uno-no-mercy",
    displayName: "UNO No Mercy",
    tagline: "Relentless +6 cards, brutal stack penalties, and 25-card hand elimination.",
    category: "cards",
    categoryLabel: "Hardcore Card Game",
    thumbnailUrl: "/game-assets/thumbnails/uno-no-mercy.jpg",
    fallbackGradient: "from-red-950 via-purple-900/30 to-black",
    accentColor: "#dc2626",
    badge: "Hardcore",
    highlight: "Draw & Stack Rules"
  },
  "twenty-nine": {
    id: "twenty-nine",
    displayName: "29 (Bangladesh)",
    tagline: "Traditional South Asian trick-taking with intense bidding, hidden trumps, and pair points.",
    category: "cards",
    categoryLabel: "Trick-Taking Partnership",
    thumbnailUrl: "/game-assets/thumbnails/twenty-nine.jpg",
    fallbackGradient: "from-emerald-950 via-amber-900/20 to-black",
    accentColor: "#10b981",
    badge: "4 Players",
    highlight: "Authentic BD Rules"
  },
  "chess": {
    id: "chess",
    displayName: "Chess",
    tagline: "The royal game of strategy, foresight, check detection, and clock pressure.",
    category: "board",
    categoryLabel: "Grand Strategy",
    thumbnailUrl: "/game-assets/thumbnails/chess.jpg",
    fallbackGradient: "from-slate-900 via-emerald-950/40 to-black",
    accentColor: "#34d399",
    badge: "Competitive",
    highlight: "1v1 Clocked"
  },
  "battleship": {
    id: "battleship",
    displayName: "Battleships",
    tagline: "Hidden fleet coordinates, radar reconnaissance, and tactical naval bombardments.",
    category: "strategy",
    categoryLabel: "Naval Warfare",
    thumbnailUrl: "/game-assets/thumbnails/battleship.jpg",
    fallbackGradient: "from-cyan-950 via-blue-900/30 to-black",
    accentColor: "#06b6d4",
    badge: "Tactical",
    highlight: "Fog-of-War"
  },
  "connect-four": {
    id: "connect-four",
    displayName: "Connect Four",
    tagline: "Classic vertical gravity puzzle with arcade cabinet aesthetics and snappy drops.",
    category: "board",
    categoryLabel: "Arcade Grid",
    thumbnailUrl: "/game-assets/thumbnails/connect-four.jpg",
    fallbackGradient: "from-blue-950 via-amber-900/20 to-black",
    accentColor: "#38bdf8",
    badge: "Fast 1v1",
    highlight: "Retro Arcade"
  },
  "reversi": {
    id: "reversi",
    displayName: "Reversi",
    tagline: "Minutes to learn, a lifetime to master: outflank and flip opposing discs across 64 squares.",
    category: "board",
    categoryLabel: "Territory Flipping",
    thumbnailUrl: "/game-assets/thumbnails/reversi.jpg",
    fallbackGradient: "from-zinc-900 via-slate-800/40 to-black",
    accentColor: "#94a3b8",
    badge: "Pure Strategy",
    highlight: "Corner Control"
  },
  "mafia-werewolf": {
    id: "mafia-werewolf",
    displayName: "Mafia / Werewolf",
    tagline: "Daytime debates, nighttime assassinations, and social deception with custom roles.",
    category: "party",
    categoryLabel: "Social Deduction",
    thumbnailUrl: "/game-assets/thumbnails/mafia-werewolf.jpg",
    fallbackGradient: "from-purple-950 via-zinc-900/50 to-black",
    accentColor: "#a855f7",
    badge: "Party Game",
    highlight: "4–16 Players"
  },
  "strategic-shockwave": {
    id: "strategic-shockwave",
    displayName: "Bomber Tag",
    tagline: "High-octane tactical arena dodging shockwave bomb detonations in a destructible grid.",
    category: "party",
    categoryLabel: "Realtime Action",
    thumbnailUrl: "/game-assets/thumbnails/strategic-shockwave.jpg",
    fallbackGradient: "from-orange-950 via-red-900/30 to-black",
    accentColor: "#f97316",
    badge: "Realtime",
    highlight: "Fast Paced"
  },
  "poker": {
    id: "poker",
    displayName: "Poker · Texas Hold'em",
    tagline: "No-limit Texas Hold'em with high-stakes chip stacks, community boards, and bluffs.",
    category: "cards",
    categoryLabel: "Casino Strategy",
    thumbnailUrl: "/game-assets/thumbnails/poker.jpg",
    fallbackGradient: "from-emerald-950 via-amber-950/30 to-black",
    accentColor: "#fbbf24",
    badge: "High Stakes",
    highlight: "Hold'em"
  },
  "ludo": {
    id: "ludo",
    displayName: "Ludo",
    tagline: "Four-color home sprint with token captures, safe squares, and competitive dice rolls.",
    category: "board",
    categoryLabel: "Family Classic",
    thumbnailUrl: "/game-assets/thumbnails/ludo.jpg",
    fallbackGradient: "from-indigo-950 via-teal-900/20 to-black",
    accentColor: "#6366f1",
    badge: "2–4 Players",
    highlight: "Dice Rolling"
  },
  "barricades": {
    id: "barricades",
    displayName: "Barricades (Quoridor)",
    tagline: "Race your pawn across the board while dropping wooden barrier walls to block opponents.",
    category: "strategy",
    categoryLabel: "Maze Blocking",
    thumbnailUrl: "/game-assets/thumbnails/barricades.svg",
    fallbackGradient: "from-amber-950 via-stone-900/40 to-black",
    accentColor: "#d97706",
    badge: "Spatial Strategy",
    highlight: "Wall Placements"
  },
  "monopoly": {
    id: "monopoly",
    displayName: "Property Tycoon",
    tagline: "Buy, trade, and mortgage prime real estate to bankrupt rivals on the board.",
    category: "board",
    categoryLabel: "Economic Trading",
    thumbnailUrl: "/game-assets/thumbnails/monopoly.jpg",
    fallbackGradient: "from-emerald-950 via-yellow-950/20 to-black",
    accentColor: "#10b981",
    badge: "2–6 Players",
    highlight: "Real Estate"
  },
  "risk": {
    id: "risk",
    displayName: "Risk",
    tagline: "Mobilize armies, claim territories, and conquer the globe through strategic warfare.",
    category: "strategy",
    categoryLabel: "Global Domination",
    thumbnailUrl: "/game-assets/thumbnails/risk.svg",
    fallbackGradient: "from-red-950 via-slate-900/50 to-black",
    accentColor: "#ef4444",
    badge: "War Room",
    highlight: "Dice Battles"
  },
  "world-conquest": {
    id: "world-conquest",
    displayName: "World Conquest",
    tagline: "Expanded tactical warfare map with continent supply lines and deep military manoeuvres.",
    category: "strategy",
    categoryLabel: "Grand Campaign",
    thumbnailUrl: "/game-assets/thumbnails/world-conquest.svg",
    fallbackGradient: "from-blue-950 via-indigo-950/40 to-black",
    accentColor: "#3b82f6",
    badge: "Deep Tactics",
    highlight: "Large Scale"
  },
  "codenames": {
    id: "codenames",
    displayName: "Codenames",
    tagline: "Give one-word clues to uncover allied secret operatives while avoiding the fatal assassin.",
    category: "party",
    categoryLabel: "Team Word Puzzle",
    thumbnailUrl: "/game-assets/thumbnails/codenames.svg",
    fallbackGradient: "from-sky-950 via-rose-950/20 to-black",
    accentColor: "#38bdf8",
    badge: "Team Play",
    highlight: "Spymaster Clues"
  }
};

export function getGameVisualMeta(gameId: string): GameVisualMeta {
  return (
    GAME_VISUAL_META[gameId] ?? {
      id: gameId,
      displayName: gameId.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      tagline: "A tabletop battle of wit, skill, and friendly competition.",
      category: "board",
      categoryLabel: "Tabletop Game",
      thumbnailUrl: `/game-assets/thumbnails/${gameId}.jpg`,
      fallbackGradient: "from-emerald-950 via-slate-900/40 to-black",
      accentColor: "#10b981",
      badge: "Tabletop",
      highlight: "Arena Mode"
    }
  );
}
