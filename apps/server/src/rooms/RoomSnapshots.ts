import type { RoomChatMessage, RoomRuntime, SerializableRoomState } from "./RoomTypes";

const REACTION_PREFIX = "__reaction:";
const SNAPSHOT_SYSTEM_CHAT_LIMIT = 20;

export function serializeRoomRuntime(room: RoomRuntime): SerializableRoomState {
  return {
    id: room.id,
    code: room.code,
    gameId: room.gameId,
    status: room.status,
    hostUserId: room.hostUserId,
    settings: room.settings,
    players: room.players.map((player) => ({
      userId: player.userId,
      username: player.username,
      displayName: player.displayName,
      avatarUrl: player.avatarUrl,
      seat: player.seat,
      ready: player.ready,
      connected: false,
      temporaryHost: false,
      isBot: Boolean(player.isBot)
    })),
    chat: serializeSnapshotChat(room.chat),
    matchId: room.matchId,
    matchStartedAt: room.matchStartedAt,
    actionNumber: room.actionNumber,
    createdAt: room.createdAt
  };
}

function serializeSnapshotChat(chat: RoomChatMessage[]): RoomChatMessage[] {
  // Reactions and user chat are realtime/volatile UI state. Persisting them in
  // recovery snapshots caused emoji-heavy JSON writes to fail on WIN1252 DBs.
  // Keep only recent system context so restored rooms stay readable.
  return chat
    .filter((message) => message.type === "system" && !message.body.startsWith(REACTION_PREFIX))
    .slice(-SNAPSHOT_SYSTEM_CHAT_LIMIT);
}
