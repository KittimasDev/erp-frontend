export type StockIssueStatus = "DRAFT" | "POSTED" | "CANCELLED" | string;

export const STOCK_ISSUE_STATUS_LABEL: Record<string, string> = {
  DRAFT: "ร่าง",
  POSTED: "อนุมัติแล้ว",
  CANCELLED: "ยกเลิก",
};

export type StockIssueUserSummary = {
  id: string;
  username: string;
  displayName: string;
};

export type StockIssueWarehouseSummary = {
  id: string;
  warehouseCode: string;
  warehouseName: string;
};

export type StockIssueLocationSummary = {
  id: string;
  locationCode: string;
  locationName: string;
};

export type StockIssueItem = {
  id: string;
  itemId: string;
  itemCode?: string;
  itemNameTh?: string;
  quantity: string;
  unitId: string;
  unitCode?: string;
  unitNameTh?: string;
  warehouseId: string;
  warehouse?: StockIssueWarehouseSummary;
  locationId: string;
  location?: StockIssueLocationSummary;
  lotId: string;
  lotNo?: string;
  remark?: string;
  sortOrder: number;
};

export type StockIssue = {
  id: string;
  issueNo: string;
  issueDate: string;
  issueType: string;
  status: StockIssueStatus;
  requestedById?: string;
  requestedBy?: StockIssueUserSummary;
  issuedById?: string;
  issuedBy?: StockIssueUserSummary;
  postedAt?: string;
  remark?: string;
  productionOrderId?: string;
  items: StockIssueItem[];
  createdAt: string;
  updatedAt: string;
};

export type StockIssueListData = {
  items: StockIssue[];
  total: number;
  page: number;
  limit: number;
};

export type StockIssueQueryParams = {
  issueNo?: string;
  status?: string;
  productionOrderId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
};

export type CreateStockIssueItemBody = {
  itemId: string;
  quantity: number;
  unitId: string;
  warehouseId: string;
  locationId: string;
  lotId: string;
  remark?: string;
  sortOrder?: number;
};

export type CreateStockIssueBody = {
  issueDate: string;
  remark?: string;
  productionOrderId?: string;
  items: CreateStockIssueItemBody[];
};

export type UpdateStockIssueItemBody = {
  id?: string;
  itemId?: string;
  quantity?: number;
  unitId?: string;
  warehouseId?: string;
  locationId?: string;
  lotId?: string;
  remark?: string;
  sortOrder?: number;
};

export type UpdateStockIssueBody = {
  issueDate?: string;
  remark?: string;
  productionOrderId?: string;
  items?: UpdateStockIssueItemBody[];
};

export type StockIssueApiResponse = {
  statusCode: number;
  message: string;
  data: StockIssue;
};

export type StockIssueListApiResponse = {
  statusCode: number;
  message: string;
  data: StockIssueListData;
};
