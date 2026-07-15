"use client";

import { useState } from "react";

import AppHeader from "./AppHeader";

export default function AppShell({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
        <div className="mainLayout">{children}</div>
      </div>
    </div>
  );
}
