export type StockAdjustmentStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "POSTED"
  | "CANCELLED"
  | "REJECTED"
  | string;

export const STOCK_ADJUSTMENT_STATUS_LABEL: Record<string, string> = {
  DRAFT: "แบบร่างเอกสาร",
  PENDING_APPROVAL: "รออนุมัติ",
  POSTED: "อนุมัติแล้ว",
  CANCELLED: "ยกเลิก",
  REJECTED: "ไม่อนุมัติ",
};

export type StockAdjustmentType = "INCREASE" | "DECREASE" | "CORRECTION";

export const STOCK_ADJUSTMENT_TYPE_LABEL: Record<string, string> = {
  INCREASE: "ปรับเพิ่ม",
  DECREASE: "ปรับลด",
  CORRECTION: "แก้ไขยอด",
};

export type StockAdjustmentItem = {
  id: string;
  itemId: string;
  itemCode?: string;
  itemNameTh?: string;
  warehouseId: string;
  warehouseCode?: string;
  locationId: string;
  locationCode?: string;
  lotId?: string;
  lotNo?: string;
  unitId: string;
  unitCode?: string;
  quantityBefore: string;
  adjustQuantity: string;
  quantityAfter: string;
  unitCost: string;
  amount: string;
  remark?: string;
  sortOrder: number;
};

export type StockAdjustment = {
  id: string;
  adjustmentNo: string;
  adjustmentDate: string;
  adjustmentType: string;
  reason?: string;
  status: StockAdjustmentStatus;
  requestedById?: string;
  requestedByName?: string;
  approvedById?: string;
  approvedByName?: string;
  postedAt?: string;
  items: StockAdjustmentItem[];
  createdAt: string;
  updatedAt: string;
};

export type StockAdjustmentListData = {
  items: StockAdjustment[];
  total: number;
  page: number;
  limit: number;
};

export type StockAdjustmentQueryParams = {
  adjustmentNo?: string;
  status?: string;
  warehouseId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
};

export type CreateStockAdjustmentItemBody = {
  itemId: string;
  warehouseId: string;
  locationId: string;
  lotId?: string;
  unitId: string;
  adjustQuantity: number;
  unitCost?: number;
  remark?: string;
  sortOrder?: number;
};

export type CreateStockAdjustmentBody = {
  adjustmentDate: string;
  adjustmentType: string;
  reason: string;
  items: CreateStockAdjustmentItemBody[];
};

export type UpdateStockAdjustmentBody = {
  adjustmentDate?: string;
  adjustmentType?: string;
  reason?: string;
  items?: Array<CreateStockAdjustmentItemBody & { id?: string }>;
};

export type RejectStockAdjustmentBody = {
  rejectReason?: string;
};

export type StockAdjustmentApiResponse = {
  statusCode: number;
  message: string;
  data: StockAdjustment;
};

export type StockAdjustmentListApiResponse = {
  statusCode: number;
  message: string;
  data: StockAdjustmentListData;
};

export type DocumentAttachment = {
  id: string;
  documentType: string;
  documentId: string;
  fileName: string;
  originalFileName?: string;
  mimeType?: string;
  fileSize?: number;
  description?: string;
  attachmentGroup?: string;
  createdAt: string;
};

export type DocumentAttachmentListApiResponse = {
  statusCode: number;
  message: string;
  data: DocumentAttachment[];
};

export type DocumentAttachmentApiResponse = {
  statusCode: number;
  message: string;
  data: DocumentAttachment;
};
