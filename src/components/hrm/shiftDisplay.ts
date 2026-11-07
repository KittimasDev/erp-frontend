import { tNow } from "@/lib/i18n/useT";
import { getStoredLanguage } from "@/lib/i18n/language";

/** ตัวช่วยแปลงค่าตัวเลขของกะให้อ่านง่ายบนหน้าจอ — ใช้ร่วมกันทั้งตารางและลิ้นชักรายคน */

/** นาที → "8 ชม." / "8 ชม. 30 น." / "45 น." */
export function formatWorkMinutes(minutes?: number): string {
  if (!minutes || minutes <= 0) {
    return "—";
  }
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) {
    return tNow("{n} น.", { n: rest });
  }
  return rest === 0
    ? tNow("{n} ชม.", { n: hours })
    : tNow("{h} ชม. {m} น.", { h: hours, m: rest });
}

/** นาที → ชั่วโมงทศนิยม 1 ตำแหน่ง สำหรับการ์ดสรุป (เช่น "1,248.5 ชม.") */
export function formatWorkHours(minutes?: number): string {
  if (!minutes || minutes <= 0) {
    return tNow("{n} ชม.", { n: 0 });
  }
  const hours = minutes / 60;
  const text = hours.toLocaleString(getStoredLanguage() === "en" ? "en-GB" : "th-TH", {
    minimumFractionDigits: hours % 1 === 0 ? 0 : 1,
    maximumFractionDigits: 1,
  });
  return tNow("{n} ชม.", { n: text });
}

/**
 * เวลาเข้ากะ + ผ่อนผันสาย = ตอกบัตรช้าสุดที่ยังไม่นับสาย
 *
 * คืน null เมื่อกะไม่ได้ตั้งเวลาผ่อนผันไว้ หรือรูปแบบเวลาไม่ถูกต้อง
 */
export function lateCutoffTime(
  startTime?: string,
  graceMinutes?: number,
): string | null {
  if (!startTime || !graceMinutes || graceMinutes <= 0) {
    return null;
  }
  const match = /^(\d{1,2}):(\d{2})$/.exec(startTime.trim());
  if (!match) {
    return null;
  }
  const total = (Number(match[1]) * 60 + Number(match[2]) + graceMinutes) % 1440;
  const hours = String(Math.floor(total / 60)).padStart(2, "0");
  const minutes = String(total % 60).padStart(2, "0");
  return `${hours}:${minutes}`;
}
