import {
  SALES_ORDER_STATUS_LABEL,
  type SalesOrderStatus,
} from "@/types/sales-orders";

/**
 * 5 ขั้นของใบสั่งขาย: ร่าง → ยืนยัน → จ่ายสินค้า → บรรจุ → ส่งสินค้า
 *
 * **ถอดขั้น "ตรวจสต๊อก" ออกแล้ว (2026-08-26)** — ตั้งแต่แบ่งส่งหลายรอบ
 * การเช็คสต๊อกไม่ใช่ขั้นของทั้งใบอีกต่อไป แต่เกิดต่อรอบตอนคลังเปิดใบจ่าย
 * ใบเดียวมีรอบที่ส่งจบแล้วกับรอบที่ยังรอของอยู่พร้อมกันได้
 *
 * และตั้งแต่เฟส 1b ระบบ **เลิกเขียน `so.status` เป็น `PICKING`/`PACKED`/`DELIVERED`**
 * ความคืบหน้าหลังยืนยันจึงต้องอ่านจาก `so.delivery_status` ที่สรุปมาจากทุกรอบ
 */
export const SALES_ORDER_FLOW_STEPS = [
  { key: "DRAFT", label: "ร่าง", shortLabel: "ร่าง" },
  { key: "CONFIRMED", label: "ยืนยัน", shortLabel: "ยืนยัน" },
  { key: "ISSUING", label: "จ่ายสินค้า", shortLabel: "จ่าย" },
  { key: "PACKING", label: "บรรจุ", shortLabel: "บรรจุ" },
  { key: "DELIVERED", label: "ส่งสินค้า", shortLabel: "ส่ง" },
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

/** ค่าใน sales_orders.delivery_status — สรุปจากสถานะรอบทั้งหมด */
export type SalesOrderDeliveryStatus =
  | "NOT_STARTED"
  | "PARTIALLY_DELIVERED"
  | "DELIVERED";

/** map สถานะ SO → ชื่อขั้นใน timeline เอกสาร (ใช้ไฮไลต์การ์ด) */
export function resolveActiveTimelineStepName(
  status: string,
  deliveryStatus?: string,
  /**
   * สถานะรอบที่ยังไม่จบ (PLANNED / ISSUED / PACKED) — ใช้ตอนรอบเดียว
   * เพื่อชี้การ์ดคลังให้ตรงกับงานจริง ไม่ใช่แค่ delivery_status ระดับใบ
   */
  inFlightRoundStatus?: string,
): string | null {
  switch (status) {
    case "DRAFT":
    case "AWAITING_CONFIRM":
      return "Sales Order";
    case "CONFIRMED":
      // ยืนยันแล้ว = รอคลังจ่ายของตามรอบ · ไปต่อตามรอบที่ค้าง แล้วค่อย delivery_status
      if (deliveryStatus === "DELIVERED") return "Delivery";
      if (inFlightRoundStatus === "PACKED") return "Delivery";
      if (inFlightRoundStatus === "ISSUED") return "Packing";
      return "Picking";
    // สถานะเก่าของใบที่ค้างมาก่อนเปลี่ยนระบบ — ยังต้องแปลได้
    case "STOCK_CHECKED":
      return "Picking";
    case "PICKING":
    case "PARTIALLY_ISSUED":
      return "Packing";
    case "PACKED":
      return "Delivery";
    case "DELIVERED":
    case "COMPLETED":
      return "Delivery";
    default:
      return null;
  }
}

export function resolveSalesOrderProgress(
  status: string,
  deliveryStatus?: string,
  /**
   * สถานะของรอบที่คืบหน้าน้อยสุดที่ยังไม่จบ (PLANNED / ISSUED / PACKED)
   *
   * ส่งมาเมื่อผู้เรียกรู้จักรอบ (หน้ารายละเอียด SO) · ถ้าไม่ส่ง จะได้ความละเอียด
   * แค่ระดับ delivery_status เหมือนเดิม (หน้ารายการ SO ที่ยังไม่มีข้อมูลรอบ)
   *
   * ต้องมีตัวนี้ ไม่งั้นแถบค้างที่ "จ่ายสินค้า" ทั้งที่หัวเรื่องบอกว่า
   * "รอบ 1 รอส่งสินค้า" — สองที่บนหน้าเดียวกันขัดกันเอง
   */
  inFlightRoundStatus?: string,
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

  // ── ยืนยันแล้ว: ความคืบหน้ามาจาก delivery_status ไม่ใช่ so.status ───────────
  // so.status ค้างที่ CONFIRMED ตลอดอายุใบ ถ้าอ่านแค่ตัวนั้นแถบจะไม่ขยับเลย
  if (status === "CONFIRMED") {
    if (deliveryStatus === "DELIVERED") {
      return {
        current: 5,
        inProgress: 5,
        total,
        label: "ส่งครบทุกรอบแล้ว",
        currentStepLabel: "ส่งสินค้า",
        tone: "done",
      };
    }

    /*
     * PARTIALLY_DELIVERED ไม่ได้แปลว่าส่งไปแล้วบางรอบ — รอบที่แค่จ่ายของ/บรรจุ
     * ก็เข้าเงื่อนไขนี้ · ไม่เขียนว่า "ส่งแล้ว" เพื่อไม่ให้เข้าใจว่าของถึงลูกค้าแล้ว
     * (ข้อความละเอียดรายรอบมาจาก currentStep ของ backend ที่เช็ครอบ DELIVERED จริง)
     */
    const partial = deliveryStatus === "PARTIALLY_DELIVERED";
    const partialPrefix = "";

    // รู้สถานะรอบ → เดินแถบตามรอบได้จริง
    if (inFlightRoundStatus === "PACKED") {
      return {
        current: 4,
        inProgress: 5,
        total,
        label: `${partialPrefix}รอส่งสินค้า`,
        currentStepLabel: "ส่งสินค้า",
        tone: "active",
      };
    }
    if (inFlightRoundStatus === "ISSUED") {
      return {
        current: 3,
        inProgress: 4,
        total,
        label: `${partialPrefix}รอบรรจุสินค้า`,
        currentStepLabel: "บรรจุ",
        tone: "active",
      };
    }

    return {
      current: 2,
      inProgress: 3,
      total,
      label: partial
        ? "ส่งบางรอบแล้ว รอรอบที่เหลือ"
        : "รอจ่ายสินค้าตามรอบจัดส่ง",
      currentStepLabel: "จ่ายสินค้า",
      tone: "active",
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
      label: "รอจัดรอบจัดส่ง/ยืนยัน",
      currentStepLabel: "ร่าง",
    },
    AWAITING_CONFIRM: {
      current: 1,
      inProgress: 1,
      label: "รอจัดรอบให้ครบแล้วยืนยันใบสั่งขาย",
      currentStepLabel: "รอยืนยันใบสั่งขาย",
    },
    // ── สถานะเก่าของใบที่ค้างมาก่อนเปลี่ยนระบบ (2026-08-26) ─────────────────
    // ระบบไม่เขียนค่าพวกนี้อีกแล้ว แต่ใบเก่ายังมีอยู่ใน DB จึงต้องแปลได้
    STOCK_CHECKED: {
      current: 2,
      inProgress: 3,
      label: "รอจ่ายสินค้า",
      currentStepLabel: "จ่ายสินค้า",
    },
    PICKING: {
      current: 3,
      inProgress: 4,
      label: "รอบรรจุสินค้า",
      currentStepLabel: "บรรจุ",
    },
    PARTIALLY_ISSUED: {
      current: 3,
      inProgress: 4,
      label: "รอบรรจุสินค้า",
      currentStepLabel: "บรรจุ",
    },
    PACKED: {
      current: 4,
      inProgress: 5,
      label: "รอส่งสินค้า",
      currentStepLabel: "ส่งสินค้า",
    },
    DELIVERED: {
      current: 5,
      inProgress: 5,
      label: "ส่งสินค้าสำเร็จ",
      currentStepLabel: "ส่งสินค้า",
    },
    COMPLETED: {
      current: 5,
      inProgress: 5,
      label: "ส่งสินค้าสำเร็จ",
      currentStepLabel: "ส่งสินค้า",
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

type CanCancelSalesOrderInput = {
  status: string;
  deliveryStatus?: string;
  items?: Array<{ issuedQuantity?: string | number }>;
  rounds?: Array<{ roundStatus?: string }>;
};

/** สอดคล้อง backend cancel() — ซ่อนปุ่มเมื่อ fulfillment เริ่มหรือส่งครบแล้ว */
export function canCancelSalesOrder({
  status,
  deliveryStatus,
  items = [],
  rounds = [],
}: CanCancelSalesOrderInput): boolean {
  if (status === "DRAFT" || status === "AWAITING_CONFIRM") {
    return true;
  }
  if (status !== "CONFIRMED") {
    return false;
  }
  if (deliveryStatus === "DELIVERED" || deliveryStatus === "PARTIALLY_DELIVERED") {
    return false;
  }
  if (items.some((item) => Number(item.issuedQuantity) > 0)) {
    return false;
  }
  if (
    rounds.some(
      (round) =>
        round.roundStatus !== "PLANNED" && round.roundStatus !== "CANCELLED",
    )
  ) {
    return false;
  }
  return deliveryStatus === "NOT_STARTED" || deliveryStatus === undefined;
}
