import dayjs from "dayjs";

import type { Language } from "@/lib/i18n/translate";

/** 20/12/2569 — วัน/เดือน/ปี พ.ศ. ทุกภาษา */
export function formatBeDate(isoDate: string, lang: Language = "th") {
  void lang;
  return dayjs(isoDate).format("DD/MM/BBBB");
}

export function formatBeRange(dateFrom: string, dateTo: string, lang: Language = "th") {
  return dateFrom === dateTo
    ? formatBeDate(dateFrom, lang)
    : `${formatBeDate(dateFrom, lang)} – ${formatBeDate(dateTo, lang)}`;
}
