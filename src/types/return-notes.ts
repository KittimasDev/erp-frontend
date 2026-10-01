import type { DeliveryResult } from "./delivery-orders";

export type ReturnNoteStatus = "PENDING_APPROVAL" | "APPROVED" | "REJECTED";

export const RETURN_NOTE_STATUS_LABEL: Record<ReturnNoteStatus, string> = {
  PENDING_APPROVAL: "รอคลังอนุมัติ",
  APPROVED: "อนุมัติแล้ว",
  REJECTED: "ไม่อนุมัติ",
};

export type ReturnNoteItem = {
  id: string;
  pickingItemId: string;
  deliveryOrderItemId?: string;
  salesOrderItemId: string;
  itemId: string;
  itemCode?: string;
  itemNameTh?: string;
  unitId: string;
  unitCode?: string;
  lotId?: string;
  lotNo?: string;
  returnQty: string;
  sortOrder: number;
};

export type ReturnNote = {
  id: string;
  returnNoteNo: string;
  status: ReturnNoteStatus | string;
  salesOrderId: string;
  salesOrderNo?: string;
  customerId?: string;
  customerName?: string;
  salesOrderDeliveryScheduleId?: string;
  roundNo?: number;
  pickingId: string;
  pickingNo?: string;
  deliveryOrderId?: string;
  deliveryOrderNo?: string;
  reason: string;
  remark?: string;
  warehouseId?: string;
  warehouseCode?: string;
  warehouseName?: string;
  locationId?: string;
  locationCode?: string;
  createdByName?: string;
  approvedByName?: string;
  approvedAt?: string;
  rejectedByName?: string;
  rejectedAt?: string;
  rejectReason?: string;
  totalReturnQty: string;
  items: ReturnNoteItem[];
  createdAt: string;
  updatedAt: string;
};

export type ReturnNoteQueryParams = {
  keyword?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  deliveryOrderId?: string;
  page?: number;
  limit?: number;
};

export type CreateReturnNoteBody = {
  pickingId: string;
  deliveryOrderId?: string;
  reason: string;
  remark?: string;
  items: Array<{ pickingItemId: string; returnQty: number }>;
};

export type ApproveReturnNoteBody = {
  warehouseId?: string;
  locationId?: string;
};

export type RejectReturnNoteBody = { rejectReason: string };

export type ReturnSourceSalesOrder = {
  id: string;
  soNo: string;
  customerName?: string;
};

export type ReturnSourcePicking = {
  id: string;
  pickingNo: string;
  pickingDate: string;
  salesOrderDeliveryScheduleId?: string;
  roundNo?: number;
  deliveryOrderId?: string;
  deliveryOrderNo?: string;
  deliveryResult?: DeliveryResult | string;
};

export type ReturnSourceLine = {
  pickingItemId: string;
  deliveryOrderItemId?: string;
  salesOrderItemId: string;
  itemId: string;
  itemCode?: string;
  itemNameTh?: string;
  unitId: string;
  unitCode?: string;
  lotId?: string;
  lotNo?: string;
  issuedQty: string;
  returnedQty: string;
  returnableQty: string;
  deliveryReturnedQty?: string;
  maxReturnQty: string;
};

export type ReturnSourcePickingDetail = {
  pickingId: string;
  pickingNo: string;
  salesOrderId: string;
  salesOrderNo?: string;
  customerName?: string;
  salesOrderDeliveryScheduleId?: string;
  roundNo?: number;
  deliveryOrderId?: string;
  deliveryOrderNo?: string;
  deliveryResult?: DeliveryResult | string;
  deliveryReturnReason?: string;
  lines: ReturnSourceLine[];
};

export type InspectionWarehouse = {
  id: string;
  warehouseCode: string;
  warehouseName: string;
  locations: Array<{ id: string; locationCode: string; locationName: string }>;
};

type Envelope<T> = { statusCode: number; message: string; data: T };

export type ReturnNoteApiResponse = Envelope<ReturnNote>;
export type ReturnNoteListApiResponse = Envelope<{
  items: ReturnNote[];
  total: number;
  page: number;
  limit: number;
}>;
export type ReturnSourceSalesOrderListApiResponse = Envelope<
  ReturnSourceSalesOrder[]
>;
export type ReturnSourcePickingListApiResponse = Envelope<
  ReturnSourcePicking[]
>;
export type ReturnSourcePickingDetailApiResponse =
  Envelope<ReturnSourcePickingDetail>;
export type InspectionWarehouseListApiResponse = Envelope<
  InspectionWarehouse[]
>;
