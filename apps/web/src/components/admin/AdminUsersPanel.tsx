"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GameConfirmModal } from "@/components/ui/GameConfirmModal";
import { Shield, ShieldAlert, Sparkles, Trash2, UserCheck, Users } from "lucide-react";

type AdminUser = {
  id: string;
  username: string;
  email: string | null;
  role: "USER" | "ADMIN";
  isGuest?: boolean;
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
  const [pruning, setPruning] = useState(false);

  // Confirm delete modal state
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);

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

  async function toggleRole(user: AdminUser) {
    const nextRole = user.role === "ADMIN" ? "USER" : "ADMIN";
    try {
      await api.adminUpdateUserRole(user.id, nextRole);
      setUsers((current) =>
        current.map((item) => (item.id === user.id ? { ...item, role: nextRole } : item))
      );
      setMessage(`Updated ${user.displayName} to ${nextRole}.`);
      setError("");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Failed to update role.");
    }
  }

  async function handlePruneGuests() {
    setPruning(true);
    try {
      const res = await api.adminPruneGuests();
      setMessage(`Pruned ${res.prunedCount} inactive guest account(s).`);
      setError("");
      await refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Pruning failed.");
    } finally {
      setPruning(false);
    }
  }

  async function confirmDeleteUser() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);

    try {
      await api.adminDeleteUser(target.id);
      setUsers((current) => current.filter((item) => item.id !== target.id));
      setMessage(`Deleted ${target.username}.`);
      setError("");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Account deletion failed.");
    }
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-[#111821] text-slate-100 shadow-xl overflow-hidden">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 p-5">
        <div>
          <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
            <Users className="h-5 w-5 text-emerald-400" /> User Profiles & Accounts
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            {users.length} total account{users.length === 1 ? "" : "s"} ({users.filter((u) => u.isGuest).length} guests)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={pruning}
            onClick={() => void handlePruneGuests()}
            className="text-xs font-bold border-amber-500/30 text-amber-300 hover:bg-amber-500/10"
          >
            {pruning ? "Pruning..." : "🧹 Prune Inactive Guests (> 7d)"}
          </Button>
          <Button type="button" variant="outline" onClick={() => void refresh()}>
            Refresh
          </Button>
        </div>
      </div>

      <div className="space-y-3 p-5">
        {error && <p className="rounded-xl bg-red-950/60 border border-red-500/30 p-3 text-xs font-semibold text-red-200">{error}</p>}
        {message && <p className="rounded-xl bg-emerald-950/60 border border-emerald-500/30 p-3 text-xs font-semibold text-emerald-200">{message}</p>}
        {loading && <p className="text-xs text-slate-400">Loading profiles…</p>}

        {!loading && users.length === 0 && (
          <p className="text-xs text-slate-400">No registered accounts found.</p>
        )}

        {users.map((user) => (
          <article key={user.id} className="space-y-3 rounded-xl border border-white/10 bg-[#0c1219] p-4 transition hover:border-white/20">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-white text-sm">{user.displayName}</p>
                  {user.isGuest ? (
                    <span className="rounded-md border border-cyan-500/30 bg-cyan-500/15 px-2 py-0.5 text-[10px] font-black uppercase text-cyan-300">
                      Guest
                    </span>
                  ) : (
                    <span className="rounded-md border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-300">
                      Registered
                    </span>
                  )}
                  <span className={`rounded-md px-2 py-0.5 text-[10px] font-black uppercase ${
                    user.role === "ADMIN" ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" : "bg-white/10 text-white/70"
                  }`}>
                    {user.role}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  @{user.username} {user.email ? `· ${user.email}` : ""} · Joined {new Date(user.createdAt).toLocaleDateString()}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  user.inActiveRoom
                    ? "bg-emerald-900/80 text-emerald-200 border border-emerald-500/30"
                    : "bg-slate-800 text-slate-400"
                }`}>
                  {user.inActiveRoom ? "🟢 In match" : "Idle"}
                </span>

                <button
                  type="button"
                  onClick={() => void toggleRole(user)}
                  className="rounded-lg border border-white/10 bg-white/[0.05] px-2.5 py-1 text-xs font-bold text-slate-300 hover:bg-white/10"
                >
                  {user.role === "ADMIN" ? "Demote to User" : "Promote to Admin"}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2 border-t border-white/[0.06] sm:flex-row">
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
                className="text-xs"
              />
              <Button type="button" onClick={() => void setPassword(user)} className="text-xs font-bold">
                Change password
              </Button>
              <Button
                type="button"
                variant="danger"
                disabled={user.inActiveRoom}
                onClick={() => setDeleteTarget(user)}
                className="text-xs font-bold"
              >
                Delete
              </Button>
            </div>
          </article>
        ))}
      </div>

      <GameConfirmModal
        open={Boolean(deleteTarget)}
        title="Delete User Account"
        message={`Delete "${deleteTarget?.username}" (${deleteTarget?.displayName})? This cannot be undone.`}
        confirmLabel="Delete Account"
        isDestructive={true}
        onConfirm={() => void confirmDeleteUser()}
        onCancel={() => setDeleteTarget(null)}
      />
    </section>
  );
}
