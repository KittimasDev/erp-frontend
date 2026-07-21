export type StockCountStatus = "DRAFT" | "POSTED" | "CANCELLED" | string;

export const STOCK_COUNT_STATUS_LABEL: Record<string, string> = {
  DRAFT: "ร่าง",
  POSTED: "อนุมัติแล้ว",
  CANCELLED: "ยกเลิก",
};

export type StockCountType = "FULL" | "PARTIAL" | "CYCLE_COUNT";

export const STOCK_COUNT_TYPE_LABEL: Record<string, string> = {
  FULL: "นับทั้งหมด",
  PARTIAL: "นับบางส่วน",
  CYCLE_COUNT: "นับตามรอบ",
};

export type StockCountUserSummary = {
  id: string;
  username: string;
  displayName: string;
};

export type StockCountWarehouseSummary = {
  id: string;
  warehouseCode: string;
  warehouseName: string;
};

export type StockCountLocationSummary = {
  id: string;
  locationCode: string;
  locationName: string;
};

export type StockCountItem = {
  id: string;
  itemId: string;
  itemCode?: string;
  itemNameTh?: string;
  lotId: string;
  lotNo?: string;
  unitId: string;
  unitCode?: string;
  unitNameTh?: string;
  systemQuantity: string;
  countedQuantity: string;
  varianceQuantity: string;
  remark?: string;
  sortOrder: number;
};

export type StockCount = {
  id: string;
  countNo: string;
  countDate: string;
  countType: string;
  warehouseId: string;
  warehouse?: StockCountWarehouseSummary;
  locationId: string;
  location?: StockCountLocationSummary;
  status: StockCountStatus;
  startedById?: string;
  startedBy?: StockCountUserSummary;
  completedById?: string;
  completedBy?: StockCountUserSummary;
  postedAt?: string;
  remark?: string;
  items: StockCountItem[];
  createdAt: string;
  updatedAt: string;
};

export type StockCountListData = {
  items: StockCount[];
  total: number;
  page: number;
  limit: number;
};

export type StockCountQueryParams = {
  countNo?: string;
  status?: string;
  warehouseId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
};

export type CreateStockCountItemBody = {
  itemId: string;
  lotId: string;
  unitId: string;
  countedQuantity: number;
  remark?: string;
  sortOrder?: number;
};

export type CreateStockCountBody = {
  countDate: string;
  countType: string;
  warehouseId: string;
  locationId: string;
  remark?: string;
  items: CreateStockCountItemBody[];
};

export type UpdateStockCountItemBody = {
  id?: string;
  itemId?: string;
  lotId?: string;
  unitId?: string;
  countedQuantity?: number;
  remark?: string;
  sortOrder?: number;
};

export type UpdateStockCountBody = {
  countDate?: string;
  countType?: string;
  warehouseId?: string;
  locationId?: string;
  remark?: string;
  items?: UpdateStockCountItemBody[];
};

export type StockCountApiResponse = {
  statusCode: number;
  message: string;
  data: StockCount;
};

export type StockCountListApiResponse = {
  statusCode: number;
  message: string;
  data: StockCountListData;
};
