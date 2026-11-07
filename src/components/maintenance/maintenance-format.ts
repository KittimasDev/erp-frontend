import dayjs from "dayjs";

import { formatMoney } from "@/lib/i18n/format";
import { getStoredLanguage, type Language } from "@/lib/i18n/language";
import { tNow } from "@/lib/i18n/useT";
import { EQUIPMENT_STATUS_LABEL, WORK_ORDER_STATUS_LABEL } from "@/types/maintenance";

export const fmtDateTime = (iso?: string | null) => (iso ? dayjs(iso).format("DD/MM/YYYY HH:mm") : "—");
export const fmtDate = (iso?: string | null) => (iso ? dayjs(iso).format("DD/MM/YYYY") : "—");

export const fmtMoney = (v: number) => formatMoney(v, getStoredLanguage());

const WORK_ORDER_STATUS_EN: Record<string, string> = {
  DRAFT: "Draft",
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const EQUIPMENT_STATUS_EN: Record<string, string> = {
  ACTIVE: "Active",
  UNDER_MAINTENANCE: "Under maintenance",
  RETIRED: "Retired",
};

/** สถานะเครื่องจักรตามภาษา ("ซ่อมบำรุง" ชนกับชื่อเมนู จึงแยกเป็นฟังก์ชัน) */
export function equipmentStatusLabel(status: string, lang: Language): string {
  if (lang === "en") return EQUIPMENT_STATUS_EN[status] ?? status;
  return EQUIPMENT_STATUS_LABEL[status] ?? status;
}

/** สถานะใบสั่งงานตามภาษา (แยกจากปุ่ม "ยกเลิก" ที่แปลว่า Cancel) */
export function woStatusLabel(status: string, lang: Language): string {
  if (lang === "en") return WORK_ORDER_STATUS_EN[status] ?? status;
  return WORK_ORDER_STATUS_LABEL[status] ?? status;
}

/** นาที → "2 ชม. 30 นาที" */
export function fmtMinutes(minutes: number): string {
  if (minutes < 60) return tNow("{n} นาที", { n: minutes });
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? tNow("{h} ชม. {m} นาที", { h, m }) : tNow("{h} ชม.", { h });
}
