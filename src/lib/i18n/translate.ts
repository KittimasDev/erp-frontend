import { EN_MESSAGES } from "./messages/en";

export type Language = "th" | "en";

export type TranslateParams = Record<string, string | number>;

/**
 * แปลข้อความ — ใช้ "ข้อความภาษาไทย" เป็นคีย์ (ไทยคือ source of truth)
 *
 * - ภาษาไทย: คืนข้อความเดิม (แทนค่า `{param}`)
 * - ภาษาอังกฤษ: ค้นใน `EN_MESSAGES` ถ้าไม่เจอ **fallback เป็นไทย** จึงไม่มีทางแสดงคีย์เปล่า/หน้าพัง
 *   และหน้าที่ยังไม่ได้แปลก็แสดงผลได้ตามปกติ
 */
export function translate(
  lang: Language,
  thai: string,
  params?: TranslateParams,
): string {
  const text = lang === "en" ? (EN_MESSAGES[thai] ?? thai) : thai;
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}
