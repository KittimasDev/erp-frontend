import type { SalesTrackingTimelineStep } from "@/types/sales-tracking";

export type SalesTimelineStepTone = "done" | "active" | "pending" | "cancelled";

export const SALES_TRACKING_STEP_LABEL: Record<string, string> = {
  Quotation: "ใบเสนอราคา",
  "Sales Order": "ใบสั่งขาย",
  "Stock Verification": "ตรวจสอบสต๊อก",
  Picking: "ใบจ่ายสินค้า",
  Packing: "ใบบรรจุสินค้า",
  Delivery: "ใบส่งสินค้า",
  Invoice: "ใบแจ้งหนี้",
};

export function salesTrackingStepLabel(step: string) {
  return SALES_TRACKING_STEP_LABEL[step] ?? step;
}

export function resolveSalesTimelineStepTone(
  step: SalesTrackingTimelineStep,
): SalesTimelineStepTone {
  const status = (step.status ?? "").toUpperCase();

  if (["CANCELLED", "REJECTED", "EXPIRED"].includes(status)) {
    return "cancelled";
  }

  if (
    ["DONE", "DELIVERED", "ACCEPTED", "COMPLETED", "PARTIALLY_ISSUED"].includes(
      status,
    ) ||
    status.endsWith("/PAID") ||
    status === "PAID"
  ) {
    return "done";
  }

  if (status.endsWith("/PARTIALLY_PAID") || status.endsWith("/UNPAID")) {
    return "active";
  }

  if (status === "CONFIRMED") {
    return step.step === "Delivery" ? "active" : "done";
  }

  if (["STOCK_CHECKED", "PICKING", "PACKED", "POSTED"].includes(status)) {
    return "done";
  }

  if (["PENDING", "DRAFT", "AWAITING_CONFIRM", "SENT"].includes(status)) {
    return "active";
  }

  return "pending";
}

export function salesTimelineStatusLabel(status?: string) {
  if (!status) return "รอเริ่ม";
  const map: Record<string, string> = {
    DONE: "เสร็จแล้ว",
    PENDING: "รอดำเนินการ",
    DRAFT: "ร่าง",
    AWAITING_CONFIRM: "รอยืนยันใบสั่งขาย",
    CONFIRMED: "ยืนยันแล้ว",
    DELIVERED: "ส่งแล้ว",
    ACCEPTED: "ลูกค้าตอบรับ",
    SENT: "ส่งให้ลูกค้าแล้ว",
    CANCELLED: "ยกเลิก",
    REJECTED: "ปฏิเสธ",
    STOCK_CHECKED: "ตรวจสต๊อกแล้ว",
    PICKING: "จ่ายสินค้าแล้ว",
    PACKED: "บรรจุแล้ว",
    COMPLETED: "เสร็จสิ้น",
    PARTIALLY_ISSUED: "จ่ายบางส่วน",
    "POSTED/UNPAID": "โพสต์แล้ว / รอชำระ",
    "POSTED/PARTIALLY_PAID": "โพสต์แล้ว / ชำระบางส่วน",
    "POSTED/PAID": "โพสต์แล้ว / ชำระครบ",
    POSTED: "โพสต์แล้ว",
    UNPAID: "รอชำระ",
    PARTIALLY_PAID: "ชำระบางส่วน",
    PAID: "ชำระครบ",
  };
  return map[status.toUpperCase()] ?? status;
}

export function salesTimelineToneTagColor(tone: SalesTimelineStepTone): string {
  if (tone === "done") return "success";
  if (tone === "active") return "processing";
  if (tone === "cancelled") return "error";
  return "default";
}

/** ลิงก์ไปหน้าที่เกี่ยวข้อง — รวม fallback เมื่อยังไม่มีเอกสาร */
export function resolveTimelineStepHref(
  step: SalesTrackingTimelineStep,
  salesOrderId: string,
  timeline: SalesTrackingTimelineStep[],
): string | undefined {
  if (step.step === "Sales Order") return undefined;

  if (step.href) {
    if (step.step === "Picking" && step.status === "DRAFT" && step.documentId) {
      return `/pickings/${step.documentId}/edit`;
    }
    if (step.step === "Packing" && step.status === "DRAFT" && step.documentId) {
      return `/packings/${step.documentId}/edit`;
    }
    return step.href;
  }

  const picking = timeline.find((entry) => entry.step === "Picking");
  const packing = timeline.find((entry) => entry.step === "Packing");

  switch (step.step) {
    case "Stock Verification":
      // ดูผลตรวจย้อนหลังได้เสมอ แต่ไม่ใช่จุดเริ่มสร้างใบจ่าย
      return `/sales-orders/${salesOrderId}/stock-verification`;
    case "Picking":
      if (picking?.documentId) {
        return picking.status === "DRAFT"
          ? `/pickings/${picking.documentId}/edit`
          : `/pickings/${picking.documentId}`;
      }
      // สร้างได้เฉพาะเมื่อยังไม่มีเอกสาร picking
      return `/pickings/create-from-sales-order/${salesOrderId}`;
    case "Packing":
      if (picking?.documentId && picking.status === "CONFIRMED") {
        return `/packings/create-from-picking/${picking.documentId}`;
      }
      return undefined;
    case "Delivery":
      if (packing?.documentId && packing.status === "CONFIRMED") {
        return `/delivery-orders/create-from-packing/${packing.documentId}`;
      }
      return undefined;
    case "Invoice":
      // Sales flow จบที่ Delivery — ไม่สร้างลิงก์ใบแจ้งหนี้จาก timeline
      return undefined;
    default:
      return undefined;
  }
}

export function timelineStepActionLabel(
  step: SalesTrackingTimelineStep,
  href?: string,
): string {
  if (step.step === "Sales Order") return "หน้านี้";
  if (!href) return "รอดำเนินการ";
  if (step.documentNo) return step.documentNo;
  if (step.status === "PENDING") return "เริ่มขั้นตอนนี้";
  return "เปิดเอกสาร";
}
