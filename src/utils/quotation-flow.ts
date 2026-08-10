import type { Quotation } from "@/types/quotations";

/** 4 ขั้นตอน QT → SO (ตรงกับหน้ารายละเอียด) */
export const QUOTATION_FLOW_STEPS = [
  { key: "DRAFT", label: "ร่าง" },
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
      label: "ยกเลิก",
      shortLabel: "ยกเลิก",
      tone: "stopped",
      tagColor: "default",
    };
  }

  if (row.status === "REJECTED") {
    return {
      step: 2,
      total,
      label: "ลูกค้าปฏิเสธ",
      shortLabel: "ลูกค้าปฏิเสธ",
      tone: "stopped",
      tagColor: "error",
    };
  }

  if (row.salesOrderId) {
    return {
      step: 4,
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
      step: 3,
      total,
      label: "ลูกค้าตอบรับแล้ว — รอเปิด SO",
      shortLabel: "รอเปิด SO",
      tone: "waiting",
      tagColor: "success",
    };
  }

  if (row.status === "SENT") {
    return {
      step: 2,
      total,
      label: "ส่งแล้ว — รอลูกค้าตอบรับ",
      shortLabel: "รอลูกค้าตอบรับ",
      tone: "waiting",
      tagColor: "processing",
    };
  }

  return {
    step: 1,
    total,
    label: "ร่าง",
    shortLabel: "ร่าง",
    tone: "active",
    tagColor: "warning",
  };
}

/** ป้ายสถานะสำหรับ filter dropdown (ค่า API ยังเป็น enum เดิม) */
export const QUOTATION_STATUS_FILTER_LABEL: Record<string, string> = {
  DRAFT: "ร่าง",
  SENT: "รอลูกค้าตอบรับ",
  ACCEPTED: "ลูกค้าตอบรับแล้ว",
  REJECTED: "ลูกค้าปฏิเสธ",
  CANCELLED: "ยกเลิก",
};
