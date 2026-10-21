"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type AdminUser = {
  id: string;
  username: string;
  email: string | null;
  role: "USER" | "ADMIN";
  displayName: string;
  createdAt: string;
  inActiveRoom: boolean;
};

export function AdminUsersPanel() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [passwords, setPasswords] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.adminUsers();
      setUsers(result.users);
      setError("");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not load users.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function setPassword(user: AdminUser) {
    const password = passwords[user.id] ?? "";
    if (!password) {
      setError("Enter a new password first.");
      return;
    }

    try {
      await api.adminSetPassword(user.id, password);
      setPasswords((current) => ({ ...current, [user.id]: "" }));
      setMessage(`Password updated for ${user.username}.`);
      setError("");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Password update failed.");
    }
  }

  async function deleteUser(user: AdminUser) {
    if (!window.confirm(
      `Delete the account "${user.username}" (${user.displayName})? This cannot be undone.`
    )) {
      return;
    }

    try {
      await api.adminDeleteUser(user.id);
      setUsers((current) => current.filter((item) => item.id !== user.id));
      setMessage(`Deleted ${user.username}.`);
      setError("");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Account deletion failed.");
    }
  }

  return (
    <section className="rounded-xl border border-white/10 bg-[#111821] text-slate-100">
      <div className="flex items-center justify-between border-b border-white/10 p-4">
        <div>
          <h2 className="font-bold">User profiles</h2>
          <p className="text-sm text-slate-400">
            {users.length} registered account{users.length === 1 ? "" : "s"}
          </p>
        </div>
        <Button type="button" variant="outline" onClick={() => void refresh()}>
          Refresh
        </Button>
      </div>

      <div className="space-y-3 p-4">
        {error && <p className="rounded-md bg-red-950/50 p-3 text-sm text-red-200">{error}</p>}
        {message && <p className="rounded-md bg-emerald-950/50 p-3 text-sm text-emerald-200">{message}</p>}
        {loading && <p className="text-sm text-slate-400">Loading profiles…</p>}

        {!loading && users.length === 0 && (
          <p className="text-sm text-slate-400">No registered accounts found.</p>
        )}

        {users.map((user) => (
          <article key={user.id} className="space-y-3 rounded-lg border border-white/10 bg-[#0c1219] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-bold">{user.displayName}</p>
                <p className="text-sm text-slate-400">
                  @{user.username} · {user.role}
                </p>
                {user.email && <p className="text-xs text-slate-500">{user.email}</p>}
              </div>

              <span className={`rounded-full px-2 py-1 text-xs font-semibold ${
                user.inActiveRoom
                  ? "bg-emerald-900 text-emerald-200"
                  : "bg-slate-800 text-slate-300"
              }`}>
                {user.inActiveRoom ? "In a game" : "No active game"}
              </span>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                type="password"
                value={passwords[user.id] ?? ""}
                onChange={(event) =>
                  setPasswords((current) => ({
                    ...current,
                    [user.id]: event.target.value
                  }))
                }
                placeholder="Set new password"
                autoComplete="new-password"
                minLength={1}
                maxLength={200}
              />
              <Button type="button" onClick={() => void setPassword(user)}>
                Change password
              </Button>
              <Button
                type="button"
                variant="danger"
                disabled={user.inActiveRoom}
                onClick={() => void deleteUser(user)}
              >
                Delete
              </Button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}