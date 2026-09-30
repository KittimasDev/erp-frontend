export type PoDeliveryReceiveStatus =
  | "NOT_RECEIVED"
  | "PARTIALLY_RECEIVED"
  | "FULLY_RECEIVED"
  | "CLOSED_PARTIAL"
  | "CANCELLED"
  | string;

export const PO_DELIVERY_RECEIVE_STATUS_LABEL: Record<string, string> = {
  NOT_RECEIVED: "ยังไม่รับสินค้า",
  PARTIALLY_RECEIVED: "รับสินค้าบางส่วน",
  FULLY_RECEIVED: "รับสินค้าทั้งหมด",
  CLOSED_PARTIAL: "ปิดการรับบางส่วน",
  CANCELLED: "ยกเลิกการรับ",
};

export const PO_DELIVERY_RECEIVE_STATUS_COLOR: Record<string, string> = {
  NOT_RECEIVED: "default",
  PARTIALLY_RECEIVED: "processing",
  FULLY_RECEIVED: "success",
  CLOSED_PARTIAL: "warning",
  CANCELLED: "error",
};

export type PoDeliveryScheduleItem = {
  id: string;
  purchaseOrderItemId: string;
  itemId: string;
  itemCode?: string;
  itemNameTh?: string;
  unitId: string;
  unitCode?: string;
  quantity: string;
  receivedQuantity: string;
  cancelledQuantity: string;
  remainingQuantity: string;
  sortOrder: number;
};

export type PoDeliveryScheduleReschedule = {
  id: string;
  fromDate: string;
  toDate: string;
  reason: string;
  attachmentId?: string;
  createdByName?: string;
  createdAt: string;
};

export type PoDeliverySchedule = {
  id: string;
  purchaseOrderId: string;
  roundNo: number;
  deliveryDate: string;
  effectiveDeliveryDate: string;
  originalDeliveryDate?: string;
  status: PoDeliveryReceiveStatus;
  receiveStatus: PoDeliveryReceiveStatus;
  isLate: boolean;
  latestActualReceiveDate?: string;
  remark?: string;
  cancelledReason?: string;
  cancelledAt?: string;
  items: PoDeliveryScheduleItem[];
  reschedules: PoDeliveryScheduleReschedule[];
};

export type PoDeliveryScheduleListResponse = {
  message: string;
  data: PoDeliverySchedule[];
};

export type PoDeliveryScheduleResponse = {
  message: string;
  data: PoDeliverySchedule;
};

export type UpsertPoDeliveryScheduleItemBody = {
  purchaseOrderItemId: string;
  quantity: number;
};

export type CreatePoDeliveryScheduleBody = {
  deliveryDate: string;
  remark?: string;
  items: UpsertPoDeliveryScheduleItemBody[];
};

export type CreatePoScheduleFromPrLine = {
  purchaseRequestItemId: string;
  quantity: number;
};

export type CreatePoScheduleFromPr = {
  deliveryDate: string;
  remark?: string;
  items: CreatePoScheduleFromPrLine[];
};

export type ReschedulePoDeliveryBody = {
  newDate: string;
  reason: string;
  attachmentId?: string;
};

export type CancelPoReceivingBody = {
  reason: string;
};

export function isPoScheduleOpen(status: string) {
  return status === "NOT_RECEIVED" || status === "PARTIALLY_RECEIVED";
}

export function canCancelPoRoundReceiving(schedule: PoDeliverySchedule) {
  const received = schedule.items.reduce(
    (sum, item) => sum + Number(item.receivedQuantity || 0),
    0,
  );
  return isPoScheduleOpen(schedule.status) && received <= 0.0005;
}

export function canClosePoRoundRemaining(schedule: PoDeliverySchedule) {
  const received = schedule.items.reduce(
    (sum, item) => sum + Number(item.receivedQuantity || 0),
    0,
  );
  const remaining = schedule.items.reduce(
    (sum, item) => sum + Number(item.remainingQuantity || 0),
    0,
  );
  return isPoScheduleOpen(schedule.status) && received > 0.0005 && remaining > 0.0005;
}

export function receiveTimingLabel(
  actualDate: string | undefined,
  effectiveDate: string,
) {
  if (!actualDate) {
    return null;
  }
  if (actualDate < effectiveDate) {
    return "รับก่อนวันส่งของ";
  }
  if (actualDate === effectiveDate) {
    return "รับสินค้าตามกำหนด";
  }
  return "รับสินค้าล่าช้า";
}
