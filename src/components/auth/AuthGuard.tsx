"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";

import PageLoading from "@/components/common/PageLoading";
import { getMe } from "@/lib/api/auth";
import { getMyPermissions } from "@/lib/api/permissions";
import { redirectToLogin } from "@/lib/auth/redirect-to-login";
import {
  clearStoredPermissions,
  setStoredPermissionsAndNotify,
} from "@/lib/auth/permissions-access";
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
        clearStoredPermissions();
        redirectToLogin(next);
        return;
      }

      try {
        const token = getAccessToken();
        const [me, perms] = await Promise.all([
          getMe(token),
          getMyPermissions(token),
        ]);
        if (cancelled) {
          return;
        }
        setStoredUser(me.data);
        setStoredPermissionsAndNotify(perms.data);
        setReady(true);
      } catch {
        if (!cancelled) {
          clearStoredPermissions();
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
