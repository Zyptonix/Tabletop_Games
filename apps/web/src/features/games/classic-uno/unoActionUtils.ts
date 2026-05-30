import type { UnoDeclaredColor } from "@tabletop/game-core";
import type { RenderableCard } from "@/lib/cards";

export interface PlayCardAction {
  type: "play_card";
  cardId: string;
  declaredColor?: UnoDeclaredColor;
  targetPlayerId?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function hasLegalAction(legalActions: unknown[], type: string): boolean {
  return legalActions.some((action) => isRecord(action) && action.type === type);
}

export function getPlayCardActions(legalActions: unknown[], cardId: string): PlayCardAction[] {
  return legalActions.filter(
    (candidate): candidate is PlayCardAction => isRecord(candidate) && candidate.type === "play_card" && candidate.cardId === cardId
  );
}

export function getPlayCardAction(legalActions: unknown[], cardId: string): PlayCardAction | null {
  return getPlayCardActions(legalActions, cardId)[0] ?? null;
}

export function isPlayableCard(legalActions: unknown[], card: Pick<RenderableCard, "id">): boolean {
  return getPlayCardAction(legalActions, card.id) !== null;
}