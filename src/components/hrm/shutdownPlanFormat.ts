import dayjs from "dayjs";

import type { Language } from "@/lib/i18n/translate";

/** 20/12/2569 — วัน/เดือน/ปี พ.ศ. (ภาษาอังกฤษ = ค.ศ. 20/12/2026) */
export function formatBeDate(isoDate: string, lang: Language = "th") {
  const d = dayjs(isoDate);
  return `${d.format("DD/MM/")}${lang === "en" ? d.year() : d.year() + 543}`;
}

export function formatBeRange(dateFrom: string, dateTo: string, lang: Language = "th") {
  return dateFrom === dateTo
    ? formatBeDate(dateFrom, lang)
    : `${formatBeDate(dateFrom, lang)} – ${formatBeDate(dateTo, lang)}`;
}
