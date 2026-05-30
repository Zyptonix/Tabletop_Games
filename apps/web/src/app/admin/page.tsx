"use client";

import { AppShell } from "@/components/layout/AppShell";
import { AdminCreateUserForm } from "@/components/admin/AdminCreateUserForm";
import { AdminRoomList } from "@/components/admin/AdminRoomList";
import { useAuth } from "@/lib/auth/useAuth";

export default function AdminPage() {
  useAuth({ required: true });

  return (
    <AppShell>
      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <AdminCreateUserForm />
        <AdminRoomList />
      </div>
    </AppShell>
  );
}
