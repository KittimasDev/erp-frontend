import { standardStatusColor, standardStatusLabel } from "@/lib/status/standard-status";

/** ประวัติการอนุมัติใบเสนอราคา/ใบสั่งขาย — 1 แถวต่อ 1 การกระทำ (เก่า → ใหม่) */
export type SalesApprovalEvent = {
  id: string;
  action: "SUBMIT" | "APPROVE" | "REJECT" | "RETURN" | string;
  fromStatus?: string;
  toStatus?: string;
  reason?: string;
  performedById?: string;
  performedByName?: string;
  performedAt: string;
};

/** ข้อความตั้งต้นของ Action (ผ่าน t() ตอนแสดง) */
export const SALES_APPROVAL_ACTION_LABEL: Record<string, string> = {
  SUBMIT: "ส่งอนุมัติ",
  APPROVE: "อนุมัติ",
  REJECT: "ไม่อนุมัติ",
  RETURN: "ส่งกลับแก้ไข",
};

export const SALES_APPROVAL_ACTION_COLOR: Record<string, string> = {
  SUBMIT: "processing",
  APPROVE: "success",
  REJECT: "error",
  RETURN: "warning",
};

/** ฟิลด์ผลอนุมัติที่ QT/SO ใช้ร่วมกัน */
export type SalesApprovalFields = {
  submittedAt?: string;
  submittedByName?: string;
  approvalDecidedAt?: string;
  approvalDecidedByName?: string;
  /** เหตุผลล่าสุดของ ไม่อนุมัติ/ส่งกลับ (อนุมัติแล้วเป็นค่าว่าง) */
  approvalReason?: string;
  approvalHistory?: SalesApprovalEvent[];
};

export const approvalPendingLabel = (lang?: "th" | "en") =>
  standardStatusLabel("PENDING_APPROVAL", lang);
export const approvalPendingColor = () => standardStatusColor("PENDING_APPROVAL");

export type SalesApprovalReasonBody = { reason: string };
