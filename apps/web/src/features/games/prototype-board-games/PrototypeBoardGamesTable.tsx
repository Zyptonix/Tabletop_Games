// TABLETOP ARENA FULL PATCH V5 — CODENAMES RULES
/* TABLETOP ARENA FULL PATCH V4 */
/* TABLETOP GAME ENGINE CONTINUATION V3 */
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { GameEvent, PublicPrototypeGameState } from "@tabletop/game-core";
import type { RoomStateView } from "@tabletop/shared";
import { RoomChat } from "@/features/game-shell/RoomChat";

type AnyAction = { type: string; [key: string]: unknown };
type Props = {
  room: RoomStateView;
  state: PublicPrototypeGameState;
  legalActions: unknown[];
  gameEvents: GameEvent[];
  currentUserId: string;
  onAction: (type: string, payload?: Record<string, unknown>) => void;
  onChat: (roomId: string, body: string) => void;
  onEndMatch?: (roomId: string) => void;
};

const META: Record<string, { title: string; icon: string; accent: string; description: string }> = {
  chess: { title: "Chess", icon: "♟️", accent: "#a5b4fc", description: "Classic strategy · Early access" },
  battleship: { title: "Battleships", icon: "🚢", accent: "#38bdf8", description: "Naval tactics · Early access" },
  ludo: { title: "Ludo", icon: "🎲", accent: "#fbbf24", description: "Race to home · Early access" },
  barricades: { title: "Barricades", icon: "🧱", accent: "#fb923c", description: "Block and outmaneuver · Early access" },
  monopoly: { title: "Property Tycoon", icon: "🏠", accent: "#4ade80", description: "Buy, build and collect · Early access" },
  risk: { title: "Risk", icon: "🌍", accent: "#fb7185", description: "Territory strategy · Early access" },
  "world-conquest": { title: "World Conquest", icon: "🗺️", accent: "#f472b6", description: "Larger conquest map · Early access" },
  codenames: { title: "Codenames", icon: "🕵️", accent: "#facc15", description: "Team word deduction · Early access" },
  poker: { title: "Poker · Texas Hold'em", icon: "🃏", accent: "#c4b5fd", description: "Cards, blinds and betting · Early access" }
};
const PIECES: Record<string, string> = { r: "♜", n: "♞", b: "♝", q: "♛", k: "♚", p: "♟", R: "♖", N: "♘", B: "♗", Q: "♕", K: "♔", P: "♙" };
const PLAYER_COLORS = ["#38bdf8", "#fb7185", "#facc15", "#4ade80", "#c084fc", "#fb923c", "#2dd4bf", "#f472b6", "#a3e635", "#94a3b8"];
const owns = (state: PublicPrototypeGameState, userId: string) => state.currentPlayerId === userId && state.phase === "playing";
function isAction(value: unknown): value is AnyAction { return typeof value === "object" && value !== null && typeof (value as { type?: unknown }).type === "string"; }
function hasAction(actions: unknown[], type: string, match: (action: AnyAction) => boolean = () => true) { return actions.some((value) => isAction(value) && value.type === type && match(value)); }
function money(value: number | null | undefined) { return `$${(value ?? 0).toLocaleString("en-US")}`; }
function cardColor(card: string) { return /[♥♦]/.test(card) ? "text-rose-400" : "text-slate-100"; }

const POKER_CARD_SUIT_FILES: Record<string, string> = { "♠": "spades", "♥": "hearts", "♦": "diamonds", "♣": "clubs" };
function PokerPlayingCard({ card, hidden = false, compact = false }: { card?: string | null; hidden?: boolean; compact?: boolean }) {
  const [failed, setFailed] = useState(false);
  if (hidden || !card) return <div className={`poker-playing-card poker-card-back ${compact ? "poker-card-compact" : ""}`} aria-label="Hidden card"><span>♠</span><b>TABLETOP</b><small>ARENA</small></div>;
  const suit = card.slice(-1);
  const rank = card.slice(0, -1);
  const suitFile = POKER_CARD_SUIT_FILES[suit];
  const asset = `/game-assets/twenty-nine/cards/${rank}_of_${suitFile}.png`;
  const red = suit === "♥" || suit === "♦";
  return <div className={`poker-playing-card ${compact ? "poker-card-compact" : ""}`} title={`${rank} of ${suitFile ?? "unknown suit"}`}>
    {!failed && suitFile ? <img src={asset} alt={`${rank} of ${suitFile}`} draggable={false} onError={() => setFailed(true)} /> : <div className={`poker-card-fallback ${red ? "text-rose-600" : "text-slate-950"}`}><strong>{rank}</strong><span>{suit}</span><small>{rank}{suit}</small></div>}
  </div>;
}

const POKER_HAND_RANKINGS = [
  { name: "Royal flush", tier: "Top tier", example: "A♠ K♠ Q♠ J♠ 10♠", detail: "A-K-Q-J-10, all one suit. The highest possible straight flush." },
  { name: "Straight flush", tier: "Tier 2", example: "9♥ 8♥ 7♥ 6♥ 5♥", detail: "Five consecutive ranks in the same suit. A-2-3-4-5 is the low ace straight." },
  { name: "Four of a kind", tier: "Tier 3", example: "Q♠ Q♥ Q♦ Q♣ A♦", detail: "Four cards of one rank, then the highest kicker." },
  { name: "Full house", tier: "Tier 4", example: "10♠ 10♥ 10♦ 4♣ 4♥", detail: "Three of a kind plus a pair. Compare the three-card rank first, then the pair." },
  { name: "Flush", tier: "Tier 5", example: "A♦ J♦ 8♦ 5♦ 2♦", detail: "Five cards of one suit, not in sequence. Compare highest card downward." },
  { name: "Straight", tier: "Tier 6", example: "9♠ 8♥ 7♦ 6♣ 5♠", detail: "Five consecutive ranks in mixed suits. Ace can be high or low, never wrap around." },
  { name: "Three of a kind", tier: "Tier 7", example: "7♠ 7♥ 7♦ A♣ 9♠", detail: "Three equal ranks plus two kickers, compared from highest to lowest." },
  { name: "Two pair", tier: "Tier 8", example: "K♠ K♥ 3♦ 3♣ A♠", detail: "Compare the higher pair, then the lower pair, then the kicker." },
  { name: "One pair", tier: "Tier 9", example: "J♠ J♥ A♦ 8♣ 4♠", detail: "One pair plus three kickers, compared in order." },
  { name: "High card", tier: "Lowest", example: "A♠ J♥ 8♦ 5♣ 2♠", detail: "No combination; compare all five card ranks from highest down." }
];

const CHESS_PIECE_FILES: Record<string, string> = {
  K: "white_king.png", Q: "white_queen.png", R: "white_rook.png", B: "white_bishop.png", N: "white_knight.png", P: "white_pawn.png",
  k: "black_king.png", q: "black_queen.png", r: "black_rook.png", b: "black_bishop.png", n: "black_knight.png", p: "black_pawn.png"
};
function ChessPieceArt({ piece }: { piece: string }) {
  const file = CHESS_PIECE_FILES[piece];
  const [failedFile, setFailedFile] = useState<string | null>(null);
  if (!file || failedFile === file) return <span className={piece === piece.toUpperCase() ? "text-white" : "text-black"}>{PIECES[piece] ?? piece}</span>;
  const sizeClass =
    piece.toLowerCase() === "p"
      ? "h-[70%] w-[70%]"
      : "h-[75%] w-[75%]";

  return (
    <img
      src={`/game-assets/chess/${file}`}
      alt=""
      draggable={false}
      onError={() => setFailedFile(file)}
      className={`pointer-events-none ${sizeClass} select-none object-contain drop-shadow-none`}
    />  
  );
}

// CHESS CHECK MARKER + ILLEGAL MOVE NOTICE V1
function chessSquareIsAttacked(
  board: Array<Array<string | null>>,
  targetRow: number,
  targetColumn: number,
  byWhite: boolean
): boolean {
  for (let row = 0; row < 8; row += 1) {
    for (let column = 0; column < 8; column += 1) {
      const piece = board[row]?.[column] ?? null;
      if (!piece || (piece === piece.toUpperCase()) !== byWhite) continue;

      const kind = piece.toLowerCase();
      const dr = targetRow - row;
      const dc = targetColumn - column;
      const absRow = Math.abs(dr);
      const absColumn = Math.abs(dc);

      if (kind === "p") {
        // White pawns attack one row up; black pawns attack one row down.
        if (dr === (byWhite ? -1 : 1) && absColumn === 1) return true;
        continue;
      }
      if (kind === "n" && ((absRow === 2 && absColumn === 1) || (absRow === 1 && absColumn === 2))) {
        return true;
      }
      if (kind === "k" && Math.max(absRow, absColumn) === 1) return true;

      const straight = (dr === 0 && dc !== 0) || (dc === 0 && dr !== 0);
      const diagonal = absRow === absColumn && absRow > 0;
      const compatible =
        (kind === "q" && (straight || diagonal)) ||
        (kind === "r" && straight) ||
        (kind === "b" && diagonal);
      if (!compatible) continue;

      let scanRow = row + Math.sign(dr);
      let scanColumn = column + Math.sign(dc);
      let blocked = false;
      while (scanRow !== targetRow || scanColumn !== targetColumn) {
        if (board[scanRow]?.[scanColumn]) {
          blocked = true;
          break;
        }
        scanRow += Math.sign(dr);
        scanColumn += Math.sign(dc);
      }
      if (!blocked) return true;
    }
  }
  return false;
}

function getCheckedKingSquares(board: Array<Array<string | null>>): Set<number> {
  const checked = new Set<number>();
  for (const king of [
    { piece: "K", isWhite: true },
    { piece: "k", isWhite: false }
  ]) {
    for (let row = 0; row < 8; row += 1) {
      for (let column = 0; column < 8; column += 1) {
        if (board[row]?.[column] !== king.piece) continue;
        if (chessSquareIsAttacked(board, row, column, !king.isWhite)) {
          checked.add(row * 8 + column);
        }
      }
    }
  }
  return checked;
}

function ActivityIcon({ type, message }: { type: string; message: string }) {
  const emoji = message.match(/^\p{Extended_Pictographic}/u)?.[0];
  if (emoji) return <span className="text-base leading-none">{emoji}</span>;
  const fallbacks: Record<string, string> = { game_started: "🎮", game_action: "🎯", player_eliminated: "💥", attack: "⚔️", purchase: "🏠" };
  return <span className="text-base leading-none">{fallbacks[type] ?? "✨"}</span>;
}

export function PrototypeBoardGamesTable({ room, state, legalActions, gameEvents, currentUserId, onAction, onChat, onEndMatch }: Props) {
  const router = useRouter();
  const meta = META[state.gameId] ?? META.chess!;
  const [selectedSquare, setSelectedSquare] = useState<number | null>(null);
  const [chessMoveNotice, setChessMoveNotice] = useState<string | null>(null);
  const [pendingChessPromotion, setPendingChessPromotion] = useState<AnyAction[] | null>(null);
  const [hoveredWall, setHoveredWall] = useState<{ x: number; y: number; orientation: "h" | "v" } | null>(null);
  const [pokerRulesOpen, setPokerRulesOpen] = useState(false);
  const [wallMode, setWallMode] = useState<"h" | "v" | null>(null);
  const [selectedTerritory, setSelectedTerritory] = useState<string | null>(null);
  const [codenamesClueText, setCodenamesClueText] = useState("");
  const [codenamesClueNumber, setCodenamesClueNumber] = useState(1);
  const me = state.players.find((player) => player.userId === currentUserId);
  const isMyTurn = owns(state, currentUserId);
  const currentPlayer = state.players.find((player) => player.userId === state.currentPlayerId);
  const log = useMemo(() => {
    const recorded = state.activityLog.map((event) => ({ id: event.id, type: event.type, message: event.message, createdAt: event.createdAt }));
    const known = new Set(recorded.map((entry) => entry.id));
    const extra = gameEvents.filter((event) => !known.has(event.id)).map((event) => ({ id: event.id, type: event.type, message: event.message ?? event.type.replaceAll("_", " "), createdAt: event.createdAt }));
    return [...recorded, ...extra].slice(-24).reverse();
  }, [state.activityLog, gameEvents]);
  const canEndRoom = room.effectiveHostUserId === currentUserId;
  const activeTarget = state.players.find((player) => player.userId !== currentUserId);

  function dispatch(action: AnyAction) {
    const { type, ...payload } = action;
    onAction(type, payload);
  }
  function dashboard() { router.push("/dashboard"); }

  function renderChess() {
    const legalMoves = legalActions.filter(isAction).filter((action) => action.type === "move_piece");
    const selectedMoves = legalMoves.filter((action) => action.from === selectedSquare);
    const checkedKingSquares = getCheckedKingSquares(state.board);
    const chessFlipped = (me?.seat ?? 0) % 2 === 1;
    return <div className="mx-auto w-full max-w-[min(75vh,740px)]">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div className="text-xs font-black uppercase tracking-[.2em] text-white/45">Your pieces at the bottom · Select a piece, then a highlighted square</div><div className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-xs font-bold">{currentPlayer?.displayName ?? "Waiting"} to move</div></div>
      <div className="overflow-hidden rounded-2xl border-[7px] border-[#214b2a] bg-[#214b2a] shadow-[0_24px_50px_rgba(0,0,0,.45)]"><div className="grid grid-cols-8">
       {Array.from({ length: 64 }, (_, displayIndex) => {
          const displayRow = Math.floor(displayIndex / 8);
          const displayColumn = displayIndex % 8;

          // Reverse both axes for the Black player's view.
          const rowIndex = chessFlipped ? 7 - displayRow : displayRow;
          const column = chessFlipped ? 7 - displayColumn : displayColumn;

          // Always use the real board coordinates for game actions.
          const piece = state.board[rowIndex]?.[column] ?? null;
          const index = rowIndex * 8 + column;
          const highlighted = selectedMoves.some((action) => action.to === index);
          const selected = selectedSquare === index;
          return <button key={index} type="button" aria-label={`Chess square ${String.fromCharCode(97 + column)}${8 - rowIndex}`} onClick={() => {
            if (!isMyTurn) return;
            const isOwnPiece = Boolean(piece && ((me?.seat ?? 0) % 2 === 0 ? piece === piece.toUpperCase() : piece === piece.toLowerCase()));
            if (selectedSquare !== null) {
              const choices = selectedMoves.filter((action) => action.to === index);
              if (choices.length > 1) {
                setPendingChessPromotion(choices);
                setChessMoveNotice(null);
                return;
              }
              if (choices.length === 1) {
                const move = choices[0];
                if (move) onAction("move_piece", { from: selectedSquare, to: index });
                setSelectedSquare(null);
                setPendingChessPromotion(null);
                setChessMoveNotice(null);
                return;
              }
              if (isOwnPiece) {
                // Clicking another friendly piece switches the selected piece.
                setSelectedSquare(index);
                setPendingChessPromotion(null);
                setChessMoveNotice(null);
              } else {
                // Keep the current piece selected so its legal destinations stay visible.
                setChessMoveNotice("Illegal move — that destination is not legal. Your king may be exposed to check, or the piece may not move that way.");
                setPendingChessPromotion(null);
              }
              return;
            }
            if (isOwnPiece) {
              setSelectedSquare(index);
              setPendingChessPromotion(null);
              setChessMoveNotice(null);
            } else {
              setChessMoveNotice("Select one of your own pieces first.");
              setSelectedSquare(null);
              setPendingChessPromotion(null);
            }
          }} className={`relative grid aspect-square place-items-center text-[clamp(1.5rem,4.6vw,3.2rem)] leading-none transition-colors ${((rowIndex + column) % 2 === 0) ? "bg-[#c9eac5] text-[#142a18]" : "bg-[#4f8e5b] text-white"} ${selected ? "ring-4 ring-inset ring-amber-300" : ""} ${highlighted ? "after:absolute after:h-3 after:w-3 after:rounded-full after:bg-emerald-500/80 after:shadow-[0_0_0_4px_rgba(16,185,129,.18)]" : ""}`}>
            {piece ? <ChessPieceArt piece={piece} /> : null}
            {piece && checkedKingSquares.has(index) ? (
              <span
                role="img"
                aria-label="King in check"
                title="King in check"
                className="pointer-events-none absolute inset-0 z-0 bg-red-300/45 ring-2 ring-inset ring-red-400/70"
              />
            ) : null}
            {/* CHESS CHECK FULL-SQUARE HIGHLIGHT V1 */}
            {displayColumn === 0 ? <span className="absolute left-1 top-1 text-[9px] font-black opacity-40">{8 - rowIndex}</span> : null}{displayRow === 7 ? <span className="absolute bottom-1 right-1 text-[9px] font-black opacity-40">{"abcdefgh"[column]}</span> : null}
          </button>;
        })}
      </div></div>{chessMoveNotice ? <p role="status" className="mt-2 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-200">⚠️ {chessMoveNotice}</p> : null}<div className="mt-2 flex flex-wrap items-center justify-between gap-2">{pendingChessPromotion ? <div className="flex items-center gap-2 rounded-lg border border-amber-200/20 bg-amber-100/[.06] p-2"><span className="text-[10px] font-black text-amber-100">Promote to</span>{pendingChessPromotion.map((action) => <button key={String(action.promotion)} type="button" className="grid h-9 w-9 place-items-center rounded-lg border border-white/15 bg-white/10 text-lg font-black hover:bg-emerald-300/20" onClick={() => { onAction("move_piece", { from: action.from, to: action.to, promotion: action.promotion }); setPendingChessPromotion(null); setSelectedSquare(null); setChessMoveNotice(null); }}>{String(action.promotion).toUpperCase()}</button>)}<button type="button" onClick={() => setPendingChessPromotion(null)} className="rounded-lg px-2 py-1 text-xs text-white/50">Cancel</button></div> : null}{hasAction(legalActions, "claim_chess_draw") ? <button type="button" onClick={() => onAction("claim_chess_draw")} className="rounded-lg border border-amber-200/25 bg-amber-100/10 px-3 py-2 text-[10px] font-black text-amber-100 hover:bg-amber-100/20">Claim draw</button> : null}</div><p className="mt-2 text-[10px] leading-relaxed text-white/40">Legal moves, castling, en passant, promotion, checkmate and draw rules are enforced by the server.</p>
    </div>;
  }

  function renderBattleships() {
    const incoming = state.shots.filter((shot) => shot.targetId === currentUserId);
    const outgoing = state.shots.filter((shot) => shot.shooterId === currentUserId);
    const shotAt = (x: number, y: number, outgoingSide = true) => (outgoingSide ? outgoing : incoming).find((shot) => shot.x === x && shot.y === y);
    const fired = new Set(outgoing.map((shot) => `${shot.x},${shot.y}`));
    return <div className="mx-auto w-full max-w-[690px]"><div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-xl font-black">🎯 Target grid</h2><p className="text-sm text-white/50">Fire at {activeTarget?.displayName ?? "your opponent"}</p></div><div className="rounded-xl border border-cyan-200/15 bg-cyan-300/10 px-3 py-2 text-sm font-bold text-cyan-100">🚢 Fleet: {state.ownShipCells.length} cells</div></div>
      <div className="grid grid-cols-10 gap-1 rounded-2xl border border-cyan-300/15 bg-[#071a2d] p-2 sm:gap-1.5 sm:p-3">{Array.from({ length: 100 }, (_, index) => { const x = index % 10; const y = Math.floor(index / 10); const shot = shotAt(x, y, true); return <button key={index} type="button" onClick={() => onAction("fire", { x, y })} disabled={!isMyTurn || fired.has(`${x},${y}`) || !hasAction(legalActions, "fire", (action) => action.x === x && action.y === y)} className={`relative grid aspect-square place-items-center rounded-md border text-xs font-black transition hover:-translate-y-0.5 disabled:cursor-not-allowed ${shot ? shot.hit ? "border-rose-300/45 bg-rose-500/30 text-rose-100" : "border-sky-200/15 bg-sky-300/[.07] text-sky-100/45" : "border-sky-200/15 bg-[#0c2d48] text-cyan-100 hover:border-cyan-200/70 hover:bg-cyan-300/15"}`}>{shot ? shot.sunk ? "🚢" : shot.hit ? "💥" : "·" : ""}</button>; })}</div>
      <div className="mt-3 flex flex-wrap gap-3 text-xs font-bold text-white/50"><span>💥 Hit</span><span>· Miss</span><span>🚢 {incoming.filter((shot) => shot.hit).length} hits received</span><span>🎯 {outgoing.filter((shot) => shot.hit).length} hits landed</span></div>
      <div className="mt-4 rounded-xl border border-white/10 bg-black/15 p-3"><p className="text-xs font-black uppercase tracking-widest text-white/45">Your hidden fleet</p><div className="mt-2 grid grid-cols-10 gap-1">{Array.from({ length: 100 }, (_, index) => { const x = index % 10; const y = Math.floor(index / 10); const ship = state.ownShipCells.includes(`${x},${y}`); const shot = shotAt(x, y, false); return <div key={index} className={`aspect-square rounded-sm ${ship ? shot?.hit ? "bg-rose-400" : "bg-slate-300/65" : shot ? shot.hit ? "bg-rose-400/70" : "bg-cyan-300/20" : "bg-white/[.035]"}`} />; })}</div></div>
    </div>;
  }

  function renderLudo() {
    const track = Array.from({ length: 58 }, (_, index) => index);
    const allTokenCount = Object.values(state.ludoTokens).reduce((sum, tokens) => sum + tokens.filter((position) => position >= 0).length, 0);
    return <div className="mx-auto w-full max-w-[780px]"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-2xl font-black">🎲 Race to home</h2><p className="text-sm text-white/50">Roll a six to launch a token. First player to finish all four wins.</p></div><div className="flex items-center gap-3 rounded-2xl border border-amber-200/15 bg-amber-300/10 px-4 py-3"><span className="text-3xl">{state.diceRoll ? ["⚀","⚁","⚂","⚃","⚄","⚅"][state.diceRoll - 1] : "🎲"}</span><div><p className="text-[10px] font-black uppercase tracking-widest text-amber-100/50">Last roll</p><p className="text-2xl font-black text-amber-100">{state.diceRoll ?? "—"}</p></div></div></div>
      <div className="rounded-3xl border border-white/10 bg-[#10211f] p-4 shadow-[0_25px_70px_rgba(0,0,0,.3)]"><div className="grid grid-cols-[repeat(13,minmax(0,1fr))] gap-1 sm:gap-1.5">{track.map((index) => { const tokenList = state.players.flatMap((player) => (state.ludoTokens[player.userId] ?? []).map((position, tokenIndex) => ({ player, position, tokenIndex }))).filter((token) => token.position === index); return <div key={index} className={`relative grid aspect-square place-items-center rounded-lg border text-[10px] ${tokenList.length ? "border-white/15 bg-white/10" : "border-white/[.045] bg-black/10"}`}>{tokenList.map((token) => <span key={token.player.userId + token.tokenIndex} title={token.player.displayName} className="grid h-5 w-5 place-items-center rounded-full border-2 border-white/70 text-[8px] font-black text-slate-950" style={{ background: PLAYER_COLORS[token.player.seat % PLAYER_COLORS.length] }}>{token.tokenIndex + 1}</span>)}{tokenList.length === 0 ? <span className="text-white/15">{index + 1}</span> : null}</div>; })}</div><p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-white/35">52-space shared route + 6-space home stretch; safe-square rules are still in progress</p></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">{state.players.map((player) => <section key={player.userId} className={`rounded-2xl border p-3 ${player.userId === currentUserId ? "border-amber-200/30 bg-amber-200/[.06]" : "border-white/10 bg-black/15"}`}><div className="flex items-center justify-between gap-2"><p className="font-black">{player.displayName}{player.userId === currentUserId ? " (you)" : ""}</p><span className="text-xs font-bold text-white/40">{(player.tokens ?? [-1,-1,-1,-1]).filter((pos) => pos >= 57).length}/4 home</span></div><div className="mt-3 grid grid-cols-4 gap-2">{(player.tokens ?? [-1,-1,-1,-1]).map((position, tokenIndex) => <button key={tokenIndex} type="button" onClick={() => onAction("move_token", { tokenIndex })} disabled={player.userId !== currentUserId || !isMyTurn || !state.hasRolled || !hasAction(legalActions, "move_token", (action) => action.tokenIndex === tokenIndex)} className="min-h-12 rounded-xl border text-xl font-black transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40" style={{ borderColor: PLAYER_COLORS[player.seat % PLAYER_COLORS.length], background: `${PLAYER_COLORS[player.seat % PLAYER_COLORS.length]}22` }}>{position < 0 ? "🏠" : position >= 57 ? "🏁" : position + 1}</button>)}</div></section>)}</div>
      <div className="mt-4 flex gap-2">{hasAction(legalActions,"roll_dice") ? <button onClick={() => onAction("roll_dice")} className="min-h-12 rounded-xl bg-amber-300 px-5 font-black text-slate-950 hover:bg-amber-200">🎲 Roll dice</button> : null}{hasAction(legalActions,"end_turn") ? <button onClick={() => onAction("end_turn")} className="min-h-12 rounded-xl border border-white/10 px-4 font-bold">End turn</button> : null}<span className="self-center text-xs text-white/40">{allTokenCount} tokens on the track</span></div>
    </div>;
  }

  function renderBarricades() {
    const tracks = "repeat(8, minmax(0, 1fr) 0.14fr) minmax(0, 1fr)";
    const hoveredKey = hoveredWall ? `${hoveredWall.orientation}:${hoveredWall.x}:${hoveredWall.y}` : "";
    const remaining = state.wallsRemaining[currentUserId] ?? 0;
    return <div className="prototype-barricades-wrap mx-auto flex h-full min-h-0 w-full max-w-[min(76vh,680px)] flex-col justify-center gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-xl font-black">🟠 Barricades</h2><p className="text-[11px] text-white/50">Move to the opposite edge. Hover a gap to preview and place a two-edge wall.</p></div><div className="flex items-center gap-2"><span className="rounded-lg border border-orange-200/20 bg-orange-300/10 px-3 py-2 text-xs font-black text-orange-100">{remaining} walls left</span><button onClick={() => setWallMode(wallMode === "h" ? null : "h")} disabled={!isMyTurn || remaining < 1} className={`rounded-lg border px-3 py-2 text-xs font-black ${wallMode === "h" ? "border-orange-300 bg-orange-300/20 text-orange-100" : "border-white/10 bg-white/[.04] text-white/70"}`}>— H</button><button onClick={() => setWallMode(wallMode === "v" ? null : "v")} disabled={!isMyTurn || remaining < 1} className={`rounded-lg border px-3 py-2 text-xs font-black ${wallMode === "v" ? "border-orange-300 bg-orange-300/20 text-orange-100" : "border-white/10 bg-white/[.04] text-white/70"}`}>| V</button><button onClick={() => setWallMode(null)} className="rounded-lg border border-white/10 px-2 py-2 text-xs font-bold text-white/60">Auto</button></div></div>
      <div className="barricades-hover-board relative mx-auto grid aspect-square w-full flex-1 min-h-0 max-h-[min(64vh,680px)] overflow-visible rounded-xl border border-orange-100/20 bg-[#10242b] p-1.5 shadow-[0_18px_45px_rgba(0,0,0,.28)]" style={{ gridTemplateColumns: tracks, gridTemplateRows: tracks }}>
        {Array.from({ length: 289 }, (_, index) => {
          const row = Math.floor(index / 17), col = index % 17;
          const style: React.CSSProperties = { gridRow: row + 1, gridColumn: col + 1 };
          if (row % 2 === 0 && col % 2 === 0) {
            const x = col / 2, y = row / 2;
            const pawn = Object.entries(state.pawns).find(([, pos]) => pos.x === x && pos.y === y);
            const pawnPlayer = pawn ? state.players.find((player) => player.userId === pawn[0]) : null;
            const allowedMove = hasAction(legalActions, "move_pawn", (action) => action.x === x && action.y === y);
            return <button key={index} type="button" style={style} aria-label={`Barricades tile ${x + 1}, ${y + 1}${pawnPlayer ? ` occupied by ${pawnPlayer.displayName}` : ""}`} disabled={!isMyTurn || !allowedMove} onClick={() => { if (allowedMove) { onAction("move_pawn", { x, y }); setHoveredWall(null); setWallMode(null); } }} className={`relative z-10 grid aspect-square min-h-0 min-w-0 place-items-center rounded-[3px] border border-cyan-50/[.07] transition ${allowedMove ? "bg-emerald-300/15 ring-1 ring-inset ring-emerald-200/65 hover:bg-emerald-200/25" : "bg-[#203942]"}`}>
              {pawnPlayer ? <span title={pawnPlayer.displayName} className="block h-[62%] w-[62%] rounded-full border-2 border-white/90 shadow-[0_0_12px_rgba(255,255,255,.3),inset_0_2px_2px_rgba(255,255,255,.38)]" style={{ background: PLAYER_COLORS[pawnPlayer.seat % PLAYER_COLORS.length] }} /> : null}
            </button>;
          }
          const horizontalGap = row % 2 === 1 && col % 2 === 0;
          const verticalGap = row % 2 === 0 && col % 2 === 1;
          if (!horizontalGap && !verticalGap) return <div key={index} style={style} className="pointer-events-none" />;
          const orientation: "h" | "v" = horizontalGap ? "h" : "v";
          const x = horizontalGap ? col / 2 : (col - 1) / 2;
          const y = horizontalGap ? (row - 1) / 2 : row / 2;
          const eligible = x >= 0 && x <= 7 && y >= 0 && y <= 7;
          const existing = eligible ? state.walls.find((wall) => wall.orientation === orientation && (orientation === "h" ? wall.y === y && (wall.x === x || wall.x + 1 === x) : wall.x === x && (wall.y === y || wall.y + 1 === y))) : undefined;
          const isExistingSegment = existing && (orientation === "h" ? existing.x !== x : existing.y !== y);
          if (isExistingSegment) return <div key={index} style={style} className="pointer-events-none" />;
          const wallOwner = existing ? state.players.find((player) => player.userId === existing.playerId) : null;
          if (existing) {
            const start = orientation === "h" ? existing.x === x : existing.y === y;
            const wallStyle: React.CSSProperties = orientation === "h"
              ? { gridRow: row + 1, gridColumn: `${col + 1} / span 3` }
              : { gridColumn: col + 1, gridRow: `${row + 1} / span 3` };
            return start ? <div key={index} style={wallStyle} title={`Wall placed by ${wallOwner?.displayName ?? "player"}`} className={`barricades-wall-solid ${orientation === "h" ? "barricades-h-wall" : "barricades-v-wall"} relative z-30 self-center rounded-full border border-orange-100/80 bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,.28)]`} /> : <div key={index} style={style} className="pointer-events-none" />;
          }
          const legalWall = eligible && (!wallMode || wallMode === orientation) && hasAction(legalActions, "place_wall", (action) => action.x === x && action.y === y && action.orientation === orientation);
          const currentKey = `${orientation}:${x}:${y}`;
          const hovered = hoveredKey === currentKey;
          if (!eligible) return <div key={index} style={style} className="pointer-events-none" />;
          const previewStyle: React.CSSProperties = hovered && legalWall
            ? orientation === "h" ? { gridRow: row + 1, gridColumn: `${col + 1} / span 3` } : { gridColumn: col + 1, gridRow: `${row + 1} / span 3` }
            : style;
          return <button key={index} type="button" style={previewStyle} title={legalWall ? `Place ${orientation === "h" ? "horizontal" : "vertical"} wall at ${x + 1}, ${y + 1}` : "Wall would overlap or block a path"} aria-label={`Place ${orientation === "h" ? "horizontal" : "vertical"} wall at ${x + 1}, ${y + 1}`} disabled={!isMyTurn || remaining < 1 || !legalWall} onMouseEnter={() => legalWall && setHoveredWall({ x, y, orientation })} onMouseLeave={() => setHoveredWall(null)} onFocus={() => legalWall && setHoveredWall({ x, y, orientation })} onBlur={() => setHoveredWall(null)} onClick={() => { if (!legalWall) return; onAction("place_wall", { x, y, orientation }); setHoveredWall(null); setWallMode(null); }} className={`relative ${hovered && legalWall ? `barricades-wall-solid ${orientation === "h" ? "barricades-h-wall" : "barricades-v-wall"} z-40 self-center rounded-full border border-orange-100 bg-orange-300 shadow-[0_0_12px_rgba(251,146,60,.48)]` : "z-20 rounded-sm bg-transparent"} ${legalWall ? "cursor-crosshair hover:bg-orange-300/35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-100" : "cursor-not-allowed"}`}>
            {hovered && legalWall ? <span className="pointer-events-none absolute inset-0 grid place-items-center text-[9px] font-black uppercase text-orange-950">Place wall</span> : null}
          </button>;
        })}
      </div>
      <div className="flex items-center justify-between gap-2 text-[10px] text-white/45"><span>{hoveredWall ? `Preview: ${hoveredWall.orientation === "h" ? "horizontal" : "vertical"} wall` : wallMode ? `Showing ${wallMode === "h" ? "horizontal" : "vertical"} wall gaps` : "Hover a horizontal or vertical gap to preview a legal wall."}</span><span className="shrink-0 text-emerald-100/60">Green tile rings = legal pawn moves</span></div>
    </div>;
  }


  function renderMonopoly() {
    const propertyAt = state.properties[state.positions[currentUserId] ?? 0];
    return <div className="mx-auto w-full max-w-[900px]"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-2xl font-black">🏠 Property Tycoon</h2><p className="text-sm text-white/50">Roll, move, buy properties and collect rent.</p></div><div className="rounded-2xl border border-emerald-200/20 bg-emerald-300/[.08] px-4 py-3"><p className="text-[10px] font-black uppercase tracking-widest text-emerald-100/50">Your cash</p><p className="text-2xl font-black text-emerald-100">{money(me?.money)}</p></div></div>
      <div className="grid grid-cols-5 gap-2 sm:grid-cols-8 lg:grid-cols-10">{state.properties.map((property, index) => { const positionPlayers = state.players.filter((player) => player.position === index); const owner = state.players.find((player) => player.userId === property.ownerId); const occupied = positionPlayers.some((player) => player.userId === currentUserId); return <div key={property.id} className={`relative flex min-h-[78px] flex-col rounded-xl border p-2 text-left ${occupied ? "border-emerald-300 ring-2 ring-emerald-300/30" : "border-white/10"} ${owner ? "bg-emerald-300/10" : "bg-[#101d1b]"}`}><span className="text-[9px] font-bold text-white/35">{String(index).padStart(2,"0")}</span><span className="mt-1 line-clamp-2 text-[10px] font-black leading-tight">{property.label}</span><span className="mt-auto text-[10px] font-bold text-emerald-100/65">{property.cost ? money(property.cost) : "—"}</span>{owner ? <span className="mt-1 truncate text-[9px] font-black" style={{ color: PLAYER_COLORS[owner.seat % PLAYER_COLORS.length] }}>● {owner.displayName}</span> : null}{positionPlayers.length ? <span className="absolute right-1 top-1 text-sm">{positionPlayers.map(() => "🎲").join("")}</span> : null}</div>; })}</div>
      <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-black/20 p-3"><div className="mr-auto"><p className="text-xs font-black uppercase tracking-widest text-white/40">Current space</p><p className="font-black">{propertyAt?.label ?? "Start"}</p></div>{hasAction(legalActions,"roll_dice") ? <button onClick={() => onAction("roll_dice")} className="min-h-12 rounded-xl bg-emerald-300 px-5 font-black text-slate-950 hover:bg-emerald-200">🎲 Roll</button> : null}{hasAction(legalActions,"buy_property") ? <button onClick={() => onAction("buy_property")} className="min-h-12 rounded-xl bg-amber-300 px-5 font-black text-slate-950 hover:bg-amber-200">🏡 Buy for {money(propertyAt?.cost)}</button> : null}{hasAction(legalActions,"end_turn") ? <button onClick={() => onAction("end_turn")} className="min-h-12 rounded-xl border border-white/10 px-4 font-bold">End turn</button> : null}</div>
    </div>;
  }

  function renderConquest() {
    const selected = state.territories.find((territory) => territory.id === selectedTerritory);
    return <div className="mx-auto w-full max-w-[1000px]"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-2xl font-black">{state.gameId === "risk" ? "🌍 Risk" : "🗺️ World Conquest"}</h2><p className="text-sm text-white/50">Claim land, reinforce borders and attack neighboring territories.</p></div><div className="rounded-xl border border-rose-200/15 bg-rose-300/10 px-3 py-2 text-xs font-black text-rose-100">{state.territories.filter((territory) => state.territoryOwners[territory.id] !== null).length}/{state.territories.length} territories owned</div></div>
      <div className="grid grid-cols-4 gap-2 rounded-2xl border border-white/10 bg-[#081922] p-3 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-11">{state.territories.map((territory) => { const ownerId = state.territoryOwners[territory.id] ?? null; const owner = state.players.find((player) => player.userId === ownerId); const isSelected = selectedTerritory === territory.id; const canClaim = hasAction(legalActions,"claim_territory",(action) => action.territoryId === territory.id); const canReinforce = hasAction(legalActions,"reinforce_territory",(action) => action.territoryId === territory.id); const canAttack = selected ? hasAction(legalActions,"attack_territory",(action) => action.fromId === selected.id && action.toId === territory.id) : false; return <button key={territory.id} type="button" disabled={!isMyTurn || (!canClaim && !canReinforce && !canAttack && !ownerId)} onClick={() => { if (canClaim) { onAction("claim_territory", { territoryId: territory.id }); setSelectedTerritory(null); } else if (canAttack && selected) { onAction("attack_territory", { fromId: selected.id, toId: territory.id }); setSelectedTerritory(null); } else if (canReinforce) { setSelectedTerritory(territory.id); } else if (ownerId === currentUserId) { setSelectedTerritory(territory.id); } }} className={`min-h-[72px] rounded-xl border p-2 text-left transition hover:-translate-y-0.5 disabled:cursor-default disabled:opacity-50 ${isSelected ? "border-amber-300 ring-2 ring-amber-300/30" : owner ? "border-white/15" : "border-white/[.06]"}`} style={{ background: owner ? `${PLAYER_COLORS[owner.seat % PLAYER_COLORS.length]}25` : "rgba(255,255,255,.025)" }}><span className="block line-clamp-2 text-[10px] font-black leading-tight">{territory.label}</span><span className="mt-2 block text-[10px] font-black" style={{ color: owner ? PLAYER_COLORS[owner.seat % PLAYER_COLORS.length] : "rgba(255,255,255,.25)" }}>{owner ? `● ${owner.displayName}` : "Unclaimed"}</span><span className="mt-1 block text-[10px] text-white/55">🪖 {state.territoryTroops[territory.id] ?? 0}</span></button>; })}</div>
      <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-black/20 p-3"><div className="mr-auto text-xs text-white/50">{selected ? `Selected: ${selected.label}` : "Select an owned territory to reinforce or attack an adjacent enemy."}</div>{selected && hasAction(legalActions,"reinforce_territory",(action) => action.territoryId === selected.id) ? <button onClick={() => { onAction("reinforce_territory",{territoryId:selected.id}); setSelectedTerritory(null); }} className="min-h-10 rounded-lg bg-amber-300 px-3 text-xs font-black text-slate-950">🪖 Reinforce +2</button> : null}<button onClick={() => { onAction("end_turn"); setSelectedTerritory(null); }} disabled={!isMyTurn || !hasAction(legalActions,"end_turn")} className="min-h-10 rounded-lg border border-white/10 px-3 text-xs font-bold">End turn</button></div>
    </div>;
  }

  function renderCodenames() {
    const revealedCounts = state.wordCards.reduce((counts, card) => {
      if (card.revealed && card.revealedRole) counts[card.revealedRole] = (counts[card.revealedRole] ?? 0) + 1;
      return counts;
    }, {} as Record<string, number>);
    const team = state.codenamesCurrentTeam;
    const teamName = team === "red" ? "RED" : "BLUE";
    return <div className="mx-auto w-full max-w-[1000px]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-2xl font-black">🕵️ Codenames</h2><p className="text-sm text-white/50">Spymaster gives one clue and a number; operatives find matching agents without touching the assassin.</p></div>
        <div className="flex flex-wrap gap-2"><span className="rounded-full bg-rose-400/15 px-3 py-1 text-xs font-black text-rose-200">🔴 {revealedCounts.red ?? 0}/9</span><span className="rounded-full bg-sky-400/15 px-3 py-1 text-xs font-black text-sky-200">🔵 {revealedCounts.blue ?? 0}/8</span><span className={`rounded-full border px-3 py-1 text-xs font-black ${team === "red" ? "border-rose-200/25 bg-rose-300/10 text-rose-100" : "border-sky-200/25 bg-sky-300/10 text-sky-100"}`}>{teamName} TEAM TURN</span></div>
      </div>
      <section className="mb-3 rounded-2xl border border-white/10 bg-[#0b131c] p-3 sm:p-4">
        {state.codenamesClue ? <div className="flex flex-wrap items-center gap-3"><div className="mr-auto"><p className="text-[9px] font-black uppercase tracking-[.2em] text-white/40">Current clue · {teamName}</p><p className="text-xl font-black text-amber-100">{state.codenamesClue} <span className="text-sm text-white/55">({state.codenamesClueNumber === 0 ? "unlimited" : state.codenamesClueNumber})</span></p></div><div className="rounded-xl border border-amber-200/20 bg-amber-200/[.06] px-3 py-2 text-right"><p className="text-[9px] font-black uppercase tracking-widest text-amber-100/45">Guesses remaining</p><p className="text-xl font-black text-amber-100">{state.codenamesGuessesRemaining}</p></div></div> : <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-bold text-white/60">Waiting for the {teamName.toLowerCase()} spymaster to give a clue.</p><span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white/40">Clue phase</span></div>}
        {state.isCodenamesSpymaster ? <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-amber-100/55">🔑 You are the spymaster — unrevealed cards show the secret key only on your screen.</p> : <p className="mt-2 text-[10px] text-white/35">Operatives cannot see the key. A correct guess keeps your turn until the clue budget is used; a bystander or opposing agent ends it.</p>}
      </section>
      {hasAction(legalActions, "give_clue") ? <section className="mb-3 grid gap-2 rounded-2xl border border-amber-200/15 bg-amber-300/[.04] p-3 sm:grid-cols-[minmax(0,1fr)_120px_auto] sm:items-end">
        <label className="grid gap-1 text-[10px] font-black uppercase tracking-widest text-white/45">One-word clue
          <input value={codenamesClueText} onChange={(event) => setCodenamesClueText(event.target.value)} maxLength={30} placeholder="e.g. Tropical" className="h-11 rounded-xl border border-white/10 bg-black/25 px-3 text-sm font-bold normal-case tracking-normal text-white outline-none focus:border-amber-200/50" />
        </label>
        <label className="grid gap-1 text-[10px] font-black uppercase tracking-widest text-white/45">Number
          <select value={codenamesClueNumber} onChange={(event) => setCodenamesClueNumber(Number(event.target.value))} className="h-11 rounded-xl border border-white/10 bg-[#111a24] px-3 text-sm font-black text-white outline-none focus:border-amber-200/50">{Array.from({ length: 10 }, (_, number) => <option key={number} value={number}>{number === 0 ? "0 · Unlimited" : number}</option>)}</select>
        </label>
        <button type="button" onClick={() => { onAction("give_clue", { clue: codenamesClueText.trim(), number: codenamesClueNumber }); setCodenamesClueText(""); }} disabled={!codenamesClueText.trim() || /\s/.test(codenamesClueText.trim()) || state.wordCards.some((card) => card.word.toLowerCase() === codenamesClueText.trim().toLowerCase())} className="min-h-11 rounded-xl bg-amber-300 px-4 text-xs font-black text-slate-950 hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-35">Give clue</button>
      </section> : null}
      <div className="grid grid-cols-5 gap-2 sm:gap-3">{state.wordCards.map((card, index) => {
        const role = card.revealedRole ?? (state.isCodenamesSpymaster ? card.keyRole : null);
        const cardStyle = role === "red" ? "border-rose-300/40 bg-rose-500/25 text-rose-100" : role === "blue" ? "border-sky-300/40 bg-sky-500/25 text-sky-100" : role === "assassin" ? "border-black bg-black text-white" : role === "neutral" ? "border-amber-100/20 bg-[#d8d1bc] text-[#343124]" : "border-amber-100/25 bg-gradient-to-br from-[#f6e8c3] to-[#d7c59d] text-[#463d2a] hover:from-white hover:to-[#ead8af]";
        return <button key={card.word} type="button" aria-label={`Codenames word ${card.word}${card.revealed ? `, revealed ${card.revealedRole}` : ""}`} onClick={() => onAction("reveal_word", { index })} disabled={!isMyTurn || state.isCodenamesSpymaster || !state.codenamesClue || card.revealed || !hasAction(legalActions, "reveal_word", (action) => action.index === index)} className={`flex aspect-[1.3/1] flex-col items-center justify-center rounded-xl border px-1 text-center font-black shadow-[0_4px_14px_rgba(0,0,0,.25)] transition hover:-translate-y-0.5 disabled:cursor-default ${cardStyle}`}><span className="text-[clamp(.55rem,1.3vw,.9rem)] tracking-wide sm:text-sm">{card.word}</span>{card.revealed && card.revealedRole ? <span className="mt-1 text-[9px] uppercase tracking-widest opacity-70">{card.revealedRole === "assassin" ? "☠ assassin" : card.revealedRole}</span> : state.isCodenamesSpymaster && role ? <span className="mt-1 text-[9px] uppercase tracking-widest opacity-60">{role === "assassin" ? "☠ assassin" : role}</span> : null}</button>;
      })}</div>
      {hasAction(legalActions, "end_codenames_turn") ? <div className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-black/20 p-3"><p className="mr-auto text-xs text-white/45">You can pass once you are satisfied with your guesses.</p><button type="button" onClick={() => onAction("end_codenames_turn")} className="min-h-10 rounded-xl border border-white/15 px-4 text-xs font-black text-white/80 hover:bg-white/5">End guessing turn</button></div> : null}
      <p className="mt-3 text-[10px] leading-relaxed text-white/30">Rules: 4–10 players, alternating teams by seat. A clue number N permits up to N+1 guesses; 0 allows continuing until a wrong card is revealed. A neutral or opposing agent passes the turn, an assassin loses immediately, and revealing every agent on a team's key wins the match. The spymaster key stays private.</p>
    </div>;
  }

  function renderPoker() {
    const myPaid = state.pokerBets[currentUserId] ?? 0;
    const myStack = state.pokerStacks[currentUserId] ?? 0;
    const callAmount = Math.min(Math.max(0, state.pokerBetToCall - myPaid), myStack);
    const activePlayers = state.players.filter((player) => !player.folded).length;
    const showHandCards = state.communityCards.length > 0 && state.pokerStreet !== "preflop";
    return <div className="poker-casino flex h-full min-h-0 w-full flex-col gap-2">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200/15 bg-[#0b1513] px-3 py-2 shadow-[0_8px_25px_rgba(0,0,0,.22)]">
        <div className="flex min-w-0 items-center gap-2"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-amber-200/25 bg-amber-300/10 text-2xl text-amber-100">♠</span><div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-[.25em] text-amber-200/55">After-hours casino</p><h2 className="truncate text-lg font-black text-white">Texas Hold’em <span className="text-amber-100/55">· Hand {state.pokerHandNumber ?? 1}</span></h2></div></div>
        <div className="flex items-center gap-2"><div className="rounded-lg border border-amber-200/15 bg-black/20 px-3 py-1.5 text-right"><p className="text-[8px] font-black uppercase tracking-[.2em] text-white/35">Table pot</p><p className="text-lg font-black tabular-nums text-amber-100">${state.pokerPot.toLocaleString("en-US")}</p></div><button type="button" onClick={() => setPokerRulesOpen(true)} className="min-h-9 rounded-lg border border-amber-200/25 bg-amber-200/10 px-3 text-[10px] font-black uppercase tracking-wider text-amber-100 transition hover:bg-amber-200/20">♜ Hand rankings</button></div>
      </header>
      <section className="poker-casino-felt relative flex min-h-0 flex-1 flex-col justify-between overflow-hidden rounded-[2rem] border-[5px] border-[#9e7138] px-2 py-2 shadow-[inset_0_0_0_2px_rgba(255,235,190,.08),inset_0_0_60px_rgba(0,0,0,.3),0_18px_35px_rgba(0,0,0,.35)] sm:px-3">
        <div className="pointer-events-none absolute inset-[3%] rounded-[48%] border border-amber-100/15"/><div className="pointer-events-none absolute inset-[7%] rounded-[45%] border border-emerald-100/[.06]"/>
        <div className="relative z-10 grid shrink-0 grid-cols-2 gap-1.5 sm:grid-cols-3 xl:grid-cols-6">
          {state.players.map((player) => {
            const eliminated = (player.stack ?? 0) <= 0 && player.folded;
            return <div key={player.userId} className={`min-w-0 rounded-lg border px-2 py-1.5 text-center shadow-[0_4px_12px_rgba(0,0,0,.15)] ${player.isCurrentTurn ? "border-amber-200/50 bg-amber-100/[.12] ring-1 ring-amber-200/20" : "border-white/10 bg-[#04120e]/65"} ${player.folded || eliminated ? "opacity-45" : ""}`}>
              <div className="flex items-center justify-center gap-1"><span className="h-1.5 w-1.5 rounded-full" style={{ background: PLAYER_COLORS[player.seat % PLAYER_COLORS.length] }}/><p className="max-w-full truncate text-[10px] font-black text-white">{player.displayName}{player.userId === currentUserId ? " · YOU" : ""}</p></div>
              <p className="mt-0.5 truncate text-[9px] font-bold text-emerald-100/60">{eliminated ? "BUSTED" : player.folded ? "FOLDED" : `$${(player.stack ?? 0).toLocaleString("en-US")}`}{player.seat === state.pokerButtonSeat ? " · DEALER" : ""}</p>
              <div className="mt-1 flex min-h-[2.6rem] items-center justify-center gap-1">
                {player.folded || eliminated ? <span className="text-[9px] font-black uppercase text-white/25">Out</span> : player.userId === currentUserId ? state.myPokerCards.map((card) => <PokerPlayingCard key={card} card={card} compact />) : <><PokerPlayingCard hidden compact/><PokerPlayingCard hidden compact/></>}
              </div>
              <p className="mt-0.5 text-[8px] font-bold text-amber-100/60">Bet ${(player.bet ?? 0).toLocaleString("en-US")}</p>
            </div>;
          })}
        </div>
        <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center py-1 text-center">
          <div className="rounded-full border border-amber-100/15 bg-black/25 px-3 py-1 text-[9px] font-black uppercase tracking-[.22em] text-amber-100/65">{state.pokerStreet} · {activePlayers} live</div>
          <div className="mt-2 flex min-h-0 items-center justify-center gap-1.5 sm:gap-2" aria-label="Community cards">
            {Array.from({ length: 5 }, (_, index) => <PokerPlayingCard key={index} card={state.communityCards[index] ?? null} compact />)}
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2"><span className="rounded-full border border-amber-100/15 bg-[#04120e]/70 px-3 py-1 text-[10px] font-black text-amber-100">POT ${state.pokerPot.toLocaleString("en-US")}</span><span className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-[10px] font-bold text-white/65">To call ${callAmount.toLocaleString("en-US")}</span></div>
          <p className="mt-2 max-w-[95%] text-[10px] font-semibold leading-relaxed text-emerald-50/70" aria-live="polite">{state.pokerLastAction}</p>
          {showHandCards ? <p className="mt-1 text-[8px] font-bold uppercase tracking-[.18em] text-amber-100/35">Best five cards win · kickers break ties</p> : null}
        </div>
      </section>
      <footer className="flex shrink-0 flex-wrap items-center gap-2 rounded-xl border border-white/[.07] bg-[#0b1513] px-3 py-2">
        <div className="mr-auto min-w-0"><p className="text-[8px] font-black uppercase tracking-[.2em] text-white/35">Your chips</p><p className="text-sm font-black text-emerald-100">${myStack.toLocaleString("en-US")} <span className="text-[9px] font-semibold text-white/35">· Button rotates each hand</span></p></div>
        {legalActions.filter(isAction).filter((action) => action.type === "poker_action").map((action) => <button key={String(action.choice)} type="button" onClick={() => dispatch(action)} className={`min-h-10 rounded-lg px-3 text-[10px] font-black uppercase tracking-wider transition hover:-translate-y-0.5 ${action.choice === "fold" ? "border border-rose-300/25 bg-rose-500/10 text-rose-100 hover:bg-rose-500/20" : action.choice === "raise" || action.choice === "all_in" ? "border border-amber-100/30 bg-gradient-to-b from-amber-200 to-amber-400 text-[#251707] shadow-[0_3px_0_#8e5d25] hover:brightness-105" : "border border-emerald-200/20 bg-emerald-300/10 text-emerald-100 hover:bg-emerald-300/20"}`}>{action.choice === "fold" ? "Fold" : action.choice === "check" ? "Check" : action.choice === "call" ? `Call $${callAmount}` : action.choice === "raise" ? "Raise +$20" : "All-in"}</button>)}
      </footer>
      {pokerRulesOpen ? <div className="fixed inset-0 z-[200] grid place-items-center bg-black/75 p-3 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="poker-rules-title" onClick={() => setPokerRulesOpen(false)}><section className="poker-rules-modal w-full max-w-3xl rounded-2xl border border-amber-200/25 bg-[#07120f] p-4 shadow-[0_25px_90px_rgba(0,0,0,.72)]" onClick={(event) => event.stopPropagation()}><div className="flex items-start justify-between gap-3"><div><p className="text-[9px] font-black uppercase tracking-[.25em] text-amber-200/55">Casino cheat sheet</p><h3 id="poker-rules-title" className="mt-1 text-xl font-black text-amber-100">Poker hand rankings</h3><p className="mt-1 text-[10px] text-white/50">Strongest to weakest · use your best five of seven cards.</p></div><button type="button" onClick={() => setPokerRulesOpen(false)} aria-label="Close hand rankings" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 text-white/70 hover:bg-white/10">✕</button></div><div className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {POKER_HAND_RANKINGS.map((hand, index) => <article key={hand.name} className="flex min-w-0 items-start gap-2 rounded-lg border border-white/[.07] bg-white/[.035] p-2"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-md border border-amber-100/20 bg-amber-200/10 text-[10px] font-black text-amber-100">{index + 1}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-1.5"><h4 className="text-[11px] font-black text-white">{hand.name}</h4><span className="text-[7px] font-black uppercase tracking-widest text-amber-200/45">{hand.tier}</span></div><p className="mt-0.5 font-mono text-[9px] font-bold text-emerald-100/85">{hand.example}</p><p className="mt-0.5 text-[9px] leading-snug text-white/50">{hand.detail}</p></div></article>)}
      </div><div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3"><div className="rounded-lg border border-white/[.07] bg-black/20 p-2"><p className="text-[9px] font-black text-amber-100">Card order</p><p className="mt-1 text-[9px] leading-snug text-white/55">2, 3, 4, 5, 6, 7, 8, 9, 10, J, Q, K, A. Ace can be low only in A-2-3-4-5.</p></div><div className="rounded-lg border border-white/[.07] bg-black/20 p-2"><p className="text-[9px] font-black text-amber-100">Kickers & ties</p><p className="mt-1 text-[9px] leading-snug text-white/55">Compare the category first, then its tie-break ranks. Equal hands split the eligible pot; odd chips go by seat order.</p></div><div className="rounded-lg border border-white/[.07] bg-black/20 p-2"><p className="text-[9px] font-black text-amber-100">Hand flow</p><p className="mt-1 text-[9px] leading-snug text-white/55">Preflop → flop (3 cards) → turn → river → showdown. Fold, check/call, raise or go all-in. Dealer button rotates; play continues until one stack remains.</p></div></div><p className="mt-2 text-[8px] font-semibold text-white/30">Suits have equal strength. This table uses fixed $10/$20 blinds and $20 fixed-limit raises (not no-limit betting).</p></section></div> : null}
    </div>;
  }


  function renderBoard() {
    switch (state.gameId) {
      case "chess": return renderChess();
      case "battleship": return renderBattleships();
      case "ludo": return renderLudo();
      case "barricades": return renderBarricades();
      case "monopoly": return renderMonopoly();
      case "risk":
      case "world-conquest": return renderConquest();
      case "codenames": return renderCodenames();
      case "poker": return renderPoker();
    }
  }

  return <div className="prototype-game-screen h-dvh min-h-0 overflow-hidden bg-[#050a0f] text-slate-100">
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex h-[64px] shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-[#08121b] px-4 lg:px-6">
        <div className="flex min-w-0 items-center gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[.045] text-xl">{meta.icon}</div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h1 className="truncate text-lg font-black tracking-tight lg:text-xl">{meta.title}</h1><span className="rounded-full border border-amber-200/20 bg-amber-200/[.07] px-2 py-0.5 text-[9px] font-black uppercase tracking-[.2em] text-amber-100/75">Prototype</span></div><p className="hidden text-[11px] font-semibold text-white/40 sm:block">Room {room.code} · {meta.description}</p></div></div>
        <div className="flex shrink-0 items-center gap-2"><span className={`hidden rounded-full border px-3 py-2 text-xs font-bold sm:inline-flex ${isMyTurn ? "border-emerald-200/25 bg-emerald-300/10 text-emerald-100" : "border-white/10 bg-white/[.035] text-white/55"}`}>{isMyTurn ? "🟢 Your turn" : `⏳ ${currentPlayer?.displayName ?? "No active player"}`}</span><button type="button" onClick={dashboard} className="min-h-10 rounded-xl border border-white/10 bg-white/[.055] px-3 text-xs font-black transition hover:border-emerald-200/30 hover:bg-emerald-300/10">🏠 Dashboard</button>{canEndRoom && onEndMatch && room.status !== "finished" ? <button type="button" onClick={() => { if (window.confirm("End this room for everyone?")) onEndMatch(room.id); }} className="hidden min-h-10 rounded-xl border border-rose-300/20 px-3 text-xs font-black text-rose-200 hover:bg-rose-400/10 md:inline-flex md:items-center">End room</button> : null}</div>
      </header>
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 p-3 lg:grid-cols-[minmax(0,1fr)_350px] lg:gap-4 lg:p-4 xl:grid-cols-[minmax(0,1fr)_370px]">
        <main className="relative min-h-0 min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(ellipse_at_45%_0%,rgba(30,64,85,.22),transparent_60%),linear-gradient(145deg,#0b141d,#080e14)] p-3 sm:p-5 lg:overflow-y-auto lg:p-5 xl:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-white/[.07] pb-3"><div><p className="text-[10px] font-black uppercase tracking-[.25em]" style={{ color: meta.accent }}>Tabletop Arena / Board Games</p><p className="mt-1 text-xs text-white/45">{state.players.length} players · Turn {state.turnNumber} · Move {state.actionNumber}</p></div><div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs font-bold text-white/65">{isMyTurn ? "⚡ Your move" : `👤 ${currentPlayer?.displayName ?? "—"}`}</div></div>
          <div className="prototype-board-content min-h-0 min-w-0 flex-1">{renderBoard()}</div>
          <div className="mt-5 rounded-xl border border-amber-200/15 bg-amber-100/[.045] p-3 text-xs leading-relaxed text-amber-100/70"><span className="mr-2 font-black">🚧 EARLY ACCESS</span>{state.prototypeNotice}</div>
          {state.phase === "finished" ? <div className="absolute inset-0 z-30 grid place-items-center bg-black/75 p-5 backdrop-blur-sm"><div className="w-full max-w-md rounded-3xl border border-emerald-100/20 bg-[#0c181d] p-8 text-center shadow-2xl"><div className="text-5xl">🏆</div><h2 className="mt-3 text-2xl font-black">{state.winnerUserId === currentUserId ? "You won!" : `${state.players.find((player) => player.userId === state.winnerUserId)?.displayName ?? "The match"} won!`}</h2><p className="mt-2 text-sm text-white/50">The match has ended. Return to the dashboard when you are ready.</p><button type="button" onClick={dashboard} className="mt-6 min-h-12 w-full rounded-xl bg-emerald-300 px-5 font-black text-slate-950 hover:bg-emerald-200">🏠 Return to dashboard</button></div></div> : null}
        </main>
        <aside className="grid min-h-0 grid-rows-[auto_minmax(120px,.8fr)_minmax(200px,1fr)] gap-3 overflow-hidden lg:grid-rows-[minmax(140px,.72fr)_minmax(150px,.9fr)_minmax(180px,1fr)]">
          <section className="min-h-0 overflow-hidden rounded-2xl border border-white/10 bg-[#0b131c] p-3"><div className="mb-2 flex items-center justify-between"><h2 className="text-xs font-black uppercase tracking-[.2em] text-white/70">👥 Players</h2><span className="text-[10px] font-bold text-white/30">{state.players.length} seated</span></div><div className="grid gap-1.5 overflow-y-auto pr-1">{state.players.map((player) => <div key={player.userId} className={`flex min-w-0 items-center gap-2 rounded-xl border px-2.5 py-2 ${player.isCurrentTurn ? "border-emerald-200/25 bg-emerald-300/[.06]" : "border-white/[.055] bg-white/[.02]"}`}><span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs font-black text-slate-950" style={{ background: PLAYER_COLORS[player.seat % PLAYER_COLORS.length] }}>{player.displayName.trim().slice(0,1).toUpperCase()}</span><div className="min-w-0 flex-1"><p className="truncate text-xs font-black">{player.displayName}{player.userId === currentUserId ? " (you)" : ""}</p><p className="text-[9px] font-bold uppercase tracking-wider text-white/35">{player.isBot ? "🤖 Bot" : "🧑 Player"}{player.isCurrentTurn ? " · Turn" : ""}</p></div>{state.gameId === "monopoly" ? <strong className="text-xs text-emerald-100">{money(player.money)}</strong> : state.gameId === "poker" ? <strong className="text-xs text-emerald-100">${player.stack}</strong> : state.gameId === "codenames" ? <strong className="text-xs" style={{ color: player.team === "red" ? "#fb7185" : "#7dd3fc" }}>{player.team === "red" ? "🔴 Red" : "🔵 Blue"}{player.isSpymaster ? " · Spy" : ""}</strong> : null}</div>)}</div></section>
          <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0b131c] p-3"><div className="mb-2 flex shrink-0 items-center justify-between"><h2 className="text-xs font-black uppercase tracking-[.2em] text-white/70">📜 Game log</h2><span className="text-[10px] font-bold text-white/30">Latest {log.length}</span></div><div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">{log.length ? log.map((entry) => <div key={entry.id} className="flex items-start gap-2 rounded-xl border border-white/[.045] bg-white/[.025] px-2.5 py-2"><ActivityIcon type={entry.type} message={entry.message} /><div className="min-w-0 flex-1"><p className="break-words text-[11px] leading-relaxed text-white/75">{entry.message}</p><p className="mt-0.5 text-[9px] text-white/25">{new Date(entry.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p></div></div>) : <p className="py-5 text-center text-xs text-white/35">Waiting for the first move…</p>}</div></section>
          <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0b131c] p-2"><div className="shrink-0 px-2 py-1"><h2 className="text-xs font-black uppercase tracking-[.2em] text-white/70">💬 Table chat</h2></div><div className="min-h-0 flex-1 overflow-hidden"><RoomChat roomId={room.id} messages={room.chat} onSend={onChat} onlineCount={room.players.filter((player) => player.connected).length} /></div></section>
        </aside>
      </div>
    </div>
  </div>;
}
