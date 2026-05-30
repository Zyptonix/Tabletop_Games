"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function JoinRoomPanel() {
  const router = useRouter();
  const [code, setCode] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (code.trim()) {
      router.push(`/rooms/${code.trim().toUpperCase()}`);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Join Room</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={submit}>
          <Input value={code} onChange={(event) => setCode(event.target.value)} placeholder="Room code" />
          <Button type="submit" variant="secondary" className="w-full">
            <LogIn className="h-4 w-4" />
            Join
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
