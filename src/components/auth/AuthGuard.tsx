"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

import PageLoading from "@/components/common/PageLoading";
import { getMe } from "@/lib/api/auth";
import { setStoredUser } from "@/lib/auth/session";
import { getAccessToken, hasAccessToken } from "@/lib/auth/token";

type AuthGuardProps = {
  children: ReactNode;
};

export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function checkAuth() {
      if (!hasAccessToken()) {
        const next = pathname && pathname !== "/" ? pathname : undefined;
        const loginUrl = next
          ? `/login?next=${encodeURIComponent(next)}`
          : "/login";
        router.replace(loginUrl);
        return;
      }

      try {
        const me = await getMe(getAccessToken());
        if (!cancelled) {
          setStoredUser(me.data);
        }
      } catch {
        // Keep existing local user if /me fails; token may still be valid for other pages.
      }

      if (!cancelled) {
        setReady(true);
      }
    }

    void checkAuth();

    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  if (!ready) {
    return <PageLoading label="กำลังตรวจสอบสิทธิ์..." />;
  }

  return children;
}
