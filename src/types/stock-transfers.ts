import { standardStatusColor, standardStatusLabel } from "@/lib/status/standard-status";
export type StockTransferStatus = "DRAFT" | "POSTED" | "CANCELLED" | string;

export const STOCK_TRANSFER_STATUS_LABEL: Record<string, string> = {
  DRAFT: standardStatusLabel("DRAFT"),
  POSTED: standardStatusLabel("APPROVED"),
  CANCELLED: standardStatusLabel("CANCELLED"),
};

/** สีป้ายสถานะ — ตามมาตรฐานกลาง (POSTED = อนุมัติแล้ว) */
export const STOCK_TRANSFER_STATUS_COLOR: Record<string, string> = {
  DRAFT: standardStatusColor("DRAFT"),
  POSTED: standardStatusColor("APPROVED"),
  CANCELLED: standardStatusColor("CANCELLED"),
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
  warehouseGroup?: string;
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
  warehouseGroup?: string;
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
  warehouseGroup?: string;
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
