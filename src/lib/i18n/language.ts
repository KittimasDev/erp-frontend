"use client";

import { useSyncExternalStore } from "react";

import type { Language } from "./translate";

/**
 * ภาษาของหน้าจอ (ไทย / อังกฤษ) — เก็บใน localStorage เพื่อจำค่าต่อเครื่อง
 *
 * ตัวสลับมีผลกับทั้งแอป: ข้อความผ่าน `useT()` (`lib/i18n/useT.ts`), antd/dayjs locale ใน `AntdProvider`,
 * และตั้งค่า `<html lang>` — หน้าที่ยังไม่แปลจะแสดงไทยตามเดิม (ดู `translate.ts`)
 */
export type { Language };

export const LANGUAGE_STORAGE_KEY = "erp:language";
export const LANGUAGE_CHANGED_EVENT = "erp:language-changed";

export function getStoredLanguage(): Language {
  if (typeof window === "undefined") return "th";
  try {
    return window.localStorage.getItem(LANGUAGE_STORAGE_KEY) === "en" ? "en" : "th";
  } catch {
    return "th";
  }
}

export function setLanguage(next: Language) {
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
  } catch {
    /* เก็บค่าไม่ได้ก็ยังสลับในหน้านี้ได้ */
  }
  document.documentElement.lang = next;
  window.dispatchEvent(new CustomEvent(LANGUAGE_CHANGED_EVENT, { detail: { language: next } }));
}

function subscribe(onChange: () => void) {
  window.addEventListener(LANGUAGE_CHANGED_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(LANGUAGE_CHANGED_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** อ่านภาษาปัจจุบัน — ฝั่งเซิร์ฟเวอร์/ตอน hydrate เป็น "th" ก่อนแล้วค่อยตามค่าที่เก็บไว้ */
export function useLanguage(): Language {
  return useSyncExternalStore(subscribe, getStoredLanguage, () => "th");
}
