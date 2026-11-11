"use client";

import { ConfigProvider } from "antd";
import enUS from "antd/locale/en_US";
import thTH from "antd/locale/th_TH";
import dayjs from "dayjs";
import "dayjs/locale/en";
import "dayjs/locale/th";
import { useEffect, type ReactNode } from "react";

import "@/lib/datetime/buddhist-era";
import { useLanguage } from "@/lib/i18n/language";

/**
 * Date Picker แสดงปี พ.ศ. ทั้งช่องกรอก หัวปฏิทิน และรายการปี (ทั้ง th/en) — ค่า dayjs ที่ได้ยังเป็น ค.ศ. จริง
 * ใช้ token BBBB ของ dayjs buddhistEra (ดู lib/datetime/buddhist-era.ts)
 */
function withBuddhistEra(base: typeof thTH): typeof thTH {
  const lang = {
    ...base.DatePicker?.lang,
    yearFormat: "BBBB",
    cellYearFormat: "BBBB",
    fieldDateFormat: "DD/MM/BBBB",
    fieldDateTimeFormat: "DD/MM/BBBB HH:mm:ss",
    fieldMonthFormat: "MM/BBBB",
    fieldYearFormat: "BBBB",
    fieldQuarterFormat: "[Q]Q/BBBB",
  };
  return {
    ...base,
    DatePicker: { ...base.DatePicker, lang } as typeof thTH.DatePicker,
    Calendar: { ...base.Calendar, lang } as typeof thTH.Calendar,
  };
}

const TH_BE = withBuddhistEra(thTH);
const EN_BE = withBuddhistEra(enUS);

export default function AntdProvider({ children }: { children: ReactNode }) {
  const language = useLanguage();
  // ตั้งก่อนลูกเรนเดอร์ เพื่อให้ dayjs().format("MMMM") ฯลฯ ในหน้าต่าง ๆ ได้ภาษาถูกตั้งแต่รอบแรก (idempotent)
  dayjs.locale(language);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return (
    <ConfigProvider
      locale={language === "en" ? EN_BE : TH_BE}
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
