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
  current: number;
  total: number;
  label: string;
  tone: "active" | "done" | "stopped";
};

export function resolveSalesOrderProgress(
  status: string,
): SalesOrderProgress {
  const total = SALES_ORDER_FLOW_STEPS.length;

  if (status === "CANCELLED") {
    return { current: 0, total, label: "ยกเลิก", tone: "stopped" };
  }

  const byStatus: Record<string, { current: number; label: string }> = {
    DRAFT: { current: 1, label: "ร่าง" },
    CONFIRMED: { current: 2, label: "ยืนยันแล้ว" },
    STOCK_CHECKED: { current: 3, label: "ตรวจสต๊อกแล้ว" },
    PICKING: { current: 4, label: "จ่ายสินค้าแล้ว" },
    PARTIALLY_ISSUED: { current: 4, label: "จ่ายสินค้าบางส่วน" },
    PACKED: { current: 5, label: "บรรจุแล้ว" },
    DELIVERED: { current: 6, label: "ส่งแล้ว · รอแจ้งหนี้/ชำระ" },
    COMPLETED: { current: 7, label: "เสร็จสิ้น" },
  };

  const hit = byStatus[status];
  if (hit) {
    return {
      current: hit.current,
      total,
      label: hit.label,
      tone: hit.current >= total ? "done" : "active",
    };
  }

  return {
    current: 1,
    total,
    label: SALES_ORDER_STATUS_LABEL[status as SalesOrderStatus] ?? status,
    tone: "active",
  };
}
