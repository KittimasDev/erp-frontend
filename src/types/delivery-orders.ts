export type DeliveryOrderStatus =
  | "DRAFT"
  | "CONFIRMED"
  | "DELIVERED"
  | "CANCELLED";

export const DELIVERY_ORDER_STATUS_LABEL: Record<DeliveryOrderStatus, string> = {
  DRAFT: "แบบร่างเอกสาร",
  CONFIRMED: "ยืนยันแล้ว",
  DELIVERED: "ส่งแล้ว",
  CANCELLED: "ยกเลิก",
};

export type DeliveryResult = "SUCCESS" | "FULL_RETURN" | "PARTIAL_RETURN";

export const DELIVERY_RESULT_LABEL: Record<DeliveryResult, string> = {
  SUCCESS: "ส่งสำเร็จ",
  FULL_RETURN: "ตีกลับทั้งหมด",
  PARTIAL_RETURN: "ตีกลับบางส่วน",
};

export const DELIVERY_RESULT_COLOR: Record<DeliveryResult, string> = {
  SUCCESS: "success",
  FULL_RETURN: "error",
  PARTIAL_RETURN: "warning",
};

export type DeliveryOrderItem = {
  id: string;
  salesOrderItemId: string;
  itemId: string;
  itemCode?: string;
  itemNameTh?: string;
  deliveredQty: string;
  acceptedQty?: string;
  returnedQty?: string;
  pickingItemId?: string;
  unitId: string;
  unitCode?: string;
  remark?: string;
  sortOrder: number;
};

export type DeliveryOrder = {
  id: string;
  deliveryOrderNo: string;
  packingId: string;
  packingNo?: string;
  pickingId: string;
  pickingNo?: string;
  salesOrderId: string;
  salesOrderNo?: string;
  customerId: string;
  customerName?: string;
  deliveryDate: string;
  shippingAddress?: string;
  contactName?: string;
  contactPhone?: string;
  carrierName?: string;
  vehiclePlate?: string;
  driverName?: string;
  driverPhone?: string;
  status: DeliveryOrderStatus | string;
  remark?: string;
  confirmedAt?: string;
  deliveredAt?: string;
  salesOrderDeliveryScheduleId?: string;
  roundNo?: number;
  deliveryResult?: DeliveryResult | string;
  returnReason?: string;
  returnToStock?: boolean;
  redeliverRequired?: boolean;
  redeliverDate?: string;
  redeliveryScheduleId?: string;
  redeliveryRoundNo?: number;
  /** ใบคืนสินค้าของใบส่งนี้ (รออนุมัติ/อนุมัติแล้ว ล่าสุด) — มีเฉพาะ GET /:id และผลของ deliver */
  returnNoteId?: string;
  returnNoteNo?: string;
  /** มีค่า = ใบนี้เป็นการส่งซ้ำของใบที่ถูกตีกลับ (ไม่จ่าย/บรรจุใหม่ ไม่ตัดสต๊อกซ้ำ) */
  sourceDeliveryOrderId?: string;
  sourceDeliveryOrderNo?: string;
  /** ใบส่งซ้ำที่ระบบสร้างจากใบนี้ — มีเฉพาะ GET /:id และผลของ deliver */
  redeliveryDeliveryOrderId?: string;
  redeliveryDeliveryOrderNo?: string;
  deliveredByName?: string;
  items: DeliveryOrderItem[];
  createdAt: string;
  updatedAt: string;
};

export type ReadyPacking = {
  id: string;
  packingNo: string;
  packingDate: string;
  salesOrderId: string;
  salesOrderNo?: string;
  customerName?: string;
  itemCount: number;
  status: string;
};

export type DeliveryOrderQueryParams = {
  keyword?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  customerId?: string;
};

export type CreateDeliveryOrderFromPackingBody = {
  deliveryDate?: string;
  shippingAddress?: string;
  contactName?: string;
  contactPhone?: string;
  carrierName?: string;
  vehiclePlate?: string;
  driverName?: string;
  driverPhone?: string;
  remark?: string;
};

export type UpdateDeliveryOrderBody = CreateDeliveryOrderFromPackingBody & {
  items?: Array<{ id: string; deliveredQty?: number; remark?: string }>;
};

export type DeliverDeliveryOrderBody = {
  result: DeliveryResult;
  returnReason?: string;
  returnToStock?: boolean;
  redeliver?: boolean;
  redeliverDate?: string;
  items?: Array<{
    deliveryOrderItemId: string;
    acceptedQty: number;
    returnedQty: number;
  }>;
};

export type DeliveryOrderApiResponse = {
  statusCode?: number;
  message: string;
  data: DeliveryOrder;
};

export type DeliveryOrderListApiResponse = {
  statusCode?: number;
  message: string;
  data: DeliveryOrder[];
};

export type ReadyPackingListApiResponse = {
  statusCode?: number;
  message: string;
  data: ReadyPacking[];
};
