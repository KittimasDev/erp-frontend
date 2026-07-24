export type DeliveryOrderStatus =
  | "DRAFT"
  | "CONFIRMED"
  | "DELIVERED"
  | "CANCELLED";

export const DELIVERY_ORDER_STATUS_LABEL: Record<DeliveryOrderStatus, string> = {
  DRAFT: "ร่าง",
  CONFIRMED: "ยืนยันแล้ว",
  DELIVERED: "ส่งแล้ว",
  CANCELLED: "ยกเลิก",
};

export type DeliveryOrderItem = {
  id: string;
  salesOrderItemId: string;
  itemId: string;
  itemCode?: string;
  itemNameTh?: string;
  deliveredQty: string;
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
