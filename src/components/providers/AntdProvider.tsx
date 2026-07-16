"use client";

import { ConfigProvider } from "antd";
import type { ReactNode } from "react";

export default function AntdProvider({ children }: { children: ReactNode }) {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#8ab933",
          colorSuccess: "#8ab933",
          colorWarning: "#efc05f",
          borderRadius: 12,
          fontFamily: "var(--font-kanit), Kanit, sans-serif",
          colorText: "#2f343a",
          colorBgLayout: "#f5f7fa",
        },
        components: {
          Button: {
            primaryShadow: "0 8px 18px rgba(138, 185, 51, 0.28)",
          },
          Table: {
            headerBg: "#f8f9fa",
            headerColor: "#5c6570",
            rowHoverBg: "rgba(138, 185, 51, 0.06)",
          },
        },
      }}
    >
      {children}
    </ConfigProvider>
  );
}
