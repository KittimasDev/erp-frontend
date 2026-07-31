export type StockBalanceRow = {
  id: string;
  itemId: string;
  itemCode: string;
  itemNameTh: string;
  itemCategoryId?: string;
  itemCategoryName?: string;
  warehouseId: string;
  warehouseCode: string;
  warehouseName: string;
  locationId: string;
  locationCode: string;
  locationName: string;
  unitId: string;
  unitCode?: string;
  unitName?: string;
  quantityOnHand: string;
  quantityReserved: string;
  quantityAvailable: string;
  quantityOnHold: string;
  quantityBlocked: string;
  averageCost: string;
  /** สต๊อกขั้นต่ำของสินค้า */
  minimumStockQty?: string;
  /** ยอดรวมทุกคลังของสินค้าต่ำกว่าขั้นต่ำ */
  isLowStock?: boolean;
  updatedAt: string;
};

export type StockBalanceSummary = {
  balanceRows: number;
  distinctItems: number;
  distinctWarehouses: number;
  distinctLocations: number;
  totalQuantityOnHand: string;
  totalQuantityAvailable: string;
  totalQuantityReserved: string;
  totalQuantityOnHold: string;
  totalQuantityBlocked: string;
};

export type StockBalanceQueryParams = {
  warehouseId?: string;
  locationId?: string;
  itemId?: string;
  itemCategoryId?: string;
  itemCategoryCode?: string;
  q?: string;
  hasStock?: boolean;
};

export type StockMovementRow = {
  id: string;
  movementDate: string;
  movementType: string;
  referenceDocType?: string;
  referenceDocId?: string;
  referenceDocNo?: string;
  itemId: string;
  itemCode: string;
  itemNameTh: string;
  warehouseId: string;
  warehouseCode: string;
  warehouseName: string;
  locationId: string;
  locationCode: string;
  locationName: string;
  unitId: string;
  unitCode?: string;
  quantityIn: string;
  quantityOut: string;
  unitCost: string;
  amount: string;
  /** รายรับ (บาท) จากราคาใบสั่งขาย — ไม่ใช่ต้นทุนตัดสต๊อก */
  revenueAmount?: string;
  /** รายจ่าย (บาท) จากมูลค่าซื้อรับเข้า (GR / รับซื้อยาง) */
  expenseAmount?: string;
  balanceQuantityAfter: string;
  lotId?: string;
  lotNo?: string;
  remark?: string;
  createdById?: string;
  createdByName?: string;
  createdAt: string;
};

export type StockMovementQueryParams = {
  warehouseId?: string;
  locationId?: string;
  itemId?: string;
  movementType?: string;
  referenceDocType?: string;
  from?: string;
  to?: string;
  itemCategoryCode?: string;
  q?: string;
};

export type InventoryLotBalanceRow = {
  id: string;
  lotId: string;
  lotNo: string;
  lotStatus?: string;
  qcStatus?: string;
  sourceDocumentType?: string;
  sourceDocumentNo?: string;
  receivedDate?: string;
  itemId: string;
  itemCode: string;
  itemNameTh: string;
  warehouseId: string;
  warehouseCode: string;
  warehouseName: string;
  locationId: string;
  locationCode: string;
  locationName: string;
  unitId: string;
  unitCode?: string;
  quantityOnHand: string;
  quantityAvailable: string;
  quantityReserved: string;
  averageCost: string;
  updatedAt: string;
};

export type InventoryLotQueryParams = {
  warehouseId?: string;
  locationId?: string;
  itemId?: string;
  status?: string;
  itemCategoryCode?: string;
  q?: string;
  hasStock?: boolean;
};

export type StockBalanceListApiResponse = {
  statusCode: number;
  message: string;
  data: StockBalanceRow[];
};

export type StockBalanceSummaryApiResponse = {
  statusCode: number;
  message: string;
  data: StockBalanceSummary;
};

export type StockMovementListApiResponse = {
  statusCode: number;
  message: string;
  data: StockMovementRow[];
};

export type StockMovementApiResponse = {
  statusCode: number;
  message: string;
  data: StockMovementRow;
};

export type InventoryLotBalanceListApiResponse = {
  statusCode: number;
  message: string;
  data: InventoryLotBalanceRow[];
};

export type LowStockRow = {
  itemId: string;
  itemCode: string;
  itemNameTh: string;
  itemCategoryName?: string;
  minimumStockQty: string;
  totalQuantityOnHand: string;
  shortageQty: string;
};

export type LowStockListApiResponse = {
  statusCode: number;
  message: string;
  data: LowStockRow[];
};

export type LowStockQueryParams = {
  warehouseId?: string;
};

export const STOCK_MOVEMENT_TYPE_LABEL: Record<string, string> = {
  RECEIVE: "รับเข้า",
  ISSUE: "เบิกออก",
  SALES_OUT: "ขายออก",
  ADJUST_IN: "ปรับเพิ่ม",
  ADJUST_OUT: "ปรับลด",
  TRANSFER_IN: "โอนเข้า",
  TRANSFER_OUT: "โอนออก",
};

/** แสดงประเภทบนหน้า Stock Movement — ISSUE จากใบจ่ายขายแสดงเป็นขายออก */
export function resolveStockMovementTypeLabel(row: {
  movementType: string;
  referenceDocType?: string;
}): string {
  const type = row.movementType?.toUpperCase();
  const ref = (row.referenceDocType ?? "").toUpperCase();
  if (
    type === "SALES_OUT" ||
    (type === "ISSUE" && (ref === "PICKING" || ref === "DISPATCH_ORDER"))
  ) {
    return STOCK_MOVEMENT_TYPE_LABEL.SALES_OUT;
  }
  return STOCK_MOVEMENT_TYPE_LABEL[type] ?? row.movementType;
}
