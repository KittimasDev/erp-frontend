import { standardStatusColor, standardStatusLabel } from "@/lib/status/standard-status";
export const StockPostingRequestStatus = {
  PENDING_APPROVAL: "PENDING_APPROVAL",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  CANCELLED: "CANCELLED",
} as const;

export const STOCK_POSTING_REQUEST_STATUS_LABEL: Record<string, string> = {
  PENDING_APPROVAL: standardStatusLabel("PENDING_APPROVAL"),
  APPROVED: standardStatusLabel("APPROVED"),
  REJECTED: standardStatusLabel("REJECTED"),
  CANCELLED: standardStatusLabel("CANCELLED"),
};

/** สีป้ายสถานะคำขอรับเข้าสต๊อก — ตามมาตรฐานกลาง */
export const STOCK_POSTING_REQUEST_STATUS_COLOR: Record<string, string> = {
  PENDING_APPROVAL: standardStatusColor("PENDING_APPROVAL"),
  APPROVED: standardStatusColor("APPROVED"),
  REJECTED: standardStatusColor("REJECTED"),
  CANCELLED: standardStatusColor("CANCELLED"),
};

/** ป้ายสถานะตามภาษา — ไทยใช้ STOCK_POSTING_REQUEST_STATUS_LABEL เดิม ("ยกเลิก" ชนกับปุ่ม Cancel จึงไม่ผ่าน dictionary) */
export function stockPostingStatusLabel(status: string, lang: "th" | "en"): string {
  if (lang === "en") {
    return status in STOCK_POSTING_REQUEST_STATUS_LABEL
      ? standardStatusLabel(status as "PENDING_APPROVAL", "en")
      : status;
  }
  return STOCK_POSTING_REQUEST_STATUS_LABEL[status] ?? status;
}

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
  postedWeightKg?: string;
  remainingWeightKg?: string;
  receivedWeightKg?: string;
  warehouseId?: string;
  warehouseCode?: string;
  warehouseName?: string;
  warehouseLocationId?: string;
  locationCode?: string;
  locationName?: string;
};

export type StockPostingRequest = {
  id: string;
  requestNo: string;
  receiptId: string;
  warehouseId?: string;
  warehouseCode?: string;
  warehouseName?: string;
  warehouseLocationId?: string;
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

export type CreateStockPostingRequestItemBody = {
  purchaseItemId: string;
  receivedWeightKg: number;
  warehouseId: string;
  warehouseLocationId: string;
};

export type CreateStockPostingRequestBody = {
  warehouseId?: string;
  warehouseLocationId?: string;
  postingDate: string;
  remark?: string;
  items?: CreateStockPostingRequestItemBody[];
};

export type ApproveStockPostingRequestBody = {
  warehouseId?: string;
  warehouseLocationId?: string;
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
