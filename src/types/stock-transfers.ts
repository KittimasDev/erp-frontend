export type StockTransferStatus = "DRAFT" | "POSTED" | "CANCELLED" | string;

export const STOCK_TRANSFER_STATUS_LABEL: Record<string, string> = {
  DRAFT: "แบบร่างเอกสาร",
  POSTED: "อนุมัติแล้ว",
  CANCELLED: "ยกเลิก",
};

export type StockTransferUserSummary = {
  id: string;
  username: string;
  displayName: string;
};

export type StockTransferWarehouseSummary = {
  id: string;
  warehouseCode: string;
  warehouseName: string;
};

export type StockTransferLocationSummary = {
  id: string;
  locationCode: string;
  locationName: string;
};

export type StockTransferItem = {
  id: string;
  itemId: string;
  itemCode?: string;
  itemNameTh?: string;
  quantity: string;
  unitId: string;
  unitCode?: string;
  unitNameTh?: string;
  fromWarehouseId: string;
  fromWarehouse?: StockTransferWarehouseSummary;
  fromLocationId: string;
  fromLocation?: StockTransferLocationSummary;
  toWarehouseId: string;
  toWarehouse?: StockTransferWarehouseSummary;
  toLocationId: string;
  toLocation?: StockTransferLocationSummary;
  lotId: string;
  lotNo?: string;
  remark?: string;
  sortOrder: number;
};

export type StockTransfer = {
  id: string;
  transferNo: string;
  transferDate: string;
  transferType: string;
  status: StockTransferStatus;
  requestedById?: string;
  requestedBy?: StockTransferUserSummary;
  approvedById?: string;
  approvedBy?: StockTransferUserSummary;
  postedAt?: string;
  remark?: string;
  items: StockTransferItem[];
  createdAt: string;
  updatedAt: string;
};

export type StockTransferListData = {
  items: StockTransfer[];
  total: number;
  page: number;
  limit: number;
};

export type StockTransferQueryParams = {
  transferNo?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
};

export type CreateStockTransferItemBody = {
  itemId: string;
  quantity: number;
  unitId: string;
  fromWarehouseId: string;
  fromLocationId: string;
  toWarehouseId: string;
  toLocationId: string;
  lotId: string;
  remark?: string;
  sortOrder?: number;
};

export type CreateStockTransferBody = {
  transferDate: string;
  remark?: string;
  items: CreateStockTransferItemBody[];
};

export type UpdateStockTransferItemBody = {
  id?: string;
  itemId?: string;
  quantity?: number;
  unitId?: string;
  fromWarehouseId?: string;
  fromLocationId?: string;
  toWarehouseId?: string;
  toLocationId?: string;
  lotId?: string;
  remark?: string;
  sortOrder?: number;
};

export type UpdateStockTransferBody = {
  transferDate?: string;
  remark?: string;
  items?: UpdateStockTransferItemBody[];
};

export type StockTransferApiResponse = {
  statusCode: number;
  message: string;
  data: StockTransfer;
};

export type StockTransferListApiResponse = {
  statusCode: number;
  message: string;
  data: StockTransferListData;
};
