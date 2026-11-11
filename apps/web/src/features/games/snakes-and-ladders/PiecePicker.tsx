"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import {
  SNAKES_AND_LADDERS_PIECES,
  type SnakesAndLaddersPieceId
} from "@tabletop/game-core";

export function PiecePicker(props: {
  selectedPiece: SnakesAndLaddersPieceId;
  onSelect: (piece: SnakesAndLaddersPieceId) => void;
  disabled?: boolean;
}) {
  const { selectedPiece, onSelect, disabled } = props;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-xs font-black uppercase tracking-wider text-amber-300">
            Choose Your Game Piece
          </h4>
          <p className="text-[11px] text-white/50">
            Your unique avatar that will race on the board
          </p>
        </div>
        <span className="rounded-lg bg-amber-400/20 border border-amber-400/40 px-2 py-0.5 text-xs font-black text-amber-200">
          {SNAKES_AND_LADDERS_PIECES.find((p) => p.id === selectedPiece)?.emoji}{" "}
          {SNAKES_AND_LADDERS_PIECES.find((p) => p.id === selectedPiece)?.name}
        </span>
      </div>

      <div className="grid grid-cols-5 gap-2 sm:grid-cols-5 md:grid-cols-5">
        {SNAKES_AND_LADDERS_PIECES.map((piece) => {
          const isSelected = piece.id === selectedPiece;
          return (
            <motion.button
              key={piece.id}
              type="button"
              disabled={disabled}
              whileHover={{ scale: disabled ? 1 : 1.05 }}
              whileTap={{ scale: disabled ? 1 : 0.95 }}
              onClick={() => onSelect(piece.id)}
              className={`relative flex flex-col items-center justify-center rounded-xl border p-2 transition-all ${
                isSelected
                  ? "border-amber-400 bg-gradient-to-b from-amber-500/30 to-amber-600/10 ring-2 ring-amber-400/50 shadow-[0_0_15px_rgba(251,191,36,0.4)]"
                  : "border-white/10 bg-black/40 hover:border-white/25 hover:bg-white/5"
              } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            >
              {isSelected ? (
                <span className="absolute top-1 right-1 grid h-3.5 w-3.5 place-items-center rounded-full bg-amber-400 text-[8px] font-black text-slate-950 shadow">
                  <Check className="h-2.5 w-2.5" />
                </span>
              ) : null}
              <span className="text-2xl sm:text-3xl filter drop-shadow">
                {piece.emoji}
              </span>
              <span className="mt-1 text-[9px] font-bold text-white/80 truncate w-full text-center">
                {piece.name}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
