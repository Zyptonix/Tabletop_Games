"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api/client";
import { useAuthStore } from "@/lib/stores/authStore";

export function useAuth(options: { required?: boolean } = {}) {
  const router = useRouter();
  const { user, loading, setUser } = useAuthStore();

  useEffect(() => {
    let cancelled = false;
    api
      .me()
      .then((result) => {
        if (!cancelled) {
          setUser(result.user);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUser(null);
          if (options.required) {
            router.replace("/");
          }
        }
      });

    return () => {
      cancelled = true;
    };
  }, [options.required, router, setUser]);

  return { user, loading };
}
