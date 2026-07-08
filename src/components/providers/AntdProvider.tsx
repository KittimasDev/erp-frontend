"use client";

import { ConfigProvider } from "antd";
import type { ReactNode } from "react";

export default function AntdProvider({ children }: { children: ReactNode }) {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#75a900",
          colorSuccess: "#75a900",
          colorWarning: "#efc05f",
          borderRadius: 16,
          fontFamily:
            "var(--font-geist-sans), system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
        },
      }}
    >
      {children}
    </ConfigProvider>
  );
}
