export type PackingStatus = "DRAFT" | "CONFIRMED" | "CANCELLED";

export const PACKING_STATUS_LABEL: Record<PackingStatus, string> = {
  DRAFT: "ร่าง",
  CONFIRMED: "ยืนยันแล้ว",
  CANCELLED: "ยกเลิก",
};

export type PackingItem = {
  id: string;
  pickingItemId: string;
  salesOrderItemId: string;
  itemId: string;
  itemCode?: string;
  itemNameTh?: string;
  packedQty: string;
  unitId: string;
  unitCode?: string;
  packageNo?: string;
  remark?: string;
  sortOrder: number;
};

export type Packing = {
  id: string;
  packingNo: string;
  pickingId: string;
  pickingNo?: string;
  salesOrderId: string;
  salesOrderNo?: string;
  customerId?: string;
  customerName?: string;
  packingDate: string;
  packageType?: string;
  packageCount?: number;
  grossWeight?: string;
  netWeight?: string;
  status: PackingStatus | string;
  remark?: string;
  createdByName?: string;
  confirmedAt?: string;
  items: PackingItem[];
  createdAt: string;
  updatedAt: string;
};

export type ReadyPicking = {
  id: string;
  pickingNo: string;
  pickingDate: string;
  salesOrderId: string;
  salesOrderNo?: string;
  customerId?: string;
  customerName?: string;
  itemCount: number;
  status: string;
};

export type PackingQueryParams = {
  keyword?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  customerId?: string;
};

export type CreatePackingFromPickingBody = {
  packingDate?: string;
  packageType?: string;
  packageCount?: number;
  grossWeight?: number;
  netWeight?: number;
  remark?: string;
};

export type UpdatePackingBody = {
  packingDate?: string;
  packageType?: string;
  packageCount?: number;
  grossWeight?: number;
  netWeight?: number;
  remark?: string;
  items?: Array<{
    id: string;
    packedQty?: number;
    packageNo?: string;
    remark?: string;
  }>;
};

export type PackingApiResponse = {
  statusCode?: number;
  message: string;
  data: Packing;
};

export type PackingListApiResponse = {
  statusCode?: number;
  message: string;
  data: Packing[];
};

export type ReadyPickingListApiResponse = {
  statusCode?: number;
  message: string;
  data: ReadyPicking[];
};
