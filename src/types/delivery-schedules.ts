/**
 * รอบจัดส่งของใบสั่งขาย — 1 SO แบ่งส่งได้หลายรอบคนละวัน
 *
 * จำนวน/ราคาของจริงอยู่ที่บรรทัดรอบ ไม่ใช่บรรทัด SO
 * (`sales_order_items.quantity` เป็นจำนวนที่ตกลงขาย = สัญญา)
 *
 * **ยกเลิกรอบของใบที่ยืนยันแล้วจะลดสัญญาและยอดเงินลงตามรอบนั้น** — หน้าจอต้องบอก
 * ผู้ใช้ล่วงหน้าก่อนกด ไม่ใช่ให้ไปเห็นยอดเปลี่ยนเองทีหลัง
 */
export type DeliveryScheduleStatus =
  | "PLANNED"
  | "ISSUED"
  | "PACKED"
  | "DELIVERED"
  /** ส่งแล้วแต่ลูกค้าตีกลับบางส่วน — จบรอบเหมือน DELIVERED */
  | "PARTIALLY_DELIVERED"
  | "CANCELLED";

import { getStoredLanguage, type Language } from "@/lib/i18n/language";
import {
  STANDARD_STATUS,
  standardStatusColor,
  standardStatusLabel,
} from "@/lib/status/standard-status";
import { tSoStatus } from "@/types/sales-orders";

export const DELIVERY_SCHEDULE_STATUS_LABEL: Record<
  DeliveryScheduleStatus,
  string
> = {
  PLANNED: "รอจ่ายของ",
  ISSUED: "จ่ายของแล้ว",
  PACKED: "บรรจุแล้ว",
  DELIVERED: STANDARD_STATUS.DELIVERED.th,
  PARTIALLY_DELIVERED: "ส่งบางส่วน",
  CANCELLED: STANDARD_STATUS.CANCELLED.th,
};

export const DELIVERY_SCHEDULE_STATUS_COLOR: Record<
  DeliveryScheduleStatus,
  string
> = {
  PLANNED: "default",
  ISSUED: "processing",
  PACKED: "cyan",
  DELIVERED: standardStatusColor("DELIVERED"),
  PARTIALLY_DELIVERED: "warning",
  CANCELLED: standardStatusColor("CANCELLED"),
};

/** ป้ายสถานะรอบตามภาษา — "ส่งแล้ว"/"ยกเลิก" ใช้ชื่อมาตรฐานกลาง */
export function deliveryScheduleStatusLabel(status: string, lang?: Language): string {
  const l = lang ?? getStoredLanguage();
  if (status === "DELIVERED") return standardStatusLabel("DELIVERED", l);
  if (status === "CANCELLED") return standardStatusLabel("CANCELLED", l);
  return tSoStatus(DELIVERY_SCHEDULE_STATUS_LABEL[status as DeliveryScheduleStatus] ?? status, l);
}

export function deliveryScheduleStatusColor(status: string): string {
  return DELIVERY_SCHEDULE_STATUS_COLOR[status as DeliveryScheduleStatus] ?? "default";
}

/** รอบที่ส่งถึงลูกค้าแล้ว (ครบหรือตีกลับบางส่วน) — ต้องตรงกับ isScheduleDeliveredStatus ฝั่ง backend */
export function isDeliveryScheduleDone(status: string | undefined): boolean {
  return status === "DELIVERED" || status === "PARTIALLY_DELIVERED";
}

/** แก้ไข/ยกเลิกรอบได้เฉพาะตอนยังไม่จ่ายของ */
export function isDeliveryScheduleEditable(status: string): boolean {
  return status === "PLANNED";
}

/**
 * เลื่อนกำหนดส่งได้จนก่อนส่งจบ — กว้างกว่า isDeliveryScheduleEditable โดยเจตนา
 *
 * เลื่อนวันไม่แตะจำนวนหรือยอดเงิน ของยังอยู่ครบเหมือนเดิม จึงทำได้แม้คลังจ่ายของ
 * หรือบรรจุไปแล้ว · ส่งถึงลูกค้าแล้วหรือยกเลิกแล้วเท่านั้นที่เลื่อนไม่ได้
 * (ต้องตรงกับ RESCHEDULABLE_STATUSES ฝั่ง backend)
 */
export function isDeliveryScheduleReschedulable(status: string): boolean {
  return status === "PLANNED" || status === "ISSUED" || status === "PACKED";
}

export type DeliveryScheduleItem = {
  id: string;
  salesOrderItemId: string;
  itemId: string;
  itemCode?: string;
  itemNameTh?: string;
  description?: string;
  unitId: string;
  unitCode?: string;
  quantity: string;
  unitPrice: string;
  discountAmount: string;
  amount: string;
  /** จองไว้ให้รอบนี้แล้วเท่าไร — ใบอื่นแย่งไม่ได้ */
  reservedQuantity: string;
  issuedQuantity: string;
  packedQuantity: string;
  deliveredQuantity: string;
  remainingQuantity: string;
  /** ลูกค้าตีกลับในรอบนี้เท่าไร (ประวัติ) — ถูกหักออกจาก `quantity` แล้ว ยกเว้นส่วนที่ปิดการส่ง */
  returnedQuantity?: string;
  /** ตีกลับแล้วปิดการส่ง (ไม่นำเข้าคลัง + ไม่ส่งใหม่) — ยังอยู่ใน `quantity` แต่ไม่ค้างส่ง */
  closedQuantity?: string;
  /** จำนวนเดิมของรอบ = quantity + returnedQuantity − closedQuantity · ใช้แสดงผลเท่านั้น ห้ามใช้วางแผนจำนวน */
  originalQuantity?: string;
  sortOrder: number;
};

export type DeliveryScheduleReturnResult = "FULL_RETURN" | "PARTIAL_RETURN";

export const DELIVERY_SCHEDULE_RETURN_LABEL: Record<
  DeliveryScheduleReturnResult,
  string
> = {
  FULL_RETURN: "ถูกตีกลับทั้งหมด",
  PARTIAL_RETURN: "ถูกตีกลับบางส่วน",
};

/** ผลการตีกลับของรอบ — มาจากใบส่งสินค้าของรอบนั้น */
export type DeliveryScheduleReturnInfo = {
  deliveryOrderId: string;
  deliveryOrderNo: string;
  result: DeliveryScheduleReturnResult | string;
  returnReason?: string;
  /** false + ไม่ส่งใหม่ = จำนวนที่ตีกลับค้างส่งใน SO (ไม่ลดจำนวนสั่ง) */
  returnToStock?: boolean;
  /** ไม่มีค่าคือไม่ส่งใหม่ (นำเข้าคลัง = ลดจำนวนสั่ง · ไม่นำเข้าคลัง = ค้างส่ง) */
  redeliveryScheduleId?: string;
  redeliveryRoundNo?: number;
};

export type DeliverySchedule = {
  id: string;
  salesOrderId: string;
  soNo?: string;
  roundNo: number;
  deliveryDate: string;
  status: DeliveryScheduleStatus | string;
  remark?: string;
  cancelledReason?: string;
  issuedAt?: string;
  packedAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
  /** วันส่งที่ตกลงไว้ครั้งแรก — ไม่มีค่าคือยังไม่เคยเลื่อน */
  originalDeliveryDate?: string;
  /** เลื่อนกำหนดส่งมากี่ครั้ง — มากกว่า 0 ให้ขึ้นป้ายเตือนบนหัวรอบ */
  rescheduledCount?: number;
  lastRescheduledAt?: string;
  lastRescheduleReason?: string;
  sourceDeliveryOrderId?: string;
  /** มีค่าเมื่อรอบนี้ถูกลูกค้าตีกลับ — หัวรอบต้องขึ้นป้ายสีแดง */
  deliveryReturn?: DeliveryScheduleReturnInfo;
  /** เลขรุ่นกันบันทึกทับกันของรอบนี้ — แยกจากของใบสั่งขาย */
  editVersion: number;
  items: DeliveryScheduleItem[];
};

export type DeliveryScheduleStockLine = {
  salesOrderItemId: string;
  deliveryScheduleItemId: string;
  itemId: string;
  itemCode?: string;
  itemNameTh?: string;
  unitCode?: string;
  requiredQuantity: string;
  availableQuantity: string;
  shortageQuantity: string;
  alreadyRequestedQuantity: string;
  productionNeededQuantity: string;
};

export type DeliveryScheduleStockStatus = {
  deliveryScheduleId: string;
  /** READY = ครบทั้งรอบ · PARTIAL = มีบางส่วน · SHORT = ไม่มีเลย */
  stockStatus: "READY" | "PARTIAL" | "SHORT";
  /** ของครบทั้งรอบไหม — กฎ 1 รอบต้องจ่ายครบ ไม่จ่ายบางส่วน */
  canIssue: boolean;
  lines: DeliveryScheduleStockLine[];
};

export type UpsertDeliveryScheduleItemBody = {
  salesOrderItemId: string;
  quantity: number;
  unitPrice?: number;
  discountAmount?: number;
  description?: string;
};

export type CreateDeliveryScheduleBody = {
  deliveryDate: string;
  remark?: string;
  items: UpsertDeliveryScheduleItemBody[];
};

export type UpdateDeliveryScheduleBody = {
  deliveryDate?: string;
  remark?: string;
  items?: UpsertDeliveryScheduleItemBody[];
};

export type RescheduleDeliveryScheduleBody = {
  deliveryDate: string;
  /** บังคับ — เป็นหลักฐานเวลาฝ่ายขายกับคลังเถียงกันว่าเลื่อนเพราะอะไร */
  reason: string;
  /** ขยับวันบนเอกสารของรอบที่ยังเป็นร่างด้วย (default true ฝั่ง backend) */
  cascadeToDocuments?: boolean;
};

export type CancelDeliveryScheduleBody = {
  /** บังคับ — การยกเลิกรอบลดจำนวนและยอดเงินของใบสั่งขาย ต้องรู้ว่าเพราะอะไร */
  reason: string;
  /** ยืนยันว่าตรวจใบแจ้งหนี้ของใบสั่งขายนี้แล้ว (ใบแจ้งหนี้ไม่ผูกรอบ) */
  acknowledgeInvoice?: boolean;
};

export type DeliveryScheduleApiResponse = {
  statusCode?: number;
  message: string;
  data: DeliverySchedule;
};

export type DeliveryScheduleListApiResponse = {
  statusCode?: number;
  message: string;
  data: DeliverySchedule[];
};

export type DeliveryScheduleStockStatusApiResponse = {
  statusCode?: number;
  message: string;
  data: DeliveryScheduleStockStatus;
};
