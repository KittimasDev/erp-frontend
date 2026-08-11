import {
  SALES_ORDER_STATUS_LABEL,
  type SalesOrderStatus,
} from "@/types/sales-orders";

/** 7 ขั้นของใบสั่งขาย: ร่าง → ยืนยัน → ตรวจสต๊อก → จ่าย → บรรจุ → ส่ง → เสร็จสิ้น */
export const SALES_ORDER_FLOW_STEPS = [
  { key: "DRAFT", label: "ร่าง", shortLabel: "ร่าง" },
  { key: "CONFIRMED", label: "ยืนยัน", shortLabel: "ยืนยัน" },
  { key: "STOCK_CHECKED", label: "ตรวจสต๊อก", shortLabel: "ตรวจสต๊อก" },
  { key: "PICKING", label: "จ่ายสินค้า", shortLabel: "จ่าย" },
  { key: "PACKED", label: "บรรจุ", shortLabel: "บรรจุ" },
  { key: "DELIVERED", label: "ส่งสินค้า", shortLabel: "ส่ง" },
  { key: "COMPLETED", label: "เสร็จสิ้น", shortLabel: "เสร็จ" },
] as const;

export type SalesOrderProgress = {
  /** จำนวนขั้นที่ทำเสร็จแล้ว */
  current: number;
  /** ขั้นที่กำลังดำเนินการอยู่ */
  inProgress: number;
  total: number;
  label: string;
  /** ชื่อขั้นปัจจุบัน (เช่น จ่ายสินค้า) */
  currentStepLabel: string;
  tone: "active" | "done" | "stopped";
};

/** map สถานะ SO → ชื่อขั้นใน timeline เอกสาร (ใช้ไฮไลต์การ์ด) */
export function resolveActiveTimelineStepName(status: string): string | null {
  switch (status) {
    case "DRAFT":
      return "Sales Order";
    case "CONFIRMED":
      return "Stock Verification";
    case "STOCK_CHECKED":
      return "Picking";
    case "PICKING":
    case "PARTIALLY_ISSUED":
      return "Packing";
    case "PACKED":
      return "Delivery";
    case "DELIVERED":
    case "COMPLETED":
      return "Invoice";
    default:
      return null;
  }
}

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
      currentStepLabel: "ยกเลิก",
      tone: "stopped",
    };
  }

  /** label = สิ่งที่ต้องทำถัดไป (สอดคล้อง sales-tracking mapStep) */
  const byStatus: Record<
    string,
    {
      current: number;
      inProgress: number;
      label: string;
      currentStepLabel: string;
    }
  > = {
    DRAFT: {
      current: 1,
      inProgress: 1,
      label: "รอยืนยันใบสั่งขาย",
      currentStepLabel: "ร่าง",
    },
    CONFIRMED: {
      current: 2,
      inProgress: 3,
      label: "รอตรวจสต๊อก",
      currentStepLabel: "ตรวจสต๊อก",
    },
    STOCK_CHECKED: {
      current: 3,
      inProgress: 4,
      label: "รอจ่ายสินค้า",
      currentStepLabel: "จ่ายสินค้า",
    },
    PICKING: {
      current: 4,
      inProgress: 5,
      label: "รอบรรจุสินค้า",
      currentStepLabel: "บรรจุ",
    },
    PARTIALLY_ISSUED: {
      current: 4,
      inProgress: 5,
      label: "รอบรรจุสินค้า",
      currentStepLabel: "บรรจุ",
    },
    PACKED: {
      current: 5,
      inProgress: 6,
      label: "รอส่งสินค้า",
      currentStepLabel: "ส่งสินค้า",
    },
    DELIVERED: {
      current: 6,
      inProgress: 7,
      label: "รอแจ้งหนี้/ชำระ",
      currentStepLabel: "แจ้งหนี้",
    },
    COMPLETED: {
      current: 7,
      inProgress: 7,
      label: "เสร็จสิ้น",
      currentStepLabel: "เสร็จสิ้น",
    },
  };

  const hit = byStatus[status];
  if (hit) {
    return {
      current: hit.current,
      inProgress: hit.inProgress,
      total,
      label: hit.label,
      currentStepLabel: hit.currentStepLabel,
      tone: hit.current >= total ? "done" : "active",
    };
  }

  return {
    current: 1,
    inProgress: 1,
    total,
    label: SALES_ORDER_STATUS_LABEL[status as SalesOrderStatus] ?? status,
    currentStepLabel:
      SALES_ORDER_STATUS_LABEL[status as SalesOrderStatus] ?? status,
    tone: "active",
  };
}
