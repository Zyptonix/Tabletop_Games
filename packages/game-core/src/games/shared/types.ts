import type { GamePlayer } from "../../engine/GameTypes";

export type BoardGameId =
  | "chess"
  | "battleship"
  | "ludo"
  | "barricades"
  | "monopoly"
  | "risk"
  | "world-conquest"
  | "codenames"
  | "poker"
  | "blackjack";

export type PokerStreet = "preflop" | "flop" | "turn" | "river" | "showdown";

export type Team = "red" | "blue" | "neutral" | "assassin";

export interface BoardGameSettings {
  /** Per-turn limit, used by Barricades. Null disables it. */
  turnSeconds: number | null;
  /** Per-player total chess-clock budget, in seconds. Used by Chess. */
  clockSeconds?: number | null;
}

export type BoardGameAction =
  | { type: "move_piece"; from: number; to: number;promotion?: "q" | "r" | "b" | "n" | undefined; }
  | { type: "claim_chess_draw" }
  | { type: "fire"; x: number; y: number }
  | { type: "place_fleet"; ships: Array<{ id: string; name: string; size: number; x: number; y: number; orientation: "h" | "v"; cells: string[] }> }
  | { type: "roll_dice" }
  | { type: "move_token"; tokenIndex: number }
  | { type: "move_pawn"; x: number; y: number }
  | { type: "place_wall"; x: number; y: number; orientation: "h" | "v" }
  | { type: "buy_property" }
  | { type: "end_turn" }
  | { type: "claim_territory"; territoryId: string }
  | { type: "reinforce_territory"; territoryId: string }
  | { type: "attack_territory"; fromId: string; toId: string }
  | { type: "reveal_word"; index: number }
  | { type: "give_clue"; clue: string; number: number }
  | { type: "end_codenames_turn" }
  | { type: "poker_action"; choice: "fold" | "check" | "call" | "raise" | "all_in" }
  | { type: "blackjack_action"; choice: "bet" | "clear_bet" | "deal" | "hit" | "stand" | "double" | "split" | "next_round"; amount?: number };

export interface BattleshipPlacedShip {
  id: string;
  name: string;
  size: number;
  x: number;
  y: number;
  orientation: "h" | "v";
  cells: string[];
}

export interface BattleshipShipStatus {
  id: string;
  name: string;
  size: number;
  sunk: boolean;
  hits?: number;
}

export interface ActivityItem {
  id: string;
  type: string;
  message: string;
  playerId: string | null;
  createdAt: string;
}

export interface Wall { x: number; y: number; orientation: "h" | "v"; playerId: string }

export interface Shot { shooterId: string; targetId: string; x: number; y: number; hit: boolean; sunk: boolean; sunkShipName?: string | undefined }

export interface Territory { id: string; label: string; x: number; y: number; neighbors: string[] }

export interface WordCard { word: string; role: Team; revealed: boolean }

export interface ChessMoveRecord {
  ply: number;
  moveNumber: number;
  playerId: string;
  side: "w" | "b";
  from: number;
  to: number;
  san: string;
  piece: string;
  captured?: string | null | undefined;
  promotion?: string | null | undefined;
  isCheck?: boolean | undefined;
  isCheckmate?: boolean | undefined;
  clockRemainingMs?: number | undefined;
}

export interface BoardGameState {
  gameId: BoardGameId;
  version: string;
  settings: BoardGameSettings;
  phase: "playing" | "finished";
  players: GamePlayer[];
  currentPlayerId: string | null;
  winnerUserId: string | null;
  chessCastlingRights: string;
  chessEnPassantTarget: number | null;
  chessHalfmoveClock: number;
  chessPositionHistory: string[];
  chessMoveHistory?: ChessMoveRecord[] | undefined;
  chessLastMove?: { from: number; to: number } | null | undefined;
  turnNumber: number;
  actionNumber: number;
  startedAt: string;
  updatedAt: string;
  turnStartedAt: string;
  activityLog: ActivityItem[];
  rngState: number;
  board: Array<Array<string | null>>;
  pawns: Record<string, { x: number; y: number }>;
  walls: Wall[];
  wallsRemaining: Record<string, number>;
  ludoTokens: Record<string, number[]>;
  ludoConsecutiveSixes: Record<string, number>;
  diceRoll: number | null;
  hasRolled: boolean;
  money: Record<string, number>;
  positions: Record<string, number>;
  properties: Array<{ id: string; label: string; cost: number; rent: number; ownerId: string | null }>;
  territories: Territory[];
  territoryOwners: Record<string, string | null>;
  territoryTroops: Record<string, number>;
  reinforcedThisTurn: boolean;
  shipCellsByPlayer: Record<string, string[]>;
  shipGroupsByPlayer: Record<string, string[][]>;
  shipDetailsByPlayer?: Record<string, BattleshipPlacedShip[]>;
  battleshipPhase?: "placement" | "battle";
  battleshipReady?: Record<string, boolean>;
  lastSunkShip?: { shooterId: string; ownerId: string; name: string; size: number; cells: string[] } | null;
  /** Per-player clock remaining at the beginning of their latest turn. */
  clockRemainingMsByPlayer?: Record<string, number>;
  shots: Shot[];
  wordCards: WordCard[];
  codenamesTeamByPlayer: Record<string, "red" | "blue">;
  codenamesSpymasterByTeam: Record<"red" | "blue", string>;
  codenamesRoundTeam: "red" | "blue";
  codenamesClue: string | null;
  codenamesClueNumber: number | null;
  codenamesGuessesRemaining: number;
  pokerCardsByPlayer: Record<string, string[]>;
  pokerDeck: string[];
  communityCards: string[];
  pokerStacks: Record<string, number>;
  pokerBets: Record<string, number>;
  pokerFolded: string[];
  pokerActed: string[];
  pokerBetToCall: number;
  pokerPot: number;
  pokerContributions: Record<string, number>;
  pokerButtonSeat: number;
  pokerHandNumber: number;
  pokerStreet: PokerStreet;
  pokerLastAction: string;
  blackjackDealerHand?: string[] | undefined;
  blackjackDealerHoleHidden?: boolean | undefined;
  blackjackPlayerHands?: Record<string, string[][]> | undefined;
  blackjackBets?: Record<string, number[]> | undefined;
  blackjackChips?: Record<string, number> | undefined;
  blackjackPhase?: ("betting" | "player_turns" | "dealer_turn" | "round_end") | undefined;
  blackjackActivePlayerIndex?: number | undefined;
  blackjackActiveHandIndex?: number | undefined;
  blackjackReadyPlayers?: string[] | undefined;
  blackjackRoundResults?: Record<string, Array<{ payout: number; result: "win" | "loss" | "push" | "blackjack" | "bust"; message: string }>> | undefined;
  blackjackRoundNumber?: number | undefined;
  blackjackLastAction?: string | undefined;
  blackjackDeck?: string[] | undefined;
}

export interface PublicBoardGameState {
  gameId: BoardGameId;
  phase: "playing" | "finished";
  players: Array<{
    userId: string;
    displayName: string;
    seat: number;
    isBot: boolean;
    isCurrentTurn: boolean;
    money: number | null;
    position: number | null;
    tokens: number[] | null;
    stack: number | null;
    folded: boolean;
    bet: number;
    team: "red" | "blue" | null;
    isSpymaster: boolean;
  }>;
  currentPlayerId: string | null;
  winnerUserId: string | null;
  turnNumber: number;
  actionNumber: number;
  updatedAt: string;
  board: Array<Array<string | null>>;
  pawns: Record<string, { x: number; y: number }>;
  walls: Wall[];
  wallsRemaining: Record<string, number>;
  ludoTokens: Record<string, number[]>;
  diceRoll: number | null;
  hasRolled: boolean;
  money: Record<string, number>;
  positions: Record<string, number>;
  properties: Array<{ id: string; label: string; cost: number; rent: number; ownerId: string | null }>;
  territories: Territory[];
  territoryOwners: Record<string, string | null>;
  territoryTroops: Record<string, number>;
  reinforcedThisTurn: boolean;
  ownShipCells: string[];
  ownShips?: Array<BattleshipPlacedShip & { hits: number; sunk: boolean }>;
  enemySunkShips?: BattleshipPlacedShip[];
  enemyFleetStatus?: BattleshipShipStatus[];
  myFleetStatus?: BattleshipShipStatus[];
  battleshipPhase?: "placement" | "battle";
  battleshipReady?: Record<string, boolean>;
  lastSunkShip?: { shooterId: string; ownerId: string; name: string; size: number; cells: string[] } | null;
  /** Clock values are public in timed games; the active countdown is streamed separately. */
  clockRemainingMsByPlayer?: Record<string, number>;
  shots: Shot[];
  wordCards: Array<{ word: string; revealed: boolean; revealedRole: Team | null; keyRole: Team | null }>;
  isCodenamesSpymaster: boolean;
  codenamesCurrentTeam: "red" | "blue";
  codenamesClue: string | null;
  codenamesClueNumber: number | null;
  codenamesGuessesRemaining: number;
  myPokerCards: string[];
  communityCards: string[];
  pokerStacks: Record<string, number>;
  pokerBets: Record<string, number>;
  pokerFolded: string[];
  pokerBetToCall: number;
  pokerPot: number;
  pokerStreet: PokerStreet;
  pokerButtonSeat: number;
  pokerHandNumber: number;
  pokerLastAction: string;
  blackjackDealerHand?: string[] | undefined;
  blackjackDealerHoleHidden?: boolean | undefined;
  blackjackDealerScore?: number | undefined;
  blackjackPlayerHands?: Record<string, string[][]> | undefined;
  blackjackBets?: Record<string, number[]> | undefined;
  blackjackChips?: Record<string, number> | undefined;
  blackjackPhase?: ("betting" | "player_turns" | "dealer_turn" | "round_end") | undefined;
  blackjackActiveHandIndex?: number | undefined;
  blackjackReadyPlayers?: string[] | undefined;
  blackjackRoundResults?: Record<string, Array<{ payout: number; result: "win" | "loss" | "push" | "blackjack" | "bust"; message: string }>> | undefined;
  blackjackRoundNumber?: number | undefined;
  blackjackLastAction?: string | undefined;
  activityLog: ActivityItem[];
  chessMoveHistory?: ChessMoveRecord[] | undefined;
  chessLastMove?: { from: number; to: number } | null | undefined;
  chessHalfmoveClock?: number | undefined;
  chessCastlingRights?: string | undefined;
  gameNotice: string;
}
