import AppHeader from "@/components/navbar/AppHeader";

export default function AppShellLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="appShell">
      <div className="appHeaderRegion">
        <AppHeader />
      </div>
      <div className="mainLayout">{children}</div>
    </div>
  );
}
