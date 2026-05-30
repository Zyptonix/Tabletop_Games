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

export function CreateRoomPanel() {
  const router = useRouter();
  const [games, setGames] = useState<GameSummary[]>([]);
  const [gameId, setGameId] = useState("classic-uno");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void api.games().then((result) => {
      setGames(result.games);
      setGameId(result.games[0]?.id ?? "classic-uno");
    });
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const result = await api.createRoom({ gameId, settings: {} });
    const room = result.room as RoomResponse;
    if (room.code) {
      router.push(`/rooms/${room.code}`);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Room</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={submit}>
          <label className="block text-sm font-semibold text-zinc-700" htmlFor="game">
            Game
          </label>
          <select
            id="game"
            value={gameId}
            onChange={(event) => setGameId(event.target.value)}
            className="min-h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold"
          >
            {games.map((game) => (
              <option key={game.id} value={game.id}>
                {game.displayName} ({game.minPlayers}-{game.maxPlayers})
              </option>
            ))}
          </select>
          <Button type="submit" className="w-full" disabled={loading}>
            <Plus className="h-4 w-4" />
            Create
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
