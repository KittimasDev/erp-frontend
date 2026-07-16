"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

import PageLoading from "@/components/common/PageLoading";
import { hasAccessToken } from "@/lib/auth/token";

type AuthGuardProps = {
  children: ReactNode;
};

export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!hasAccessToken()) {
      const next = pathname && pathname !== "/" ? pathname : undefined;
      const loginUrl = next
        ? `/login?next=${encodeURIComponent(next)}`
        : "/login";
      router.replace(loginUrl);
      return;
    }

    setReady(true);
  }, [pathname, router]);

  if (!ready) {
    return <PageLoading label="กำลังตรวจสอบสิทธิ์..." />;
  }

  return children;
}
