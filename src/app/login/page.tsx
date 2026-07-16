"use client";

import { Suspense } from "react";

import GuestOnly from "@/components/auth/GuestOnly";
import LoginPage from "@/components/login/LoginPage";
import PageLoading from "@/components/common/PageLoading";

export default function LoginRoutePage() {
  return (
    <Suspense fallback={<PageLoading label="กำลังโหลด..." />}>
      <GuestOnly>
        <LoginPage />
      </GuestOnly>
    </Suspense>
  );
}
