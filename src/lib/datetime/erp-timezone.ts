/** โซนเวลาแสดงผลของ ERP (ไทย) — กัน SSR/UTC ทำให้เวลาช้า 7 ชม. */
export const ERP_TIMEZONE = "Asia/Bangkok";

function toErpDate(value?: string | Date | null) {
  if (!value) return null;
  const raw = typeof value === "string" ? value.trim() : value.toISOString();
  if (!raw) return null;
  const normalized = /([zZ]|[+-]\d{2}:?\d{2})$/.test(raw) ? raw : `${raw}Z`;
  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatParts(
  value: string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions,
) {
  const d = toErpDate(value);
  if (!d) return null;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: ERP_TIMEZONE,
    ...options,
  }).format(d);
}

export function formatErpDate(value?: string | Date | null, fallback = "—") {
  return (
    formatParts(value, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }) ?? fallback
  );
}

export function formatErpTime(value?: string | Date | null, fallback = "—") {
  return (
    formatParts(value, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }) ?? fallback
  );
}

export function formatErpDateTime(
  value?: string | Date | null,
  fallback = "—",
) {
  const date = formatErpDate(value, "");
  const time = formatErpTime(value, "");
  return date && time ? `${date} ${time}` : fallback;
}
