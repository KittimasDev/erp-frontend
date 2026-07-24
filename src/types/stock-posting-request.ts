export const StockPostingRequestStatus = {
  PENDING_APPROVAL: "PENDING_APPROVAL",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  CANCELLED: "CANCELLED",
} as const;

export const STOCK_POSTING_REQUEST_STATUS_LABEL: Record<string, string> = {
  PENDING_APPROVAL: "รออนุมัติ",
  APPROVED: "อนุมัติแล้ว",
  REJECTED: "ไม่อนุมัติ",
  CANCELLED: "ยกเลิก",
};

export type StockPostingRequestUser = {
  id: string;
  username: string;
  displayName: string;
};

export type StockPostingReceiptSummary = {
  id: string;
  receiptNo: string;
  receiptDate: string;
  status: string;
  stockPostingStatus: string;
  payableWeightKg: string;
  totalAmount: string;
};

export type StockPostingReceiptItem = {
  id: string;
  itemId?: string;
  itemCode?: string;
  itemName?: string;
  classificationName: string;
  classificationCode?: string;
  weightKg: string;
  pricePerKg: string;
  amount: string;
  unitId?: string;
};

export type StockPostingRequest = {
  id: string;
  requestNo: string;
  receiptId: string;
  warehouseId: string;
  warehouseCode?: string;
  warehouseName?: string;
  warehouseLocationId: string;
  locationCode?: string;
  locationName?: string;
  postingDate: string;
  status: string;
  remark?: string;
  requestedById: string;
  requestedBy?: StockPostingRequestUser;
  requestedAt: string;
  approvedById?: string;
  approvedBy?: StockPostingRequestUser;
  approvedAt?: string;
  rejectedById?: string;
  rejectedBy?: StockPostingRequestUser;
  rejectedAt?: string;
  rejectReason?: string;
  createdAt: string;
  updatedAt: string;
  receipt?: StockPostingReceiptSummary;
  items?: StockPostingReceiptItem[];
};

export type CreateStockPostingRequestBody = {
  warehouseId: string;
  warehouseLocationId: string;
  postingDate: string;
  remark?: string;
};

export type RejectStockPostingRequestBody = {
  rejectReason: string;
};

export type StockPostingRequestApiResponse = {
  statusCode: number;
  message: string;
  data: StockPostingRequest;
};

export type StockPostingRequestNullableApiResponse = {
  statusCode: number;
  message: string;
  data: StockPostingRequest | null;
};

export type StockPostingRequestListApiResponse = {
  statusCode: number;
  message: string;
  data: StockPostingRequest[];
};
