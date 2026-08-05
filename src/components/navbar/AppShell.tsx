"use client";

import { ConfigProvider } from "antd";
import { usePathname } from "next/navigation";
import { Suspense, useState } from "react";

import AppHeader from "./AppHeader";
import AppTopHeader from "./AppTopHeader";

// SMT Energy brand theme — scoped to the Main Content subtree only via a nested
// ConfigProvider. Sidebar/Header render outside this subtree and keep the
// app-wide theme from AntdProvider untouched.
const mainContentTheme = {
  token: {
    colorPrimary: "#739816",
    colorPrimaryHover: "#627F13",
    colorPrimaryActive: "#536C10",
    colorPrimaryBg: "#F2F6E8",
    colorPrimaryBorder: "#D3E0B8",
    colorSuccess: "#739816",
    colorWarning: "#F9BB0C",
    colorText: "#3F3F43",
    colorTextSecondary: "#77777C",
    colorBorder: "#E1E2DD",
    colorBgLayout: "#F7F8F5",
    colorBgContainer: "#FFFFFF",
    borderRadius: 10,
    fontFamily: "var(--font-kanit), Kanit, sans-serif",
  },
  components: {
    Button: {
      primaryShadow: "0 6px 16px rgba(115, 152, 22, 0.24)",
    },
    Table: {
      headerBg: "#F2F6E8",
      headerColor: "#3F3F43",
      rowHoverBg: "rgba(115, 152, 22, 0.06)",
    },
  },
};

export default function AppShell({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(true);

  return (
    <div
      className="appShell"
      data-sidebar={collapsed ? "collapsed" : "expanded"}
    >
      <Suspense fallback={null}>
        <AppHeader
          collapsed={collapsed}
          onCollapsedChange={setCollapsed}
        />
      </Suspense>
      <div className="appMain">
        <Suspense fallback={null}>
          <AppTopHeader />
        </Suspense>

        <main id="main-content" className="mainLayout" key={pathname}>
          <ConfigProvider theme={mainContentTheme}>{children}</ConfigProvider>
        </main>
      </div>
    </div>
  );
}
