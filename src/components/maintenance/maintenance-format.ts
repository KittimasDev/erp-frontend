import dayjs from "dayjs";

export const fmtDateTime = (iso?: string | null) => (iso ? dayjs(iso).format("DD/MM/YYYY HH:mm") : "—");
export const fmtDate = (iso?: string | null) => (iso ? dayjs(iso).format("DD/MM/YYYY") : "—");

export const fmtMoney = (v: number) =>
  v.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** นาที → "2 ชม. 30 นาที" */
export function fmtMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} นาที`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} ชม. ${m} นาที` : `${h} ชม.`;
}
