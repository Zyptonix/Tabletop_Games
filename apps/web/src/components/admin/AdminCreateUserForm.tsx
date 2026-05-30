"use client";

import { FormEvent, useState } from "react";
import { UserPlus } from "lucide-react";
import { api, ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

function detailsToMessage(details: unknown): string | null {
  if (typeof details !== "object" || details === null || !("fieldErrors" in details)) {
    return null;
  }

  const fieldErrors = (details as { fieldErrors?: Record<string, string[]> }).fieldErrors;
  if (!fieldErrors) {
    return null;
  }

  const messages = Object.entries(fieldErrors)
    .flatMap(([field, errors]) => errors.map((error) => `${field}: ${error}`))
    .filter(Boolean);

  return messages.length > 0 ? messages.join(" ") : null;
}

export function AdminCreateUserForm() {
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    const trimmedUsername = username.trim();
    const trimmedDisplayName = displayName.trim();

    if (trimmedUsername.length < 3) {
      setError("Username must be at least 3 characters.");
      return;
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(trimmedUsername)) {
      setError("Username can use only letters, numbers, underscores, or hyphens.");
      return;
    }

    if (trimmedDisplayName.length < 1) {
      setError("Display name is required.");
      return;
    }

    if (password.length < 10) {
      setError("Temporary password must be at least 10 characters.");
      return;
    }

    setLoading(true);
    try {
      const user = await api.createUser({
        username: trimmedUsername,
        displayName: trimmedDisplayName,
        password,
        role: "USER"
      });
      setMessage(`Created ${user.user.username}`);
      setUsername("");
      setDisplayName("");
      setPassword("");
    } catch (caught) {
      if (caught instanceof ApiError) {
        setError(detailsToMessage(caught.details) ?? caught.message);
      } else {
        setError("Could not create that account.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Friend Account</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="grid gap-3" onSubmit={submit}>
          <Input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Username" />
          <Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Display name" />
          <Input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Temporary password, 10+ characters"
            type="password"
            minLength={10}
          />
          <Button type="submit" disabled={loading}>
            <UserPlus className="h-4 w-4" />
            {loading ? "Creating" : "Create"}
          </Button>
        </form>
        {error ? <p className="mt-3 rounded-md bg-red-50 p-2 text-sm font-semibold text-red-800">{error}</p> : null}
        {message ? <p className="mt-3 rounded-md bg-emerald-50 p-2 text-sm font-semibold text-emerald-800">{message}</p> : null}
      </CardContent>
    </Card>
  );
}