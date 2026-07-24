export type DispatchOrderStatus =
  | "PICKING"
  | "PICKED"
  | "PACKED"
  | "DISPATCHED"
  | "CANCELLED";

export const DISPATCH_ORDER_STATUS_LABEL: Record<DispatchOrderStatus, string> = {
  PICKING: "กำลังจัดสินค้า",
  PICKED: "หยิบสินค้าแล้ว (ตัดสต๊อกแล้ว)",
  PACKED: "แพ็คแล้ว",
  DISPATCHED: "จ่ายออกแล้ว",
  CANCELLED: "ยกเลิก",
};

export type DispatchOrderUserSummary = {
  id: string;
  username: string;
  displayName: string;
};

export type DispatchOrderItem = {
  id: string;
  salesOrderItemId: string;
  itemId: string;
  itemCode?: string;
  itemNameTh?: string;
  locationId: string;
  locationCode?: string;
  lotId?: string;
  lotNo?: string;
  unitId: string;
  unitCode?: string;
  quantity: string;
  remark?: string;
  sortOrder: number;
};

export type DispatchOrder = {
  id: string;
  dispatchNo: string;
  dispatchDate: string;
  salesOrderId: string;
  salesOrderNo?: string;
  warehouseId: string;
  warehouseCode?: string;
  status: DispatchOrderStatus | string;
  remark?: string;
  requestedById?: string;
  requestedBy?: DispatchOrderUserSummary;
  pickedById?: string;
  pickedBy?: DispatchOrderUserSummary;
  pickedAt?: string;
  packedById?: string;
  packedBy?: DispatchOrderUserSummary;
  packedAt?: string;
  dispatchedById?: string;
  dispatchedBy?: DispatchOrderUserSummary;
  dispatchedAt?: string;
  deliveryNo?: string;
  recipientName?: string;
  recipientSignature?: string;
  items: DispatchOrderItem[];
  createdAt: string;
  updatedAt: string;
};

export type DispatchOrderQueryParams = {
  dispatchNo?: string;
  status?: string;
  salesOrderId?: string;
};

export type CreateDispatchOrderItemInput = {
  salesOrderItemId: string;
  locationId: string;
  lotId: string;
  quantity: number;
  remark?: string;
  sortOrder?: number;
};

export type CreateDispatchOrderBody = {
  salesOrderId: string;
  dispatchDate: string;
  warehouseId: string;
  remark?: string;
  items: CreateDispatchOrderItemInput[];
};

export type DeliverDispatchOrderBody = {
  recipientName?: string;
  recipientSignature?: string;
};

export type DispatchOrderApiResponse = {
  statusCode?: number;
  message: string;
  data: DispatchOrder;
};

export type DispatchOrderListApiResponse = {
  statusCode?: number;
  message: string;
  data: DispatchOrder[];
};

export type FifoLotSuggestion = {
  lotId: string;
  lotNo?: string;
  quantity: string;
};

export type FifoLotSuggestionListApiResponse = {
  statusCode?: number;
  message: string;
  data: FifoLotSuggestion[];
};

export type AvailableLocation = {
  locationId: string;
  locationCode?: string;
  locationName?: string;
  quantityAvailable: string;
};

export type AvailableLocationListApiResponse = {
  statusCode?: number;
  message: string;
  data: AvailableLocation[];
};
