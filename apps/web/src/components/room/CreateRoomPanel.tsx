"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Plus, Users } from "lucide-react";
import { api } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getGameVisualMeta } from "@/config/game-thumbnails.config";

interface GameSummary {
  id: string;
  displayName: string;
  minPlayers: number;
  maxPlayers: number;
}

interface RoomResponse {
  code?: string;
}

interface CreateRoomPanelProps {
  /** Preselect a game when this form was opened from a game card. */
  initialGameId?: string | undefined;
  /** When true, only show the preselected game, not the game picker. */
  hideGameSelect?: boolean | undefined;
  /** Restrict the picker to these game IDs. Unknown IDs are ignored by the API catalogue. */
  allowedGameIds?: string[] | undefined;
}

const optionalWerewolfRoles = [
  { id: "jester", label: "Jester", min: 7 },
  { id: "vigilante", label: "Vigilante", min: 8 },
  { id: "bodyguard", label: "Bodyguard", min: 7 },
  { id: "mayor", label: "Mayor", min: 8 },
  { id: "witch", label: "Witch", min: 10 },
  { id: "serial_killer", label: "Serial Killer", min: 9 }
];

export function CreateRoomPanel({ initialGameId, hideGameSelect = false, allowedGameIds }: CreateRoomPanelProps) {
  const router = useRouter();
  const [games, setGames] = useState<GameSummary[]>([]);
  const [gameId, setGameId] = useState(initialGameId ?? "");
  const [loadingGames, setLoadingGames] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enabledOptionalRoles, setEnabledOptionalRoles] = useState<string[]>([]);
  const [roleRevealSeconds, setRoleRevealSeconds] = useState(12);
  const [nightSeconds, setNightSeconds] = useState(45);
  const [dayDiscussionSeconds, setDayDiscussionSeconds] = useState(120);
  const [votingSeconds, setVotingSeconds] = useState(45);
  const [revealRoleOnDeath, setRevealRoleOnDeath] = useState(true);
  const [chessClockSeconds, setChessClockSeconds] = useState(300);
  const [barricadesTurnSeconds, setBarricadesTurnSeconds] = useState(45);

  const allowedGameKey = useMemo(() => allowedGameIds ? [...allowedGameIds].sort().join("|") : "*", [allowedGameIds]);

  useEffect(() => {
    let cancelled = false;
    setLoadingGames(true);
    setError(null);
    void api.games().then((result) => {
      if (cancelled) return;
      const allowed = allowedGameKey === "*" ? null : new Set(allowedGameKey ? allowedGameKey.split("|") : []);
      const availableGames = allowed ? result.games.filter((game) => allowed.has(game.id)) : result.games;
      setGames(availableGames);
      setGameId((current) => {
        if (initialGameId && availableGames.some((game) => game.id === initialGameId)) return initialGameId;
        if (current && availableGames.some((game) => game.id === current)) return current;
        return availableGames[0]?.id ?? "";
      });
    }).catch((loadError) => {
      if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Could not load available games.");
    }).finally(() => {
      if (!cancelled) setLoadingGames(false);
    });
    return () => { cancelled = true; };
  }, [allowedGameKey, initialGameId]);

  function toggleRole(roleId: string) {
    setEnabledOptionalRoles((current) => current.includes(roleId) ? current.filter((item) => item !== roleId) : [...current, roleId]);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!gameId || loading) return;
    setLoading(true);
    setError(null);

    const settings = gameId === "mafia-werewolf"
      ? {
          revealRoleOnDeath,
          roleRevealSeconds,
          nightSeconds,
          nightResultSeconds: 8,
          dayDiscussionSeconds,
          votingSeconds,
          voteResultSeconds: 8,
          enabledOptionalRoles
        }
      : gameId === "chess"
        ? { clockSeconds: chessClockSeconds }
        : gameId === "barricades"
          ? { turnSeconds: barricadesTurnSeconds }
          : {};

    try {
      const result = await api.createRoom({ gameId, settings });
      const room = result.room as RoomResponse;
      if (room.code) router.push(`/rooms/${room.code}`);
      else setError("The room was created, but the server did not return a room code.");
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Could not create the room.");
    } finally {
      setLoading(false);
    }
  }

  const noGamesAvailable = !loadingGames && games.length === 0;

  return (
    <Card className="text-white shadow-none">
      <CardHeader className="border-white/10 px-0 pt-0">
        <CardTitle className="text-sm font-bold text-white">Room setup</CardTitle>
        <p className="mt-1 text-xs leading-5 text-slate-400">Choose a game and create a private room for your group.</p>
      </CardHeader>
      <CardContent className="px-0 pb-0 pt-4">
        <form className="space-y-4" onSubmit={submit}>
          {gameId ? (
            <div className="relative overflow-hidden rounded-xl border border-white/10 bg-[#091214] shadow-md">
              <div className="relative aspect-[21/9] w-full overflow-hidden bg-black/40">
                <img
                  src={getGameVisualMeta(gameId).thumbnailUrl}
                  alt={getGameVisualMeta(gameId).displayName}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#091214] via-[#091214]/60 to-transparent" />
                <div className="absolute inset-x-3 bottom-2.5 flex items-center justify-between">
                  <div>
                    <span className="inline-block rounded bg-black/60 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-emerald-300">
                      {getGameVisualMeta(gameId).categoryLabel}
                    </span>
                    <p className="mt-1 text-base font-black text-white">
                      {getGameVisualMeta(gameId).displayName}
                    </p>
                  </div>
                  {games.find((g) => g.id === gameId) ? (
                    <span className="inline-flex items-center gap-1 rounded bg-black/60 px-2 py-1 text-xs font-semibold text-slate-300">
                      <Users className="h-3.5 w-3.5 text-slate-400" />
                      {games.find((g) => g.id === gameId)?.minPlayers}–{games.find((g) => g.id === gameId)?.maxPlayers}p
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="p-3">
                <p className="text-xs leading-relaxed text-slate-400">
                  {getGameVisualMeta(gameId).tagline}
                </p>
              </div>
            </div>
          ) : null}

          {!hideGameSelect ? (
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-200" htmlFor="create-room-game">Game</label>
              <select id="create-room-game" value={gameId} onChange={(event) => setGameId(event.target.value)} disabled={loadingGames || noGamesAvailable} className="min-h-11 w-full rounded-lg border border-white/15 bg-[#08110f] px-3 text-sm font-semibold text-white outline-none focus:border-emerald-400">
                {games.map((game) => <option key={game.id} value={game.id}>{game.displayName} ({game.minPlayers}–{game.maxPlayers})</option>)}
              </select>
            </div>
          ) : null}

          {noGamesAvailable ? <p className="rounded-lg border border-amber-200/15 bg-amber-100/[0.05] p-3 text-sm text-amber-100">No playable games are available for this selection. Check the game registry and game-status configuration.</p> : null}

          {gameId === "chess" ? (
            <div className="space-y-2 rounded-xl border border-indigo-200/15 bg-indigo-200/[0.04] p-3">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-200">Chess clock</p>
              <p className="text-xs text-slate-400">Each player gets their own clock. It runs during their move and switches automatically after a legal move.</p>
              <label className="block text-xs font-bold text-slate-300" htmlFor="chess-clock-seconds">Time per player</label>
              <select id="chess-clock-seconds" value={chessClockSeconds} onChange={(event) => setChessClockSeconds(Number(event.target.value))} className="min-h-10 w-full rounded-md border border-white/15 bg-[#08110f] px-3 text-sm font-semibold text-white">
                <option value={60}>1 minute</option><option value={180}>3 minutes</option><option value={300}>5 minutes</option><option value={600}>10 minutes</option><option value={900}>15 minutes</option><option value={1800}>30 minutes</option><option value={3600}>60 minutes</option><option value={0}>Unlimited</option>
              </select>
            </div>
          ) : gameId === "barricades" ? (
            <div className="space-y-2 rounded-xl border border-orange-200/15 bg-orange-200/[0.04] p-3">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-200">Turn timer</p>
              <p className="text-xs text-slate-400">The active player's countdown starts automatically and resets when the turn changes. If time expires, the turn is skipped.</p>
              <label className="block text-xs font-bold text-slate-300" htmlFor="barricades-turn-seconds">Time per turn</label>
              <select id="barricades-turn-seconds" value={barricadesTurnSeconds} onChange={(event) => setBarricadesTurnSeconds(Number(event.target.value))} className="min-h-10 w-full rounded-md border border-white/15 bg-[#08110f] px-3 text-sm font-semibold text-white">
                <option value={15}>15 seconds</option><option value={30}>30 seconds</option><option value={45}>45 seconds</option><option value={60}>1 minute</option><option value={90}>90 seconds</option><option value={120}>2 minutes</option><option value={0}>Unlimited</option>
              </select>
            </div>
          ) : null}

          {gameId === "mafia-werewolf" ? (
            <div className="space-y-4 rounded-xl border border-white/10 bg-white/[0.025] p-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-300">Werewolf phase timers</p>
                <p className="mt-1 text-xs text-slate-400">Tune the game speed before creating the room.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs font-bold text-slate-300">Role reveal seconds<input type="number" min={3} max={60} value={roleRevealSeconds} onChange={(event) => setRoleRevealSeconds(Number(event.target.value))} className="mt-1 min-h-10 w-full rounded-md border border-white/15 bg-[#08110f] px-2 text-white" /></label>
                <label className="text-xs font-bold text-slate-300">Night seconds<input type="number" min={8} max={300} value={nightSeconds} onChange={(event) => setNightSeconds(Number(event.target.value))} className="mt-1 min-h-10 w-full rounded-md border border-white/15 bg-[#08110f] px-2 text-white" /></label>
                <label className="text-xs font-bold text-slate-300">Discussion seconds<input type="number" min={5} max={600} value={dayDiscussionSeconds} onChange={(event) => setDayDiscussionSeconds(Number(event.target.value))} className="mt-1 min-h-10 w-full rounded-md border border-white/15 bg-[#08110f] px-2 text-white" /></label>
                <label className="text-xs font-bold text-slate-300">Voting seconds<input type="number" min={5} max={300} value={votingSeconds} onChange={(event) => setVotingSeconds(Number(event.target.value))} className="mt-1 min-h-10 w-full rounded-md border border-white/15 bg-[#08110f] px-2 text-white" /></label>
              </div>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-200"><input type="checkbox" checked={revealRoleOnDeath} onChange={(event) => setRevealRoleOnDeath(event.target.checked)} />Reveal roles on death and at game end</label>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-300">Optional roles</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {optionalWerewolfRoles.map((role) => (
                    <label key={role.id} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.025] px-2 py-2 text-xs font-bold text-slate-200">
                      <input type="checkbox" checked={enabledOptionalRoles.includes(role.id)} onChange={() => toggleRole(role.id)} />
                      {role.label}<span className="ml-auto text-[0.6rem] text-slate-500">{role.min}+</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {error ? <p role="alert" className="flex items-start gap-2 rounded-lg border border-rose-300/15 bg-rose-950/35 p-3 text-sm text-rose-200"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</p> : null}

          <Button type="submit" className="w-full" disabled={loading || loadingGames || !gameId || noGamesAvailable}>
            <Plus className="h-4 w-4" />
            {loading ? "Creating room…" : "Create room"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function selectedGameLabel(games: GameSummary[], gameId: string): string | undefined {
  return games.find((game) => game.id === gameId)?.displayName;
}
