"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/useAuth";
import { LoginPanel } from "@/components/auth/LoginPanel";

export default function HomePage() {
  const { user, loading } = useAuth({ required: false });
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#090d12]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
      </main>
    );
  }

  if (user) {
    return null;
  }

  return <LoginPanel redirectPath="/dashboard" />;
}
