"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";

import PageLoading from "@/components/common/PageLoading";
import { getMe } from "@/lib/api/auth";
import { redirectToLogin } from "@/lib/auth/redirect-to-login";
import { setStoredUser } from "@/lib/auth/session";
import { getAccessToken, hasAccessToken } from "@/lib/auth/token";

type AuthGuardProps = {
  children: ReactNode;
};

export default function AuthGuard({ children }: AuthGuardProps) {
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const next = pathname && pathname !== "/" ? pathname : undefined;

    async function checkAuth() {
      if (!hasAccessToken()) {
        redirectToLogin(next);
        return;
      }

      // Optimistic shell after mount — must not read localStorage in useState initializer (hydration mismatch)
      if (!cancelled) {
        setReady(true);
      }

      try {
        const me = await getMe(getAccessToken());
        if (!cancelled) {
          setStoredUser(me.data);
        }
      } catch {
        if (!cancelled) {
          redirectToLogin(next);
        }
      }
    }

    void checkAuth();

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  if (!ready) {
    return <PageLoading label="กำลังตรวจสอบสิทธิ์..." />;
  }

  return children;
}
