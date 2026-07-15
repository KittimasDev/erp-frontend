"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";

import AppHeader from "./AppHeader";

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
      <AppHeader
        collapsed={collapsed}
        onCollapsedChange={setCollapsed}
      />

      <div className="appMain">
        <div className="mainLayout" key={pathname}>
          {children}
        </div>
      </div>
    </div>
  );
}
