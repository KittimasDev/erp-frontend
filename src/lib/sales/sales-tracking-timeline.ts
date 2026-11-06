import type { SalesTrackingTimelineStep } from "@/types/sales-tracking";

import { tNow } from "@/lib/i18n/useT";
import { tSoStatus } from "@/types/sales-orders";

export type SalesTimelineStepTone = "done" | "active" | "pending" | "cancelled";

export const SALES_TRACKING_STEP_LABEL: Record<string, string> = {
  Quotation: "ใบเสนอราคา",
  "Sales Order": "ใบสั่งขาย",
  "Delivery Rounds": "รอบจัดส่ง",
  "Stock Verification": "ตรวจสอบสต๊อก",
  Picking: "ใบจ่ายสินค้า",
  Packing: "ใบบรรจุสินค้า",
  Delivery: "ใบส่งสินค้า",
  Invoice: "ใบแจ้งหนี้",
};

export function salesTrackingStepLabel(step: string) {
  const label = SALES_TRACKING_STEP_LABEL[step];
  return label ? tSoStatus(label) : step;
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
  if (!status) return tNow("รอเริ่ม");
  const map: Record<string, string> = {
    DONE: tNow("เสร็จแล้ว"),
    PENDING: tSoStatus("รอดำเนินการ"),
    DRAFT: tNow("แบบร่างเอกสาร"),
    AWAITING_CONFIRM: tNow("รอยืนยันใบสั่งขาย"),
    CONFIRMED: tNow("ยืนยันแล้ว"),
    DELIVERED: tSoStatus("ส่งแล้ว"),
    ACCEPTED: tNow("ลูกค้าตอบรับ"),
    SENT: tNow("ส่งให้ลูกค้าแล้ว"),
    CANCELLED: tSoStatus("ยกเลิก"),
    REJECTED: tSoStatus("ปฏิเสธ"),
    STOCK_CHECKED: tNow("ตรวจสต๊อกแล้ว"),
    PICKING: tNow("จ่ายสินค้าแล้ว"),
    PACKED: tNow("บรรจุแล้ว"),
    COMPLETED: tNow("เสร็จสิ้น"),
    PARTIALLY_ISSUED: tSoStatus("จ่ายบางส่วน"),
    "POSTED/UNPAID": tNow("โพสต์แล้ว / รอชำระ"),
    "POSTED/PARTIALLY_PAID": tNow("โพสต์แล้ว / ชำระบางส่วน"),
    "POSTED/PAID": tNow("โพสต์แล้ว / ชำระครบ"),
    POSTED: tNow("โพสต์แล้ว"),
    UNPAID: tNow("รอชำระ"),
    PARTIALLY_PAID: tNow("ชำระบางส่วน"),
    PAID: tNow("ชำระครบ"),
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
  if (step.step === "Sales Order") return tNow("หน้านี้");
  if (!href) return tSoStatus("รอดำเนินการ");
  if (step.documentNo) return step.documentNo;
  if (step.status === "PENDING") return tNow("เริ่มขั้นตอนนี้");
  return tNow("เปิดเอกสาร");
}
