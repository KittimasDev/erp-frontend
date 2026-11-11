import { getStoredLanguage, type Language } from "@/lib/i18n/language";
import { translate } from "@/lib/i18n/translate";
import {
  STANDARD_STATUS,
  standardStatusColor,
  standardStatusLabel,
  type StandardStatus,
} from "@/lib/status/standard-status";
import type { DeliveryResult } from "./delivery-orders";

export type ReturnNoteStatus = "PENDING_APPROVAL" | "APPROVED" | "REJECTED";

export const RETURN_NOTE_STATUS_LABEL: Record<ReturnNoteStatus, string> = {
  PENDING_APPROVAL: STANDARD_STATUS.PENDING_APPROVAL.th,
  APPROVED: STANDARD_STATUS.APPROVED.th,
  REJECTED: STANDARD_STATUS.REJECTED.th,
};

/** ทั้ง 3 สถานะของใบรับคืนคือผลการขออนุมัติจากคลัง — ตรงกับสถานะมาตรฐานทั้งหมด */
const RETURN_NOTE_STANDARD: Record<ReturnNoteStatus, StandardStatus> = {
  PENDING_APPROVAL: "PENDING_APPROVAL",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
};

export function returnNoteStatusLabel(status: string, lang?: Language): string {
  const l = lang ?? getStoredLanguage();
  const std = RETURN_NOTE_STANDARD[status as ReturnNoteStatus];
  return std ? standardStatusLabel(std, l) : translate(l, status);
}

export function returnNoteStatusColor(status: string): string {
  const std = RETURN_NOTE_STANDARD[status as ReturnNoteStatus];
  return std ? standardStatusColor(std) : "default";
}

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
  goodQty?: string;
  scrapQty?: string;
  goodWarehouseId?: string;
  goodWarehouseCode?: string;
  goodWarehouseName?: string;
  goodLocationId?: string;
  scrapWarehouseId?: string;
  scrapWarehouseCode?: string;
  scrapWarehouseName?: string;
  scrapLocationId?: string;
  inspectionRemark?: string;
  inspectedAt?: string;
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
  inspectionStatus?: "PENDING" | "CONFIRMED" | string;
  inspectionConfirmedAt?: string;
  inspectionConfirmedByName?: string;
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

export type SaveReturnInspectionLineBody = {
  goodQty: number;
  scrapQty: number;
  goodWarehouseId?: string;
  goodLocationId?: string;
  scrapWarehouseId?: string;
  scrapLocationId?: string;
  remark?: string;
};

export type SortDestinationWarehouse = {
  id: string;
  warehouseCode: string;
  warehouseName: string;
  locations: Array<{ id: string; locationCode: string; locationName: string }>;
};

export type SortDestinationWarehousesApiResponse = Envelope<{
  goodWarehouses: SortDestinationWarehouse[];
  scrapWarehouses: SortDestinationWarehouse[];
}>;

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
