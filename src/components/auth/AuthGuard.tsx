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

      try {
        const me = await getMe(getAccessToken());
        if (!cancelled) {
          setStoredUser(me.data);
        }
      } catch {
        // /me ตรวจสอบสิทธิ์ไม่ได้ (token หมดอายุ, ไม่ผ่านสิทธิ์, หรือเรียก backend ไม่ได้เลย)
        // ไม่ปล่อยให้ค้างอยู่ในสถานะไม่ชัดเจน — พาไปหน้า login ใหม่เสมอ
        if (!cancelled) {
          redirectToLogin(next);
        }
        return;
      }

      if (!cancelled) {
        setReady(true);
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
