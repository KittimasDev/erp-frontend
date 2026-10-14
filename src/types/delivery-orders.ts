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
  /** ใบบรรจุที่แถวนี้มาจาก — ใบส่งหนึ่งใบรวมได้หลายใบบรรจุ */
  packingId?: string;
  packingNo?: string;
  salesOrderDeliveryScheduleId?: string;
  roundNo?: number;
  unitId: string;
  unitCode?: string;
  remark?: string;
  sortOrder: number;
};

export type DeliveryOrderPackingRef = {
  packingId: string;
  packingNo?: string;
  pickingId: string;
  pickingNo?: string;
  salesOrderDeliveryScheduleId?: string;
  roundNo?: number;
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
  vehicleWeightBeforeKg?: string;
  vehicleWeightAfterKg?: string;
  cargoNetWeightKg?: string;
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
  /** ใบบรรจุทั้งหมดที่ใบนี้รวมมา (packingId/pickingId บนหัว = ใบแรก) */
  packings?: DeliveryOrderPackingRef[];
  items: DeliveryOrderItem[];
  createdAt: string;
  updatedAt: string;
};

export type ReadyPackingItem = {
  id: string;
  itemCode?: string;
  itemNameTh?: string;
  packedQty: string;
  unitCode?: string;
  sortOrder: number;
};

export type ReadyPacking = {
  id: string;
  packingNo: string;
  packingDate: string;
  salesOrderId: string;
  salesOrderNo?: string;
  customerId?: string;
  customerName?: string;
  salesOrderDeliveryScheduleId?: string;
  roundNo?: number;
  itemCount: number;
  items?: ReadyPackingItem[];
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
  vehicleWeightBeforeKg?: number | null;
  vehicleWeightAfterKg?: number | null;
  cargoNetWeightKg?: number | null;
  remark?: string;
};

export type CreateDeliveryOrderFromPackingsBody =
  CreateDeliveryOrderFromPackingBody & {
    packingIds: string[];
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
