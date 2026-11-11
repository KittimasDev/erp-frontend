import { standardStatusColor, standardStatusLabel } from "@/lib/status/standard-status";
import { getStoredLanguage, type Language } from "@/lib/i18n/language";
import { translate } from "@/lib/i18n/translate";

const STOCK_STATUS_EN_OVERRIDE: Record<string, string> = {
  /* ในบริบทสถานะ "ยกเลิก" = Cancelled (ไม่ใช่ปุ่ม Cancel), "ไม่อนุมัติ" = Rejected (ไม่ใช่ปุ่ม Reject) */
  ยกเลิก: "Cancelled",
  ไม่อนุมัติ: "Rejected",
  แบบร่างเอกสาร: "Draft",
  อนุมัติแล้ว: "Approved",
  เสร็จสิ้น: "Completed",
};

/** แปลป้ายสถานะ/ประเภทเอกสารคลัง ตามภาษา — เรียกตอนเรนเดอร์ในคอมโพเนนต์ที่ใช้ useT()/useLanguage() อยู่แล้ว */
export function tStockLabel(label: string, lang?: Language): string {
  const current = lang ?? getStoredLanguage();
  if (current === "en" && STOCK_STATUS_EN_OVERRIDE[label]) {
    return STOCK_STATUS_EN_OVERRIDE[label];
  }
  return translate(current, label);
}

export type StockAdjustmentStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "POSTED"
  | "CANCELLED"
  | "REJECTED"
  | string;

export const STOCK_ADJUSTMENT_STATUS_LABEL: Record<string, string> = {
  DRAFT: standardStatusLabel("DRAFT"),
  PENDING_APPROVAL: standardStatusLabel("PENDING_APPROVAL"),
  POSTED: standardStatusLabel("APPROVED"),
  CANCELLED: standardStatusLabel("CANCELLED"),
  REJECTED: standardStatusLabel("REJECTED"),
};

/** สีป้ายสถานะ — ตามมาตรฐานกลาง (POSTED = อนุมัติแล้ว) */
export const STOCK_ADJUSTMENT_STATUS_COLOR: Record<string, string> = {
  DRAFT: standardStatusColor("DRAFT"),
  PENDING_APPROVAL: standardStatusColor("PENDING_APPROVAL"),
  POSTED: standardStatusColor("APPROVED"),
  REJECTED: standardStatusColor("REJECTED"),
  CANCELLED: standardStatusColor("CANCELLED"),
};

export type StockAdjustmentType = "INCREASE" | "DECREASE" | "CORRECTION";

export const STOCK_ADJUSTMENT_TYPE_LABEL: Record<string, string> = {
  INCREASE: "ปรับเพิ่ม",
  DECREASE: "ปรับลด",
  CORRECTION: "แก้ไขยอด",
};

export function stockAdjustmentTypeDisplayName(row: {
  adjustmentType: string;
  adjustmentTypeName?: string;
}): string {
  const fromApi = row.adjustmentTypeName?.trim();
  if (fromApi) {
    return fromApi;
  }
  const label = STOCK_ADJUSTMENT_TYPE_LABEL[row.adjustmentType];
  return label ? tStockLabel(label) : row.adjustmentType;
}

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
  adjustmentTypeName?: string;
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
  warehouseGroup?: string;
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
  warehouseGroup?: string;
  items: CreateStockAdjustmentItemBody[];
};

export type UpdateStockAdjustmentBody = {
  adjustmentDate?: string;
  adjustmentType?: string;
  reason?: string;
  warehouseGroup?: string;
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
