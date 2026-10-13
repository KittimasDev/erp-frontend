import dayjs from "dayjs";

/** 20/12/2569 — วัน/เดือน/ปี พ.ศ. */
export function formatBeDate(isoDate: string) {
  const d = dayjs(isoDate);
  return `${d.format("DD/MM/")}${d.year() + 543}`;
}

export function formatBeRange(dateFrom: string, dateTo: string) {
  return dateFrom === dateTo
    ? formatBeDate(dateFrom)
    : `${formatBeDate(dateFrom)} – ${formatBeDate(dateTo)}`;
}
