"use client";

import { ConfigProvider } from "antd";
import enUS from "antd/locale/en_US";
import thTH from "antd/locale/th_TH";
import dayjs from "dayjs";
import "dayjs/locale/en";
import "dayjs/locale/th";
import { useEffect, type ReactNode } from "react";

import { useLanguage } from "@/lib/i18n/language";

export default function AntdProvider({ children }: { children: ReactNode }) {
  const language = useLanguage();
  // ตั้งก่อนลูกเรนเดอร์ เพื่อให้ dayjs().format("MMMM") ฯลฯ ในหน้าต่าง ๆ ได้ภาษาถูกตั้งแต่รอบแรก (idempotent)
  dayjs.locale(language);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return (
    <ConfigProvider
      locale={language === "en" ? enUS : thTH}
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
