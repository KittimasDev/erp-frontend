/**
 * รอบจัดส่งของใบสั่งขาย — 1 SO แบ่งส่งได้หลายรอบคนละวัน
 *
 * จำนวน/ราคาของจริงอยู่ที่บรรทัดรอบ ไม่ใช่บรรทัด SO
 * (`sales_order_items.quantity` เป็นจำนวนที่ตกลงขาย = สัญญา)
 */
export type DeliveryScheduleStatus =
  | "PLANNED"
  | "ISSUED"
  | "PACKED"
  | "DELIVERED"
  | "CANCELLED";

export const DELIVERY_SCHEDULE_STATUS_LABEL: Record<
  DeliveryScheduleStatus,
  string
> = {
  PLANNED: "รอจ่ายของ",
  ISSUED: "จ่ายของแล้ว",
  PACKED: "บรรจุแล้ว",
  DELIVERED: "ส่งแล้ว",
  CANCELLED: "ยกเลิก",
};

export const DELIVERY_SCHEDULE_STATUS_COLOR: Record<
  DeliveryScheduleStatus,
  string
> = {
  PLANNED: "default",
  ISSUED: "processing",
  PACKED: "cyan",
  DELIVERED: "success",
  CANCELLED: "error",
};

/** แก้ไข/ยกเลิกรอบได้เฉพาะตอนยังไม่จ่ายของ */
export function isDeliveryScheduleEditable(status: string): boolean {
  return status === "PLANNED";
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
  sortOrder: number;
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

export type CancelDeliveryScheduleBody = {
  reason?: string;
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
