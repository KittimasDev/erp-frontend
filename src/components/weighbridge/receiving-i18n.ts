import { getStoredLanguage } from "@/lib/i18n/language";
import { tNow } from "@/lib/i18n/useT";

/**
 * แปลป้ายสถานะ/ป้ายจากค่าคงที่ภาษาไทยของโมดูลรับซื้อ (ใช้ตอนเรนเดอร์)
 * "ยกเลิก" ในตารางสถานะ = Cancelled (ไม่ใช่ปุ่ม Cancel) จึงแยกจากคีย์ปกติ
 * ผู้เรียกต้องอยู่ในคอมโพเนนต์ที่เรียก useT()/useLanguage() อยู่แล้ว
 */
export function tLabel(thai: string | undefined | null): string {
  if (thai === undefined || thai === null) return "";
  if (getStoredLanguage() === "en") {
    if (thai === "ยกเลิก") return "Cancelled";
    if (thai === "แก้ไข") return "Edited";
  }
  return tNow(thai);
}

/** locale ของ toLocaleString ตามภาษาปัจจุบัน (อังกฤษ = ค.ศ.) */
export function appLocale(): string {
  return getStoredLanguage() === "en" ? "en-GB" : "th-TH";
}
