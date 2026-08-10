import AppShell from "@/components/navbar/AppShell";
import AuthGuard from "@/components/auth/AuthGuard";
import PageLoading from "@/components/common/PageLoading";
import { Suspense } from "react";

export default function AppShellLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <Suspense fallback={<PageLoading label="กำลังตรวจสอบสิทธิ์..." />}>
      <AuthGuard>
        <AppShell>{children}</AppShell>
      </AuthGuard>
    </Suspense>
  );
}
