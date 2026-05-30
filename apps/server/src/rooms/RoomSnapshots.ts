import type { RoomRuntime, SerializableRoomState } from "./RoomTypes";

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
      temporaryHost: false
    })),
    chat: room.chat,
    matchId: room.matchId,
    matchStartedAt: room.matchStartedAt,
    actionNumber: room.actionNumber,
    createdAt: room.createdAt
  };
}
