import { ERP_TIMEZONE } from "./erp-timezone";

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
): string {
  const d = toDate(value);
  if (!d) return fallback;
  return new Intl.DateTimeFormat("th-TH", {
    timeZone: ERP_TIMEZONE,
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

/**
 * ป้ายใต้เลข SO เมื่อแก้หลังยืนยัน (เลื่อนวันส่ง / ยกเลิก)
 * แก้หัวเอกสารก่อนยืนยันไม่นับเป็นฉบับแก้ไข
 */
export function salesOrderRevisionStamp(
  revisedAt?: string | Date | null,
  confirmedAt?: string | Date | null,
): string | null {
  const revised = toDate(revisedAt);
  const confirmed = toDate(confirmedAt);
  if (!revised || !confirmed || revised.getTime() <= confirmed.getTime()) {
    return null;
  }
  const date = formatThaiBuddhistDate(revised);
  return date ? `ฉบับแก้ไข วันที่ ${date}` : null;
}
