import AppShell from "@/components/navbar/AppShell";
import AuthGuard from "@/components/auth/AuthGuard";

export default function AppShellLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthGuard>
      <AppShell>{children}</AppShell>
    </AuthGuard>
  );
}
