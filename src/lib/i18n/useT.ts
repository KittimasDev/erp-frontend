"use client";

import { useCallback } from "react";

import { getStoredLanguage, useLanguage } from "./language";
import { translate, type TranslateParams } from "./translate";

/**
 * แปลตามภาษาปัจจุบันโดยไม่ใช้ hook — สำหรับฟังก์ชันช่วยเรนเดอร์ที่ไม่ใช่คอมโพเนนต์
 * (เช่น `renderMenuButton`) · ผู้เรียกต้องอยู่ในคอมโพเนนต์ที่เรียก `useLanguage()`/`useT()` อยู่แล้ว
 * เพื่อให้เรนเดอร์ซ้ำเมื่อสลับภาษา
 */
export function tNow(thai: string, params?: TranslateParams): string {
  return translate(getStoredLanguage(), thai, params);
}

export type TFunction =(thai: string, params?: TranslateParams) => string;

/**
 * แปลข้อความในคอมโพเนนต์ — `const t = useT(); t("บันทึก")` · มีพารามิเตอร์: `t("ทั้งหมด {n} รายการ", { n })`
 * ข้อความอังกฤษเพิ่มที่ `lib/i18n/messages/en.ts` (ไม่มี = แสดงไทยตามเดิม)
 */
export function useT(): TFunction {
  const language = useLanguage();
  return useCallback(
    (thai: string, params?: TranslateParams) => translate(language, thai, params),
    [language],
  );
}
