import { STANDARD_STATUS, standardStatusColor } from "@/lib/status/standard-status";
import type { Quotation } from "@/types/quotations";

/** 5 ขั้นตอน QT → SO (ตรงกับหน้ารายละเอียด) — ขั้น "อนุมัติ" คืออนุมัติภายในก่อนส่งให้ลูกค้า */
export const QUOTATION_FLOW_STEPS = [
  { key: "DRAFT", label: STANDARD_STATUS.DRAFT.th },
  { key: "APPROVAL", label: "อนุมัติ" },
  { key: "SENT", label: "รอลูกค้าตอบรับ" },
  { key: "ACCEPTED", label: "ลูกค้าตอบรับแล้ว" },
  { key: "SALES_ORDER", label: "เปิด SO" },
] as const;

export type QuotationFlowTone = "active" | "waiting" | "done" | "stopped";

export type QuotationFlowState = {
  step: number;
  total: number;
  /** ข้อความเต็ม — ใช้หน้ารายละเอียด / tooltip */
  label: string;
  /** ข้อความสั้น — ใช้คอลัมน์สถานะในตาราง */
  shortLabel: string;
  tone: QuotationFlowTone;
  tagColor: "default" | "warning" | "processing" | "success" | "error";
};

type QuotationFlowInput = Pick<
  Quotation,
  "status" | "salesOrderId" | "salesOrderNo"
>;

export function resolveQuotationFlow(
  row: QuotationFlowInput,
): QuotationFlowState {
  const total = QUOTATION_FLOW_STEPS.length;

  if (row.status === "CANCELLED") {
    return {
      step: 0,
      total,
      label: STANDARD_STATUS.CANCELLED.th,
      shortLabel: STANDARD_STATUS.CANCELLED.th,
      tone: "stopped",
      tagColor: standardStatusColor("CANCELLED") as QuotationFlowState["tagColor"],
    };
  }

  // ไม่อนุมัติภายใน (ปลายทาง) — คนละอย่างกับลูกค้าปฏิเสธ
  if (row.status === "NOT_APPROVED") {
    return {
      step: 2,
      total,
      label: "ไม่อนุมัติ",
      shortLabel: "ไม่อนุมัติ",
      tone: "stopped",
      tagColor: "error",
    };
  }

  if (row.status === "REJECTED") {
    return {
      step: 3,
      total,
      label: "ลูกค้าปฏิเสธ",
      shortLabel: "ลูกค้าปฏิเสธ",
      tone: "stopped",
      tagColor: "error",
    };
  }

  if (row.salesOrderId) {
    return {
      step: 5,
      total,
      label: row.salesOrderNo
        ? `เปิด SO แล้ว (${row.salesOrderNo})`
        : "เปิด SO แล้ว",
      shortLabel: "เปิด SO แล้ว",
      tone: "done",
      tagColor: "success",
    };
  }

  if (row.status === "ACCEPTED") {
    return {
      step: 4,
      total,
      label: "ลูกค้าตอบรับแล้ว — รอเปิด SO",
      shortLabel: "รอเปิด SO",
      tone: "waiting",
      tagColor: "success",
    };
  }

  if (row.status === "SENT") {
    return {
      step: 3,
      total,
      label: "ส่งแล้ว — รอลูกค้าตอบรับ",
      shortLabel: "รอลูกค้าตอบรับ",
      tone: "waiting",
      tagColor: "processing",
    };
  }

  if (row.status === "PENDING_APPROVAL") {
    return {
      step: 2,
      total,
      label: "ส่งอนุมัติแล้ว — รอผู้อนุมัติ",
      shortLabel: "รออนุมัติ",
      tone: "waiting",
      tagColor: standardStatusColor("PENDING_APPROVAL") as QuotationFlowState["tagColor"],
    };
  }

  if (row.status === "APPROVED") {
    return {
      step: 2,
      total,
      label: "อนุมัติแล้ว — รอส่งให้ลูกค้า",
      shortLabel: "อนุมัติแล้ว",
      tone: "active",
      tagColor: "success",
    };
  }

  return {
    step: 1,
    total,
    label: STANDARD_STATUS.DRAFT.th,
    shortLabel: STANDARD_STATUS.DRAFT.th,
    tone: "active",
    tagColor: standardStatusColor("DRAFT") as QuotationFlowState["tagColor"],
  };
}

/** ป้ายสถานะสำหรับ filter dropdown (ค่า API ยังเป็น enum เดิม) */
export const QUOTATION_STATUS_FILTER_LABEL: Record<string, string> = {
  DRAFT: STANDARD_STATUS.DRAFT.th,
  PENDING_APPROVAL: STANDARD_STATUS.PENDING_APPROVAL.th,
  APPROVED: "อนุมัติแล้ว รอส่งลูกค้า",
  NOT_APPROVED: "ไม่อนุมัติ",
  SENT: "รอลูกค้าตอบรับ",
  ACCEPTED: "ลูกค้าตอบรับแล้ว",
  REJECTED: "ลูกค้าปฏิเสธ",
  CANCELLED: STANDARD_STATUS.CANCELLED.th,
};
