export type PickingStatus = "DRAFT" | "CONFIRMED" | "CANCELLED";

export const PICKING_STATUS_LABEL: Record<PickingStatus, string> = {
  DRAFT: "ร่าง",
  CONFIRMED: "ยืนยันแล้ว",
  CANCELLED: "ยกเลิก",
};

export type PickingItem = {
  id: string;
  salesOrderItemId: string;
  itemId: string;
  itemCode?: string;
  itemNameTh?: string;
  requiresLotControl?: boolean;
  warehouseId?: string;
  warehouseCode?: string;
  locationId?: string;
  locationCode?: string;
  lotId?: string;
  lotNo?: string;
  orderedQty: string;
  pickedQty: string;
  unitId: string;
  unitCode?: string;
  remark?: string;
  sortOrder: number;
};

export type Picking = {
  id: string;
  pickingNo: string;
  salesOrderId: string;
  salesOrderNo?: string;
  customerId?: string;
  customerName?: string;
  pickingDate: string;
  status: PickingStatus | string;
  remark?: string;
  createdByName?: string;
  confirmedAt?: string;
  items: PickingItem[];
  createdAt: string;
  updatedAt: string;
};

export type ReadySalesOrder = {
  id: string;
  soNo: string;
  soDate: string;
  customerId?: string;
  customerCode?: string;
  customerName?: string;
  itemCount: number;
  status: string;
};

export type PickingQueryParams = {
  keyword?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  customerId?: string;
};

export type CreatePickingFromSalesOrderBody = {
  pickingDate?: string;
  remark?: string;
};

export type UpdatePickingBody = {
  pickingDate?: string;
  remark?: string;
  items?: Array<{
    id: string;
    warehouseId?: string;
    locationId?: string;
    lotId?: string | null;
    pickedQty?: number;
    remark?: string;
  }>;
};

export type PickingApiResponse = {
  statusCode?: number;
  message: string;
  data: Picking;
};

export type PickingListApiResponse = {
  statusCode?: number;
  message: string;
  data: Picking[];
};

export type ReadySalesOrderListApiResponse = {
  statusCode?: number;
  message: string;
  data: ReadySalesOrder[];
};
