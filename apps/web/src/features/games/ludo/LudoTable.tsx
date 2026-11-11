"use client";

import type { BoardGameTableProps } from "../board-games/shared/types";
import { SnakesAndLaddersTable } from "../snakes-and-ladders/SnakesAndLaddersTable";
import type { PublicSnakesAndLaddersState } from "@tabletop/game-core";

export function LudoTable(props: BoardGameTableProps) {
  return (
    <SnakesAndLaddersTable
      {...props}
      state={props.state as unknown as PublicSnakesAndLaddersState}
    />
  );
}
