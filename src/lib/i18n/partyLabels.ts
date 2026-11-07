"use client";

import { useLanguage } from "./language";

/** ป้ายสวิตช์ เปิด/ปิด และ หลัก/รอง ของหน้า master ฝั่งคู่ค้า (คำไทยชนกับ "Open/Close", "Base" ใน dictionary กลาง) */
export function usePartyLabels() {
  const lang = useLanguage();
  const en = lang === "en";
  return {
    on: en ? "On" : "เปิด",
    off: en ? "Off" : "ปิด",
    primary: en ? "Primary" : "หลัก",
    secondary: en ? "Secondary" : "รอง",
  };
}
