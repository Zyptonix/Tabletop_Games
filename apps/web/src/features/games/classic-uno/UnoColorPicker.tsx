"use client";

import type { UnoDeclaredColor } from "@tabletop/game-core";
import { Button } from "@/components/ui/button";

const colors: Array<{ color: UnoDeclaredColor; className: string }> = [
  { color: "red", className: "bg-red-600" },
  { color: "yellow", className: "bg-amber-300" },
  { color: "green", className: "bg-emerald-600" },
  { color: "blue", className: "bg-sky-600" }
];

export function UnoColorPicker({
  onPick,
  onCancel
}: {
  onPick: (color: UnoDeclaredColor) => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-xs rounded-lg bg-white p-4 shadow-2xl">
        <h2 className="mb-3 text-base font-black text-zinc-950">Choose Color</h2>
        <div className="grid grid-cols-4 gap-2">
          {colors.map((item) => (
            <button
              key={item.color}
              type="button"
              className={`h-14 rounded-md border-4 border-white shadow ${item.className}`}
              aria-label={item.color}
              onClick={() => onPick(item.color)}
            />
          ))}
        </div>
        <Button type="button" variant="ghost" className="mt-3 w-full" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
