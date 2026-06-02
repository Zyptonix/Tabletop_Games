import { nanoid } from "nanoid";
import { prisma, type Prisma } from "@tabletop/db";
import {
  ERROR_CODES,
  GAME_IDS,
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
  type ActiveRoomSummary,
  type JoinableRoomSummary,
  type AuthUser,
  type ChatMessageView,
  type GameActionEnvelope,
  type GameId,
  type RoomStateView,
  type TimerView
} from "@tabletop/shared";
import {
  ActionQueue,
  applyClassicUnoDebugScenario,
  applyNoMercyDebugScenario,
  type ClassicUnoState,
  type GameModule,
  type GamePlayer,
  type NoMercyState,
  type TimeoutReason
} from "@tabletop/game-core";
import { ChatRateLimiter } from "../chat/ChatRateLimiter";
import { gameRegistry, type GameRegistry } from "../games/GameRegistry";
import { MatchResultService } from "../services/MatchResultService";
import { SnapshotService } from "../services/SnapshotService";
import { AppError } from "../utils/AppError";
import { serializeRoomRuntime } from "./RoomSnapshots";
import type { RoomChatMessage, RoomRuntime, SerializableRoomState } from "./RoomTypes";

function generateRoomCode(): string {
  let code = "";
  for (let index = 0; index < ROOM_CODE_LENGTH; index += 1) {
    const charIndex = Math.floor(Math.random() * ROOM_CODE_ALPHABET.length);
    code += ROOM_CODE_ALPHABET[charIndex] ?? "A";
  }
  return code;
}

function assertGameId(value: string): GameId {
  if (GAME_IDS.includes(value as GameId)) {
    return value as GameId;
  }
  throw new AppError(ERROR_CODES.INVALID_PAYLOAD, "Unsupported game.");
}

function asSettings(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function roomActionKey(roomId: string, userId: string): string {
  return `${roomId}:${userId}`;
}

const REACTION_PREFIX = "__reaction:";
const BOT_USER_PREFIX = "bot:";
const BOT_TARGET_PLAYER_COUNT = 10;

export function isBotUserId(userId: string): boolean {
  return userId.startsWith(BOT_USER_PREFIX);
}

type AnyGameModule = GameModule<unknown, unknown, unknown>;

export class RoomManager {
  private readonly roomsById = new Map<string, RoomRuntime>();
  private readonly roomIdByCode = new Map<string, string>();
  private readonly chatRateLimiter = new ChatRateLimiter(5, 5_000);
  private readonly reactionRateLimiter = new ChatRateLimiter(2, 1_500);

  constructor(
    private readonly registry: GameRegistry = gameRegistry,
    private readonly snapshots: SnapshotService = new SnapshotService(),
    private readonly matchResults: MatchResultService = new MatchResultService()
  ) {}

  listGames() {
    return this.registry.list();
  }

  listActiveRooms(): ActiveRoomSummary[] {
    return [...this.roomsById.values()].map((room) => ({
      id: room.id,
      code: room.code,
      gameId: room.gameId,
      status: room.status,
      playerCount: room.players.length,
      connectedCount: room.players.filter((player) => player.connected).length,
      hostUserId: room.hostUserId,
      actionNumber: room.actionNumber,
      createdAt: room.createdAt
    }));
  }

  listJoinableRooms(): JoinableRoomSummary[] {
    return [...this.roomsById.values()]
      .filter((room) => {
        if (room.status !== "lobby") return false;
        const module = this.registry.get(room.gameId);
        return Boolean(module && room.players.length < module.maxPlayers);
      })
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .map((room) => {
        const module = this.requireModule(room.gameId);
        return {
          id: room.id,
          code: room.code,
          gameId: room.gameId,
          gameName: module.displayName,
          status: room.status,
          playerCount: room.players.length,
          maxPlayers: module.maxPlayers,
          hostDisplayName: room.players.find((player) => player.userId === room.hostUserId)?.displayName,
          createdAt: room.createdAt
        };
      });
  }
  getRoom(roomId: string): RoomRuntime | null {
    return this.roomsById.get(roomId) ?? null;
  }

  getRoomByCode(code: string): RoomRuntime | null {
    const roomId = this.roomIdByCode.get(code.toUpperCase());
    return roomId ? this.getRoom(roomId) : null;
  }

  listRoomsForUser(userId: string): RoomRuntime[] {
    return [...this.roomsById.values()]
      .filter((room) =>
        room.status !== "finished" &&
        room.status !== "abandoned" &&
        room.players.some((player) => player.userId === userId && !player.isBot)
      )
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  updateUserProfileInRooms(params: { userId: string; displayName: string; avatarUrl: string | null }): RoomRuntime[] {
    const changedRooms: RoomRuntime[] = [];
    for (const room of this.roomsById.values()) {
      const player = room.players.find((item) => item.userId === params.userId && !item.isBot);
      if (!player) continue;
      player.displayName = params.displayName;
      player.avatarUrl = params.avatarUrl;
      changedRooms.push(room);
    }
    return changedRooms;
  }
  getRoomForUser(userId: string): RoomRuntime | null {
    return this.listRoomsForUser(userId)[0] ?? null;
  }

  async createRoom(params: {
    host: AuthUser;
    gameId: GameId;
    settings: Record<string, unknown>;
    socketId?: string;
  }): Promise<RoomRuntime> {
    const module = this.requireModule(params.gameId);
    const settings = asSettings(module.settingsSchema.parse({
      ...(module.defaultSettings as Record<string, unknown>),
      ...params.settings
    }));

    let code = generateRoomCode();
    while (await prisma.room.findUnique({ where: { code } })) {
      code = generateRoomCode();
    }

    const dbRoom = await prisma.room.create({
      data: {
        code,
        gameId: params.gameId,
        hostUserId: params.host.id,
        settingsJson: settings as Prisma.InputJsonValue
      }
    });

    const room: RoomRuntime = {
      id: dbRoom.id,
      code,
      gameId: params.gameId,
      status: "lobby",
      hostUserId: params.host.id,
      settings,
      players: [
        {
          userId: params.host.id,
          username: params.host.username,
          displayName: params.host.displayName,
          avatarUrl: params.host.avatarUrl,
          seat: 0,
          ready: true,
          connected: true,
          temporaryHost: false,
          isBot: false,
          socketIds: new Set(params.socketId ? [params.socketId] : [])
        }
      ],
      chat: [],
      gameState: null,
      matchId: null,
      matchStartedAt: null,
      actionNumber: 0,
      createdAt: dbRoom.createdAt.toISOString(),
      processedActionIds: new Map(),
      queue: new ActionQueue()
    };

    this.addSystemMessage(room, `${params.host.displayName} created the room.`);
    this.roomsById.set(room.id, room);
    this.roomIdByCode.set(room.code, room.id);
    await this.saveSnapshot(room);
    return room;
  }

  async joinRoom(params: { user: AuthUser; code: string; socketId?: string }): Promise<RoomRuntime> {
    const room = this.getRoomByCode(params.code);
    if (!room) {
      throw new AppError(ERROR_CODES.ROOM_NOT_FOUND, "Room not found.");
    }

    const module = this.requireModule(room.gameId);

    if (room.status === "finished" || room.status === "abandoned") {
      throw new AppError(ERROR_CODES.GAME_ALREADY_STARTED, "This room has already ended.");
    }

    const existing = room.players.find((player) => player.userId === params.user.id);

    if (existing) {
      existing.connected = true;
      if (params.socketId) {
        existing.socketIds.add(params.socketId);
      }
      this.addSystemMessage(room, `${existing.displayName} rejoined the room.`);
      return room;
    }

    if (room.status !== "lobby") {
      throw new AppError(ERROR_CODES.GAME_ALREADY_STARTED, "This game has already started.");
    }

    if (room.players.length >= module.maxPlayers) {
      throw new AppError(ERROR_CODES.ROOM_FULL, "This room is full.");
    }

    const usedSeats = new Set(room.players.map((player) => player.seat));
    let seat = 0;
    while (usedSeats.has(seat)) {
      seat += 1;
    }

    room.players.push({
      userId: params.user.id,
      username: params.user.username,
      displayName: params.user.displayName,
      avatarUrl: params.user.avatarUrl,
      seat,
      ready: false,
      connected: true,
      temporaryHost: false,
      isBot: false,
      socketIds: new Set(params.socketId ? [params.socketId] : [])
    });

    this.addSystemMessage(room, `${params.user.displayName} joined.`);
    await this.saveSnapshot(room);
    return room;
  }

  attachSocket(user: AuthUser, socketId: string): RoomRuntime | null {
    const room = this.getRoomForUser(user.id);
    if (!room) {
      return null;
    }

    const player = room.players.find((item) => item.userId === user.id);
    if (!player) {
      return null;
    }

    const wasDisconnected = !player.connected;
    player.connected = true;
    player.socketIds.add(socketId);
    player.temporaryHost = false;

    if (wasDisconnected) {
      this.addSystemMessage(room, `${player.displayName} reconnected.`);
    }

    return room;
  }

  detachSocket(userId: string, socketId: string): RoomRuntime[] {
    const changedRooms: RoomRuntime[] = [];

    for (const room of this.roomsById.values()) {
      const player = room.players.find((item) => item.userId === userId);
      if (!player) {
        continue;
      }

      player.socketIds.delete(socketId);
      if (player.socketIds.size === 0 && player.connected) {
        player.connected = false;
        this.addSystemMessage(room, `${player.displayName} disconnected.`);
        changedRooms.push(room);
      }
    }

    return changedRooms;
  }

  setReady(roomId: string, userId: string, ready: boolean): RoomRuntime {
    const room = this.requireRoom(roomId);
    if (room.status !== "lobby") {
      throw new AppError(ERROR_CODES.GAME_ALREADY_STARTED, "Ready state can only change in the lobby.");
    }

    const player = this.requirePlayer(room, userId);
    player.ready = userId === room.hostUserId ? true : ready;
    return room;
  }

  async startRoom(roomId: string, userId: string): Promise<RoomRuntime> {
    const room = this.requireRoom(roomId);
    this.requireHost(room, userId);

    if (room.status !== "lobby") {
      throw new AppError(ERROR_CODES.GAME_ALREADY_STARTED, "Game already started.");
    }

    const module = this.requireModule(room.gameId);
    if (room.players.length < module.minPlayers) {
      throw new AppError(ERROR_CODES.INVALID_ACTION, `Need at least ${module.minPlayers} players.`);
    }

    if (room.players.some((player) => !player.ready)) {
      throw new AppError(ERROR_CODES.INVALID_ACTION, "All players must be ready.");
    }

    const now = new Date();
    const randomizedPlayers = room.players.slice();
    for (let index = randomizedPlayers.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      const current = randomizedPlayers[index];
      const swap = randomizedPlayers[swapIndex];
      if (current && swap) {
        randomizedPlayers[index] = swap;
        randomizedPlayers[swapIndex] = current;
      }
    }
    randomizedPlayers.forEach((player, seat) => {
      player.seat = seat;
    });

    const gamePlayers: GamePlayer[] = room.players
      .slice()
      .sort((left, right) => left.seat - right.seat)
      .map((player) => ({
        userId: player.userId,
        username: player.username,
        displayName: player.displayName,
        seat: player.seat
      }));

    room.gameState = module.createInitialState({
      players: gamePlayers,
      settings: room.settings,
      seed: `${room.id}:${now.toISOString()}`,
      now: now.toISOString()
    });

    if (room.gameId === "mafia-werewolf" && room.gameState && typeof room.gameState === "object") {
      const effectiveHostUserId = this.getEffectiveHostUserId(room);
      const werewolfState = room.gameState as {
        moderatorPlayerId?: string | null;
        players?: Array<{ userId: string }>;
      };

      if (effectiveHostUserId && werewolfState.players?.some((player) => player.userId === effectiveHostUserId)) {
        werewolfState.moderatorPlayerId = effectiveHostUserId;
      }
    }

    room.status = "in_game";
    room.actionNumber = 0;

    const match = await this.matchResults.createMatch({
      roomId: room.id,
      gameId: room.gameId,
      gameVersion: module.version,
      playerCount: room.players.length,
      startedAt: now
    });

    room.matchId = match.id;
    room.matchStartedAt = now.toISOString();
    this.addSystemMessage(room, "Game started.");

    await prisma.room.update({
      where: { id: room.id },
      data: { status: "in_game" }
    });
    await this.saveSnapshot(room);
    return room;
  }

  pauseRoom(roomId: string, userId: string, admin = false): RoomRuntime {
    const room = this.requireRoom(roomId);
    if (!admin) {
      this.requireHost(room, userId);
    }
    if (room.status !== "in_game") {
      throw new AppError(ERROR_CODES.INVALID_ACTION, "Only active games can be paused.");
    }
    room.status = "paused";
    this.addSystemMessage(room, "Host paused the game.");
    void prisma.room.update({ where: { id: room.id }, data: { status: "paused" } });
    return room;
  }

  resumeRoom(roomId: string, userId: string, admin = false): RoomRuntime {
    const room = this.requireRoom(roomId);
    if (!admin) {
      this.requireHost(room, userId);
    }
    if (room.status !== "paused") {
      throw new AppError(ERROR_CODES.INVALID_ACTION, "Room is not paused.");
    }
    room.status = "in_game";
    this.addSystemMessage(room, "Host resumed the game.");
    void prisma.room.update({ where: { id: room.id }, data: { status: "in_game" } });
    return room;
  }

  kickPlayer(roomId: string, hostUserId: string, targetUserId: string): RoomRuntime {
    const room = this.requireRoom(roomId);
    this.requireHost(room, hostUserId);
    if (room.status !== "lobby") {
      throw new AppError(ERROR_CODES.GAME_ALREADY_STARTED, "Players can only be kicked before the game starts.");
    }
    if (targetUserId === room.hostUserId) {
      throw new AppError(ERROR_CODES.INVALID_ACTION, "Transfer host before removing the host.");
    }

    const target = this.requirePlayer(room, targetUserId);
    room.players = room.players.filter((player) => player.userId !== targetUserId);
    this.addSystemMessage(room, `${target.displayName} was removed from the lobby.`);
    return room;
  }

  transferHost(roomId: string, hostUserId: string, targetUserId: string): RoomRuntime {
    const room = this.requireRoom(roomId);
    this.requireHost(room, hostUserId);
    this.requirePlayer(room, targetUserId);
    room.hostUserId = targetUserId;
    room.players.forEach((player) => {
      player.temporaryHost = false;
    });
    this.addSystemMessage(room, "Host controls were transferred.");
    void prisma.room.update({ where: { id: room.id }, data: { hostUserId: targetUserId } });
    return room;
  }

  async endRoom(roomId: string, userId: string, admin = false): Promise<RoomRuntime> {
    const room = this.requireRoom(roomId);
    if (!admin) {
      this.requireHost(room, userId);
    }
    room.status = "abandoned";
    this.addSystemMessage(room, "Room ended.");
    await prisma.room.update({
      where: { id: room.id },
      data: {
        status: "abandoned",
        endedAt: new Date()
      }
    });
    await this.saveSnapshot(room);
    return room;
  }

  async handleGameAction(params: {
    userId: string;
    envelope: GameActionEnvelope;
  }): Promise<{ room: RoomRuntime; events: unknown[] }> {
    const room = this.requireRoom(params.envelope.roomId);
    return room.queue.enqueue(async () => {
      if (room.status === "paused") {
        throw new AppError(ERROR_CODES.ROOM_PAUSED, "This room is paused.");
      }
      if (room.status !== "in_game") {
        throw new AppError(ERROR_CODES.INVALID_ACTION, "Game is not active.");
      }
      if (!room.gameState) {
        throw new AppError(ERROR_CODES.INVALID_ACTION, "Game state is not ready.");
      }

      const actionKey = roomActionKey(room.id, params.userId);
      const processed = room.processedActionIds.get(actionKey) ?? new Set<string>();
      if (processed.has(params.envelope.actionId)) {
        throw new AppError(ERROR_CODES.DUPLICATE_ACTION, "Duplicate action ignored.");
      }
      processed.add(params.envelope.actionId);
      room.processedActionIds.set(actionKey, processed);

      const module = this.requireModule(room.gameId);
      const actionInput =
        typeof params.envelope.payload === "object" && params.envelope.payload !== null
          ? { type: params.envelope.type, ...params.envelope.payload }
          : { type: params.envelope.type };
      const parsedAction = module.actionSchema.safeParse(actionInput);
      if (!parsedAction.success) {
        throw new AppError(ERROR_CODES.INVALID_PAYLOAD, "Invalid game action payload.", parsedAction.error.flatten());
      }

      const isWerewolfHostAdvance =
        room.gameId === "mafia-werewolf" &&
        typeof parsedAction.data === "object" &&
        parsedAction.data !== null &&
        (parsedAction.data as { type?: unknown }).type === "advance_phase" &&
        this.getEffectiveHostUserId(room) === params.userId;

      const werewolfModeratorPlayerId =
        isWerewolfHostAdvance && room.gameState && typeof room.gameState === "object"
          ? (room.gameState as { moderatorPlayerId?: string | null }).moderatorPlayerId
          : null;

      const actionPlayerId = isWerewolfHostAdvance ? werewolfModeratorPlayerId ?? params.userId : params.userId;

      const validation = module.validateAction({
        state: room.gameState,
        playerId: actionPlayerId,
        action: parsedAction.data
      });
      if (!validation.ok) {
        throw new AppError(ERROR_CODES.ILLEGAL_ACTION, validation.message, validation);
      }

      const now = new Date().toISOString();
      const result = module.applyAction({
        state: room.gameState,
        playerId: actionPlayerId,
        action: parsedAction.data,
        now
      });

      room.gameState = result.state;
      room.actionNumber = this.extractActionNumber(room.gameState, room.actionNumber + 1);
      this.addGameEventLogMessages(room, result.events);

      void this.saveSnapshot(room);
      if (module.isGameOver(room.gameState) && room.matchId && room.matchStartedAt) {
        room.status = "finished";
        this.addSystemMessage(room, "Game ended.");
        void this.matchResults.finalizeMatch({
          matchId: room.matchId,
          roomId: room.id,
          gameId: room.gameId,
          results: module.getResults(room.gameState),
          startedAt: new Date(room.matchStartedAt),
          endedAt: new Date()
        });
      }

      return { room, events: result.events };
    });
  }

  async applyTimeout(roomId: string, reason: TimeoutReason = "turn_timer"): Promise<{ room: RoomRuntime; events: unknown[] } | null> {
    const room = this.getRoom(roomId);
    if (!room || room.status !== "in_game" || !room.gameState) {
      return null;
    }

    const module = this.requireModule(room.gameId);

    const applyModuleTimeout = module.applyTimeout;
    if (applyModuleTimeout) {
      return room.queue.enqueue(async () => {
        if (room.status !== "in_game" || !room.gameState) {
          return null;
        }

        const turnInfo = module.getTurnInfo(room.gameState);
        if (!turnInfo.currentPlayerId) {
          return null;
        }

        const now = new Date().toISOString();
        const result = applyModuleTimeout({
          state: room.gameState,
          playerId: turnInfo.currentPlayerId,
          reason,
          now
        });

        if (!result) {
          return null;
        }

        room.gameState = result.state;
        room.actionNumber = this.extractActionNumber(room.gameState, room.actionNumber + 1);
        this.addGameEventLogMessages(room, result.events);

        void this.saveSnapshot(room);
        if (module.isGameOver(room.gameState) && room.matchId && room.matchStartedAt) {
          room.status = "finished";
          this.addSystemMessage(room, "Game ended.");
          void this.matchResults.finalizeMatch({
            matchId: room.matchId,
            roomId: room.id,
            gameId: room.gameId,
            results: module.getResults(room.gameState),
            startedAt: new Date(room.matchStartedAt),
            endedAt: new Date()
          });
        }

        return { room, events: result.events };
      });
    }

    const turnInfo = module.getTurnInfo(room.gameState);
    if (!turnInfo.currentPlayerId) {
      return null;
    }

    const timeoutAction = module.getTimeoutAction({
      state: room.gameState,
      playerId: turnInfo.currentPlayerId,
      reason
    });

    if (!timeoutAction) {
      return null;
    }

    const result = await this.handleGameAction({
      userId: timeoutAction.playerId,
      envelope: {
        actionId: `timeout:${reason}:${room.actionNumber + 1}`,
        roomId,
        type: (timeoutAction.action as { type: string }).type,
        payload: timeoutAction.action,
        clientCreatedAt: new Date().toISOString()
      }
    });

    return result;
  }

  async applyUnoDebugScenario(params: {
    roomId: string;
    user: AuthUser;
    scenario: string;
    targetPlayerId?: string | undefined;
  }): Promise<{ room: RoomRuntime; events: unknown[] }> {
    const room = this.requireRoom(params.roomId);
    if (params.user.role !== "ADMIN") {
      this.requireHost(room, params.user.id);
    }
    if (room.status !== "in_game" && room.status !== "paused") {
      throw new AppError(ERROR_CODES.INVALID_ACTION, "Debug scenarios need an active or paused game.");
    }
    if (!room.gameState) {
      throw new AppError(ERROR_CODES.INVALID_ACTION, "Game state is not ready.");
    }

    return room.queue.enqueue(async () => {
      const now = new Date().toISOString();
      const result = room.gameId === "classic-uno"
        ? applyClassicUnoDebugScenario({
            state: room.gameState as ClassicUnoState,
            scenario: params.scenario,
            requesterId: params.user.id,
            targetPlayerId: params.targetPlayerId,
            now
          })
        : room.gameId === "uno-no-mercy"
          ? applyNoMercyDebugScenario({
              state: room.gameState as NoMercyState,
              scenario: params.scenario,
              requesterId: params.user.id,
              targetPlayerId: params.targetPlayerId,
              now
            })
          : null;

      if (!result) {
        throw new AppError(ERROR_CODES.INVALID_ACTION, "Debug scenarios are only available for UNO games.");
      }

      room.gameState = result.state;
      room.actionNumber = this.extractActionNumber(room.gameState, room.actionNumber + 1);
      this.addSystemMessage(room, `Debug scenario applied: ${params.scenario}.`);
      void this.saveSnapshot(room);
      return { room, events: result.events };
    });
  }
  addBot(roomId: string, userId: string): RoomRuntime {
    const room = this.requireRoom(roomId);
    this.requireHost(room, userId);
    this.appendBotPlayer(room);
    void this.saveSnapshot(room);
    return room;
  }

  fillBots(roomId: string, userId: string, targetPlayerCount = BOT_TARGET_PLAYER_COUNT): RoomRuntime {
    const room = this.requireRoom(roomId);
    this.requireHost(room, userId);
    if (room.status !== "lobby") {
      throw new AppError(ERROR_CODES.GAME_ALREADY_STARTED, "Bots can only be changed before the game starts.");
    }

    const module = this.requireModule(room.gameId);
    const target = Math.min(targetPlayerCount, module.maxPlayers);
    const before = room.players.length;
    while (room.players.length < target) {
      this.appendBotPlayer(room, false);
    }

    const added = room.players.length - before;
    if (added > 0) {
      this.addSystemMessage(room, `Filled the table with ${added} bot${added === 1 ? "" : "s"}.`);
      void this.saveSnapshot(room);
    }
    return room;
  }

  removeBots(roomId: string, userId: string): RoomRuntime {
    const room = this.requireRoom(roomId);
    this.requireHost(room, userId);
    if (room.status !== "lobby") {
      throw new AppError(ERROR_CODES.GAME_ALREADY_STARTED, "Bots can only be removed before the game starts.");
    }

    const removed = room.players.filter((player) => player.isBot).length;
    if (removed === 0) {
      return room;
    }

    room.players = room.players.filter((player) => !player.isBot);
    this.addSystemMessage(room, `Removed ${removed} bot${removed === 1 ? "" : "s"} from the lobby.`);
    void this.saveSnapshot(room);
    return room;
  }

  getCurrentTurnPlayerId(room: RoomRuntime): string | null {
    if (!room.gameState) {
      return null;
    }
    return this.requireModule(room.gameId).getTurnInfo(room.gameState).currentPlayerId ?? null;
  }

  getCurrentTurnPresence(roomId: string): { userId: string; displayName: string; connected: boolean; isBot: boolean } | null {
    const room = this.getRoom(roomId);
    if (!room || !room.gameState) {
      return null;
    }

    const currentPlayerId = this.getCurrentTurnPlayerId(room);
    if (!currentPlayerId) {
      return null;
    }

    const player = room.players.find((item) => item.userId === currentPlayerId);
    return player
      ? {
          userId: player.userId,
          displayName: player.displayName,
          connected: player.connected,
          isBot: Boolean(player.isBot)
        }
      : null;
  }

  getLegalActionsFor(room: RoomRuntime, userId: string): unknown[] {
    if (!room.gameState) {
      return [];
    }

    const actions = this.requireModule(room.gameId).getLegalActions({ state: room.gameState, playerId: userId });

    if (
      room.gameId === "mafia-werewolf" &&
      this.getEffectiveHostUserId(room) === userId &&
      room.gameState &&
      typeof room.gameState === "object" &&
      (room.gameState as { phase?: string }).phase !== "finished" &&
      !actions.some((action) => typeof action === "object" && action !== null && (action as { type?: unknown }).type === "advance_phase")
    ) {
      return [...actions, { type: "advance_phase" }];
    }

    return actions;
  }

  isBotPlayer(room: RoomRuntime, userId: string | null | undefined): boolean {
    if (!userId) {
      return false;
    }
    return Boolean(room.players.find((player) => player.userId === userId)?.isBot);
  }

  private appendBotPlayer(room: RoomRuntime, announce = true): void {
    if (room.status !== "lobby") {
      throw new AppError(ERROR_CODES.GAME_ALREADY_STARTED, "Bots can only be changed before the game starts.");
    }

    const module = this.requireModule(room.gameId);
    if (room.players.length >= module.maxPlayers) {
      throw new AppError(ERROR_CODES.ROOM_FULL, "This room is full.");
    }

    const botNumber = room.players.filter((player) => player.isBot).length + 1;
    const displayName = `Bot ${botNumber}`;
    room.players.push({
      userId: `${BOT_USER_PREFIX}${room.id}:${botNumber}:${nanoid(5)}`,
      username: `bot_${botNumber}`,
      displayName,
      avatarUrl: null,
      seat: this.nextOpenSeat(room),
      ready: true,
      connected: true,
      temporaryHost: false,
      isBot: true,
      socketIds: new Set<string>()
    });

    if (announce) {
      this.addSystemMessage(room, `${displayName} joined as a bot.`);
    }
  }

  private nextOpenSeat(room: RoomRuntime): number {
    const usedSeats = new Set(room.players.map((player) => player.seat));
    let seat = 0;
    while (usedSeats.has(seat)) {
      seat += 1;
    }
    return seat;
  }

  async forceSnapshot(roomId: string, userId: string, admin = false): Promise<void> {
    const room = this.requireRoom(roomId);
    if (!admin) {
      this.requireHost(room, userId);
    }
    await this.saveSnapshot(room);
  }

  addChatMessage(roomId: string, user: AuthUser, body: string): ChatMessageView {
    const room = this.requireRoom(roomId);
    this.requirePlayer(room, user.id);
    const limiter = body.startsWith(REACTION_PREFIX) ? this.reactionRateLimiter : this.chatRateLimiter;
    if (!limiter.allow(`${room.id}:${user.id}`)) {
      throw new AppError(ERROR_CODES.RATE_LIMITED, "Slow down a little.");
    }
    const message = this.pushChat(room, {
      id: nanoid(),
      roomId: room.id,
      userId: user.id,
      displayName: user.displayName,
      type: "user",
      body,
      createdAt: new Date().toISOString()
    });
    return message;
  }

  getRoomStateView(room: RoomRuntime): RoomStateView {
    const effectiveHostUserId = this.getEffectiveHostUserId(room);
    return {
      id: room.id,
      code: room.code,
      gameId: room.gameId,
      status: room.status,
      hostUserId: room.hostUserId,
      effectiveHostUserId,
      settings: room.settings,
      players: room.players
        .slice()
        .sort((left, right) => left.seat - right.seat)
        .map((player) => ({
          userId: player.userId,
          username: player.username,
          displayName: player.displayName,
          avatarUrl: player.avatarUrl,
          seat: player.seat,
          ready: player.ready,
          connected: player.connected,
          isHost: player.userId === room.hostUserId,
          temporaryHost: player.userId === effectiveHostUserId && player.userId !== room.hostUserId,
          isBot: Boolean(player.isBot)
        })),
      chat: room.chat.slice(-80),
      createdAt: room.createdAt,
      actionNumber: room.actionNumber
    };
  }

  getPrivateGamePayload(room: RoomRuntime, userId: string): { state: unknown; legalActions: unknown[] } | null {
    if (!room.gameState) {
      return null;
    }

    const module = this.requireModule(room.gameId);
    return {
      state: module.getPublicState({ state: room.gameState, viewerId: userId }),
      legalActions: module.getLegalActions({ state: room.gameState, playerId: userId })
    };
  }

  async getTimerView(roomId: string): Promise<TimerView | null> {
    const room = this.getRoom(roomId);
    if (!room || !room.gameState) {
      return null;
    }

    const module = this.requireModule(room.gameId);
    const turnInfo = module.getTurnInfo(room.gameState);
    if (!turnInfo.currentPlayerId || !turnInfo.turnStartedAt || !turnInfo.turnSeconds || room.status !== "in_game") {
      return {
        roomId,
        running: false,
        currentPlayerId: turnInfo.currentPlayerId,
        remainingMs: null,
        deadlineAt: null
      };
    }

    const deadline = new Date(new Date(turnInfo.turnStartedAt).getTime() + turnInfo.turnSeconds * 1000);
    return {
      roomId,
      running: true,
      currentPlayerId: turnInfo.currentPlayerId,
      remainingMs: Math.max(0, deadline.getTime() - Date.now()),
      deadlineAt: deadline.toISOString()
    };
  }

  async restoreActiveRooms(): Promise<number> {
    const dbRooms = await prisma.room.findMany({
      where: {
        status: {
          in: ["lobby", "in_game", "paused"]
        }
      },
      include: {
        snapshots: {
          orderBy: [{ actionNumber: "desc" }, { createdAt: "desc" }],
          take: 1
        }
      }
    });

    let restored = 0;
    for (const dbRoom of dbRooms) {
      const snapshot = dbRoom.snapshots[0];
      if (!snapshot?.roomStateJson) {
        continue;
      }

      const serializable = snapshot.roomStateJson as unknown as SerializableRoomState;
      const gameId = assertGameId(serializable.gameId);
      const restoredGameState = this.restoreGameState(serializable, snapshot.stateJson);
      if ((serializable.status === "in_game" || serializable.status === "paused") && !restoredGameState) {
        console.warn(`Skipping room ${dbRoom.code}: latest snapshot does not contain valid game state.`);
        continue;
      }

      const room: RoomRuntime = {
        id: dbRoom.id,
        code: dbRoom.code,
        gameId,
        status: serializable.status,
        hostUserId: serializable.hostUserId,
        settings: serializable.settings,
        players: serializable.players.map((player) => ({
          ...player,
          connected: Boolean(player.isBot),
          ready: player.isBot ? true : player.ready,
          temporaryHost: false,
          isBot: Boolean(player.isBot),
          socketIds: new Set<string>()
        })),
        chat: serializable.chat,
        gameState: restoredGameState,
        matchId: serializable.matchId,
        matchStartedAt: serializable.matchStartedAt,
        actionNumber: serializable.actionNumber,
        createdAt: serializable.createdAt,
        processedActionIds: new Map(),
        queue: new ActionQueue()
      };
      this.addSystemMessage(room, "Snapshot restored. Waiting for players to reconnect.");
      this.roomsById.set(room.id, room);
      this.roomIdByCode.set(room.code, room.id);
      restored += 1;
    }

    return restored;
  }

  private requireModule(gameId: GameId): AnyGameModule {
    const module = this.registry.get(gameId);
    if (!module) {
      throw new AppError(ERROR_CODES.INVALID_PAYLOAD, "Unsupported game.");
    }
    return module;
  }

  private restoreGameState(serializable: SerializableRoomState, stateJson: unknown): unknown | null {
    if (serializable.status === "lobby") {
      return null;
    }

    if (serializable.gameId === "classic-uno") {
      return isObjectRecord(stateJson) && Array.isArray(stateJson.players) ? stateJson : null;
    }

    return isObjectRecord(stateJson) ? stateJson : null;
  }

  private requireRoom(roomId: string): RoomRuntime {
    const room = this.getRoom(roomId);
    if (!room) {
      throw new AppError(ERROR_CODES.ROOM_NOT_FOUND, "Room not found.");
    }
    return room;
  }

  private requirePlayer(room: RoomRuntime, userId: string) {
    const player = room.players.find((item) => item.userId === userId);
    if (!player) {
      throw new AppError(ERROR_CODES.PLAYER_NOT_IN_ROOM, "You are not in this room.");
    }
    return player;
  }

  private requireHost(room: RoomRuntime, userId: string): void {
    const effectiveHost = this.getEffectiveHostUserId(room);
    if (effectiveHost !== userId) {
      throw new AppError(ERROR_CODES.NOT_HOST, "Host controls required.");
    }
  }

  private getEffectiveHostUserId(room: RoomRuntime): string | null {
    const originalHost = room.players.find((player) => player.userId === room.hostUserId);
    if (originalHost?.connected) {
      return room.hostUserId;
    }
    return room.players
      .slice()
      .sort((left, right) => left.seat - right.seat)
      .find((player) => player.connected && !player.isBot)?.userId ?? null;
  }

  private addGameEventLogMessages(room: RoomRuntime, events: unknown[]): void {
    for (const event of events) {
      if (!isObjectRecord(event) || typeof event.type !== "string") {
        continue;
      }

      if (!event.type.endsWith(":draw") && !event.type.endsWith(":penalty-draw")) {
        continue;
      }

      const payload = isObjectRecord(event.payload) ? event.payload : {};
      const playerId = typeof payload.playerId === "string" ? payload.playerId : null;
      const countValue = typeof payload.count === "number" ? payload.count : typeof payload.amount === "number" ? payload.amount : null;
      const playerName = room.players.find((player) => player.userId === playerId)?.displayName ?? "A player";
      const countLabel = countValue ?? "some";
      this.addSystemMessage(room, `${playerName} drew ${countLabel} card${countValue === 1 ? "" : "s"}.`);
    }
  }
  private addSystemMessage(room: RoomRuntime, body: string): void {
    this.pushChat(room, {
      id: nanoid(),
      roomId: room.id,
      userId: null,
      displayName: "System",
      type: "system",
      body,
      createdAt: new Date().toISOString()
    });
  }

  private pushChat(room: RoomRuntime, message: RoomChatMessage): ChatMessageView {
    room.chat.push(message);
    if (room.chat.length > 120) {
      room.chat = room.chat.slice(-120);
    }
    return message;
  }

  private async saveSnapshot(room: RoomRuntime): Promise<void> {
    try {
      await this.snapshots.saveLatest({
        roomId: room.id,
        gameId: room.gameId,
        stateJson: room.gameState ?? null,
        roomStateJson: serializeRoomRuntime(room),
        actionNumber: room.actionNumber
      });
    } catch (error) {
      // Extra guard around snapshot serialization/persistence. Realtime room state
      // already committed in memory, so recovery persistence should never crash play.
      const message = error instanceof Error ? error.message : "Unknown snapshot failure.";
      console.warn(`[snapshot] unexpected failure room=${room.code} action=${room.actionNumber}: ${message.slice(0, 500)}`);
    }
  }

  private extractActionNumber(state: unknown, fallback: number): number {
    if (typeof state === "object" && state !== null && "actionNumber" in state) {
      const actionNumber = (state as { actionNumber?: unknown }).actionNumber;
      return typeof actionNumber === "number" ? actionNumber : fallback;
    }
    return fallback;
  }
}


