import type { Language } from "@/lib/i18n/translate";

/**
 * มาตรฐานชื่อ/สีสถานะเอกสารทั้ง ERP — ความหมายเดียวกันต้องใช้ข้อความและสีเดียวกันทุกโมดูล
 *
 * ใช้เฉพาะ "การแสดงผล": Status Code ใน DB / API / workflow ของแต่ละโมดูลไม่เปลี่ยน
 * แต่ละโมดูลยังมี map รหัสสถานะของตัวเอง แล้วชี้รหัสที่ "ความหมายตรงกัน" มาที่ค่ามาตรฐานนี้
 * (เช่น purchase request DRAFT → "DRAFT") — รหัสที่ชื่อเหมือนแต่ความหมายต่าง (เช่น "ปฏิเสธ" ของกระบวนการอื่น
 * ที่ไม่ใช่การขออนุมัติ) ให้คงข้อความเดิม ไม่บังคับ map
 *
 * ภาษาอังกฤษใส่ไว้ที่นี่เลย (ไม่ผ่าน t()) เพราะคีย์ไทยหลายคำชนกับคำกริยาในปุ่ม
 * เช่น "ยกเลิก" = Cancel (ปุ่ม) / Cancelled (สถานะ), "ไม่อนุมัติ" = Reject / Rejected, "ส่งแล้ว" = Submitted / Delivered
 */
export type StandardStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "DELIVERED"
  | "CANCELLED";

/** สี = preset ของ antd Tag (`default` = เทา) */
export const STANDARD_STATUS: Record<StandardStatus, { th: string; en: string; color: string }> = {
  DRAFT: { th: "แบบร่างเอกสาร", en: "Draft", color: "default" },
  PENDING_APPROVAL: { th: "รออนุมัติ", en: "Pending approval", color: "orange" },
  APPROVED: { th: "อนุมัติแล้ว", en: "Approved", color: "green" },
  REJECTED: { th: "ไม่อนุมัติ", en: "Rejected", color: "red" },
  IN_PROGRESS: { th: "กำลังดำเนินการ", en: "In progress", color: "blue" },
  COMPLETED: { th: "เสร็จสิ้น", en: "Completed", color: "green" },
  DELIVERED: { th: "ส่งแล้ว", en: "Delivered", color: "green" },
  CANCELLED: { th: "ยกเลิก", en: "Cancelled", color: "default" },
};

export function standardStatusLabel(status: StandardStatus, lang: Language = "th"): string {
  return STANDARD_STATUS[status][lang === "en" ? "en" : "th"];
}

export function standardStatusColor(status: StandardStatus): string {
  return STANDARD_STATUS[status].color;
}
