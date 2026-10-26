import type { BoardGameState } from "../shared/types";
export function canBuyProperty(state:BoardGameState,playerId:string):boolean { const p=state.properties[state.positions[playerId]??0]; return Boolean(p&&p.cost>0&&!p.ownerId&&(state.money[playerId]??0)>=p.cost); }
