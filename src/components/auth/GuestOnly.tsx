"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import PageLoading from "@/components/common/PageLoading";
import { hasAccessToken } from "@/lib/auth/token";

type GuestOnlyProps = {
  children: ReactNode;
};

export default function GuestOnly({ children }: GuestOnlyProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (hasAccessToken()) {
      const next = searchParams.get("next");
      router.replace(next && next.startsWith("/") ? next : "/");
      return;
    }

    setReady(true);
  }, [router, searchParams]);

  if (!ready) {
    return <PageLoading label="กำลังโหลด..." />;
  }

  return children;
}
