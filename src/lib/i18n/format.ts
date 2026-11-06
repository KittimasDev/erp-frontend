import { ERP_TIMEZONE } from "@/lib/datetime/erp-timezone";

import type { Language } from "./translate";

const localeOf = (lang: Language) => (lang === "en" ? "en-GB" : "th-TH");

function toDate(value?: string | Date | null): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** วันที่ตามภาษา — ไทย 24 สิงหาคม 2569 (พ.ศ.) · อังกฤษ 24 August 2026 */
export function formatDate(
  value: string | Date | null | undefined,
  lang: Language,
  fallback = "-",
): string {
  const d = toDate(value);
  if (!d) return fallback;
  return new Intl.DateTimeFormat(localeOf(lang), {
    timeZone: ERP_TIMEZONE,
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

/** วันที่+เวลาตามภาษา */
export function formatDateTime(
  value: string | Date | null | undefined,
  lang: Language,
  fallback = "-",
): string {
  const d = toDate(value);
  if (!d) return fallback;
  return new Intl.DateTimeFormat(localeOf(lang), {
    timeZone: ERP_TIMEZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function formatNumber(value: number, lang: Language, maxFractionDigits = 3): string {
  return value.toLocaleString(localeOf(lang), { maximumFractionDigits: maxFractionDigits });
}

/** จำนวนเงิน 2 ตำแหน่ง เช่น 1,234.50 */
export function formatMoney(value: number, lang: Language): string {
  return value.toLocaleString(localeOf(lang), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
