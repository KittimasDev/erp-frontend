"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import AccessDenied from "@/components/auth/AccessDenied";
import PageLoading from "@/components/common/PageLoading";
import { getMe } from "@/lib/api/auth";
import { getMyPermissions } from "@/lib/api/permissions";
import { redirectToLogin } from "@/lib/auth/redirect-to-login";
import {
  clearStoredPermissions,
  setStoredPermissionsAndNotify,
} from "@/lib/auth/permissions-access";
import { resolveScreenCodesForPath } from "@/lib/auth/screen-routes";
import { setStoredUser } from "@/lib/auth/session";
import { getAccessToken, hasAccessToken } from "@/lib/auth/token";

type AuthGuardProps = {
  children: ReactNode;
};

export default function AuthGuard({ children }: AuthGuardProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(true);
  const [blockedScreens, setBlockedScreens] = useState<string[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const next = pathname && pathname !== "/" ? pathname : undefined;

    async function checkAuth() {
      setReady(false);
      setAllowed(true);
      setBlockedScreens(null);

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

        const screenCodes = resolveScreenCodesForPath(
          pathname,
          searchParams,
        );
        const isAdmin = (me.data.roles ?? []).some(
          (r) => r.roleCode === "ADMINISTRATOR",
        );

        const hasScreenAccess = (codes: string[]) => {
          if (perms.data.permissionCodes.includes("*")) {
            return true;
          }
          return codes.some(
            (code) =>
              perms.data.screenCodes.includes(code) ||
              perms.data.permissionCodes.some((p) =>
                p.startsWith(`${code}.`),
              ),
          );
        };

        if (
          perms.data.mode === "matrix" &&
          !isAdmin &&
          screenCodes &&
          screenCodes.length > 0 &&
          !hasScreenAccess(screenCodes)
        ) {
          setBlockedScreens(screenCodes);
          setAllowed(false);
        } else {
          setAllowed(true);
          setBlockedScreens(null);
        }

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
  }, [pathname, searchParams]);

  if (!ready) {
    return <PageLoading label="กำลังตรวจสอบสิทธิ์..." />;
  }

  if (!allowed) {
    return <AccessDenied screenCodes={blockedScreens} />;
  }

  return children;
}
