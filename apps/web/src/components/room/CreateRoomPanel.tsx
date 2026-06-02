"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { api } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface GameSummary {
  id: string;
  displayName: string;
  minPlayers: number;
  maxPlayers: number;
}

interface RoomResponse {
  code?: string;
}

const optionalWerewolfRoles = [
  { id: "jester", label: "Jester", min: 7 },
  { id: "vigilante", label: "Vigilante", min: 8 },
  { id: "bodyguard", label: "Bodyguard", min: 7 },
  { id: "mayor", label: "Mayor", min: 8 },
  { id: "witch", label: "Witch", min: 10 },
  { id: "serial_killer", label: "Serial Killer", min: 9 }
];

export function CreateRoomPanel() {
  const router = useRouter();
  const [games, setGames] = useState<GameSummary[]>([]);
  const [gameId, setGameId] = useState("classic-uno");
  const [loading, setLoading] = useState(false);
  const [enabledOptionalRoles, setEnabledOptionalRoles] = useState<string[]>([]);
  const [roleRevealSeconds, setRoleRevealSeconds] = useState(12);
  const [nightSeconds, setNightSeconds] = useState(45);
  const [dayDiscussionSeconds, setDayDiscussionSeconds] = useState(120);
  const [votingSeconds, setVotingSeconds] = useState(45);
  const [revealRoleOnDeath, setRevealRoleOnDeath] = useState(true);

  useEffect(() => {
    void api.games().then((result) => {
      setGames(result.games);
      setGameId(result.games[0]?.id ?? "classic-uno");
    });
  }, []);

  function toggleRole(roleId: string) {
    setEnabledOptionalRoles((current) => current.includes(roleId) ? current.filter((item) => item !== roleId) : [...current, roleId]);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    const settings =
      gameId === "mafia-werewolf"
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
        : {};

    const result = await api.createRoom({ gameId, settings });
    const room = result.room as RoomResponse;
    if (room.code) router.push(`/rooms/${room.code}`);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Room</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={submit}>
          <label className="block text-sm font-semibold text-zinc-700" htmlFor="game">Game</label>
          <select id="game" value={gameId} onChange={(event) => setGameId(event.target.value)} className="min-h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold">
            {games.map((game) => (
              <option key={game.id} value={game.id}>{game.displayName} ({game.minPlayers}-{game.maxPlayers})</option>
            ))}
          </select>

          {gameId === "mafia-werewolf" ? (
            <div className="space-y-4 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">Werewolf phase timers</p>
                <p className="mt-1 text-xs font-semibold text-zinc-500">The host can tune game speed before creating the room.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs font-bold text-zinc-600">Role reveal seconds<input type="number" min={3} max={60} value={roleRevealSeconds} onChange={(event) => setRoleRevealSeconds(Number(event.target.value))} className="mt-1 min-h-10 w-full rounded-md border border-zinc-300 bg-white px-2" /></label>
                <label className="text-xs font-bold text-zinc-600">Night seconds<input type="number" min={8} max={300} value={nightSeconds} onChange={(event) => setNightSeconds(Number(event.target.value))} className="mt-1 min-h-10 w-full rounded-md border border-zinc-300 bg-white px-2" /></label>
                <label className="text-xs font-bold text-zinc-600">Discussion seconds<input type="number" min={5} max={600} value={dayDiscussionSeconds} onChange={(event) => setDayDiscussionSeconds(Number(event.target.value))} className="mt-1 min-h-10 w-full rounded-md border border-zinc-300 bg-white px-2" /></label>
                <label className="text-xs font-bold text-zinc-600">Voting seconds<input type="number" min={5} max={300} value={votingSeconds} onChange={(event) => setVotingSeconds(Number(event.target.value))} className="mt-1 min-h-10 w-full rounded-md border border-zinc-300 bg-white px-2" /></label>
              </div>

              <label className="flex items-center gap-2 text-sm font-semibold text-zinc-700">
                <input type="checkbox" checked={revealRoleOnDeath} onChange={(event) => setRevealRoleOnDeath(event.target.checked)} />
                Reveal roles on death and at game end
              </label>

              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">Optional roles</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {optionalWerewolfRoles.map((role) => (
                    <label key={role.id} className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-2 py-2 text-xs font-bold text-zinc-700">
                      <input type="checkbox" checked={enabledOptionalRoles.includes(role.id)} onChange={() => toggleRole(role.id)} />
                      {role.label}
                      <span className="ml-auto text-[0.6rem] text-zinc-400">{role.min}+</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          <Button type="submit" className="w-full" disabled={loading}>
            <Plus className="h-4 w-4" />
            Create
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
