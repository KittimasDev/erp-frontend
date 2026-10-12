import type { StockMovementRow } from "@/types/inventory";

export type RawMaterialCostTab = "summary" | "detail";

export type RawMaterialCostQueryParams = {
  dateFrom?: string;
  dateTo?: string;
  itemId?: string;
  warehouseId?: string;
  movementType?: string;
  lotNo?: string;
  /** เฉพาะแท็บรายละเอียด */
  q?: string;
  page?: number;
  limit?: number;
};

export type RawMaterialCostSummaryRow = {
  itemId: string;
  itemCode: string;
  itemName: string;
  unitCode: string;
  openingQty: string;
  openingValue: string;
  receivedQty: string;
  receivedValue: string;
  issuedQty: string;
  issuedValue: string;
  adjustedQty: string;
  adjustedValue: string;
  closingQty: string;
  closingAvgCost: string;
  closingValue: string;
  zeroCostMovements: number;
};

export type RawMaterialCostSummaryTotals = {
  openingValue: string;
  receivedValue: string;
  issuedValue: string;
  adjustedValue: string;
  closingValue: string;
  zeroCostMovements: number;
};

export type RawMaterialCostSummaryData = {
  dateFrom: string;
  dateTo: string;
  items: RawMaterialCostSummaryRow[];
  totals: RawMaterialCostSummaryTotals;
};

export type RawMaterialCostDetailRow = StockMovementRow & {
  /** เลขใบรับซื้อ (RP) เมื่อ movement อ้างอิงใบขอเข้าคลัง (SPR) */
  purchaseReceiptNo?: string;
};

export type RawMaterialCostDetailTotals = {
  totalQuantityIn: string;
  totalQuantityOut: string;
  totalCostIn: string;
  totalCostOut: string;
};

export type RawMaterialCostDetailData = {
  dateFrom: string;
  dateTo: string;
  items: RawMaterialCostDetailRow[];
  total: number;
  page: number;
  limit: number;
  totals: RawMaterialCostDetailTotals;
};

export type RawMaterialCostEnvelope<T> = {
  statusCode: number;
  message: string;
  data: T;
};

/** ประเภทรายการที่เลือกกรองได้ — ตรงกับ backend (RAW_MATERIAL_COST_MOVEMENT_TYPES) */
export const RAW_MATERIAL_COST_TYPE_OPTIONS = [
  { value: "RECEIVE", label: "รับเข้า" },
  { value: "ISSUE", label: "เบิกออก / เบิกไปผลิต" },
  { value: "SALES_OUT", label: "ขายออก" },
  { value: "ADJUST_IN", label: "ปรับเพิ่ม" },
  { value: "ADJUST_OUT", label: "ปรับลด" },
  { value: "TRANSFER_IN", label: "โอนเข้า" },
  { value: "TRANSFER_OUT", label: "โอนออก" },
] as const;

/** เอกสารต้นทางที่ถือว่า "เบิกไปผลิต" เมื่อเป็น ISSUE */
export const PRODUCTION_ISSUE_REF_TYPES = [
  "PRODUCTION_ORDER",
  "TIRE_PREP_ISSUE",
  "TIRE_PREP_STAGE_RUN",
  "RCB_PROCESSING_RUN",
  "MATERIAL_CONVERSION_RUN",
] as const;
