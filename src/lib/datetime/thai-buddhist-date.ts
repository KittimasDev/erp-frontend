import { ERP_TIMEZONE } from "./erp-timezone";
import type { Language } from "@/lib/i18n/translate";

function toDate(value?: string | Date | null): Date | null {
  if (!value) return null;
  const raw = typeof value === "string" ? value.trim() : value.toISOString();
  if (!raw) return null;
  const normalized = /([zZ]|[+-]\d{2}:?\d{2})$/.test(raw) ? raw : `${raw}Z`;
  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** 24 สิงหาคม 2569 — ปีพุทธศักราช ตามโซนเวลาไทย */
export function formatThaiBuddhistDate(
  value?: string | Date | null,
  fallback = "",
  /** ไม่ส่ง = ไทย (พ.ศ.) · "en" = ค.ศ. แบบ 24 August 2026 */
  lang: Language = "th",
): string {
  const d = toDate(value);
  if (!d) return fallback;
  return new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "th-TH", {
    timeZone: ERP_TIMEZONE,
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

/**
 * ป้ายเลขฉบับใต้เลข SO
 *
 * ร่างเป็น "ฉบับ 0" ตลอด แก้กี่ครั้งก็ไม่ขยับ · ยืนยันแล้วเป็น "ฉบับ 1"
 * แล้วบวกทีละหนึ่งทุกครั้งที่แก้รอบจัดส่ง โดยต่อท้ายด้วยวันที่แก้ล่าสุด
 *
 * คืนค่าเสมอ ไม่คืน `null` เหมือนเดิม เพราะตอนร่างก็ต้องเห็น "ฉบับ 0"
 *
 * ตัดสินว่าจะโชว์วันที่จากตัวเลขฉบับ ไม่ใช่จากการเทียบ `revisedAt > confirmedAt`
 * แบบเดิม เพราะใบเก่าจำนวนมากยืนยันไปแล้วแต่ `confirmed_at` ว่าง เทียบไม่ได้
 * ฉบับตั้งแต่ 2 ขึ้นไปแปลว่าแก้รอบหลังยืนยันมาแล้วแน่นอน
 */
export function salesOrderRevisionStamp(
  revisionNo?: number | null,
  revisedAt?: string | Date | null,
  lang: Language = "th",
): string {
  const parsed = Number(revisionNo ?? 0);
  const revision = Number.isFinite(parsed) ? parsed : 0;
  const label = lang === "en" ? `Rev. ${revision}` : `ฉบับ ${revision}`;

  if (revision < 2) return label;
  const date = formatThaiBuddhistDate(revisedAt, "", lang);
  if (!date) return label;
  return lang === "en" ? `${label} · Edited ${date}` : `${label} · แก้ไข ${date}`;
}
