import {
  SALES_ORDER_STATUS_LABEL,
  type SalesOrderStatus,
} from "@/types/sales-orders";

/** 7 ขั้นของใบสั่งขาย: ร่าง → ยืนยัน → ตรวจสต๊อก → จ่าย → บรรจุ → ส่ง → เสร็จสิ้น */
export const SALES_ORDER_FLOW_STEPS = [
  { key: "DRAFT", label: "ร่าง" },
  { key: "CONFIRMED", label: "ยืนยัน" },
  { key: "STOCK_CHECKED", label: "ตรวจสต๊อก" },
  { key: "PICKING", label: "จ่ายสินค้า" },
  { key: "PACKED", label: "บรรจุ" },
  { key: "DELIVERED", label: "ส่งสินค้า" },
  { key: "COMPLETED", label: "เสร็จสิ้น" },
] as const;

export type SalesOrderProgress = {
  /** จำนวนขั้นที่ทำเสร็จแล้ว */
  current: number;
  /** ขั้นที่กำลังดำเนินการอยู่ */
  inProgress: number;
  total: number;
  label: string;
  tone: "active" | "done" | "stopped";
};

export function resolveSalesOrderProgress(
  status: string,
): SalesOrderProgress {
  const total = SALES_ORDER_FLOW_STEPS.length;

  if (status === "CANCELLED") {
    return {
      current: 0,
      inProgress: 0,
      total,
      label: "ยกเลิก",
      tone: "stopped",
    };
  }

  /** label = สิ่งที่ต้องทำถัดไป (สอดคล้อง sales-tracking mapStep) */
  const byStatus: Record<
    string,
    { current: number; inProgress: number; label: string }
  > = {
    DRAFT: { current: 1, inProgress: 1, label: "รอยืนยันใบสั่งขาย" },
    CONFIRMED: { current: 2, inProgress: 3, label: "รอตรวจสต๊อก" },
    STOCK_CHECKED: { current: 3, inProgress: 4, label: "รอจ่ายสินค้า" },
    PICKING: { current: 4, inProgress: 5, label: "รอบรรจุสินค้า" },
    PARTIALLY_ISSUED: { current: 4, inProgress: 5, label: "รอบรรจุสินค้า" },
    PACKED: { current: 5, inProgress: 6, label: "รอส่งสินค้า" },
    DELIVERED: { current: 6, inProgress: 7, label: "รอแจ้งหนี้/ชำระ" },
    COMPLETED: { current: 7, inProgress: 7, label: "เสร็จสิ้น" },
  };

  const hit = byStatus[status];
  if (hit) {
    return {
      current: hit.current,
      inProgress: hit.inProgress,
      total,
      label: hit.label,
      tone: hit.current >= total ? "done" : "active",
    };
  }

  return {
    current: 1,
    inProgress: 1,
    total,
    label: SALES_ORDER_STATUS_LABEL[status as SalesOrderStatus] ?? status,
    tone: "active",
  };
}
