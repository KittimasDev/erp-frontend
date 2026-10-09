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
  isFinishedGood?: boolean;
  q?: string;
  hasStock?: boolean;
};

export type StockBalanceByItemRow = {
  itemId: string;
  itemCode: string;
  itemNameTh: string;
  itemCategoryName?: string;
  unitId: string;
  unitCode?: string;
  totalQuantityOnHand: string;
  totalQuantityAvailable: string;
  totalQuantityReserved: string;
  totalQuantityOnHold: string;
  totalQuantityBlocked: string;
  warehouseCount: number;
  locationCount: number;
  minimumStockQty?: string;
  isLowStock: boolean;
};

export type StockBalanceByItemListApiResponse = {
  statusCode: number;
  message: string;
  data: StockBalanceByItemRow[];
};

export type StockBalanceReservationRow = {
  id: string;
  salesOrderId: string;
  soNo: string;
  customerCode?: string;
  customerName?: string;
  quantity: string;
  warehouseCode: string;
  locationCode: string;
  locationName?: string;
  reservedAt: string;
  createdByName?: string;
};

export type StockBalanceReservationListApiResponse = {
  statusCode: number;
  message: string;
  data: StockBalanceReservationRow[];
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
  /**
   * เอกสารต้นทางของ movement — ใช้ดูว่าเอกสารใบหนึ่งทำให้สต๊อกขยับอะไรบ้าง
   *
   * จำเป็นกับใบสั่งผลิตเป็นพิเศษ เพราะการตัดสต๊อกตอนเริ่มผลิตไม่ได้ออกเอกสารเบิก
   * ของตัวเอง ร่องรอยมีแค่แถวใน `stock_movements` ที่ใช้เลขใบสั่งผลิตแทนเลขใบเบิก
   */
  referenceDocId?: string;
  from?: string;
  to?: string;
  itemCategoryCode?: string;
  isFinishedGood?: boolean;
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
  /** เลข Batch ที่ประทับตอนรับเข้า — ใช้รู้ว่า Lot นี้เป็นผลผลิตของงานสายไหน */
  batchNo?: string;
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
  quantityOnHold?: string;
  averageCost: string;
  /** หน่วยหลักของสินค้า (master) — แปลงไม่ได้ = หน่วยที่บันทึกไว้ */
  baseUnitId?: string;
  baseUnitCode?: string;
  /** ยอดในหน่วยหลัก ใช้แสดงผลเท่านั้น — ตรวจยอดตอนตัดสต๊อกใช้ quantity* */
  baseQuantityOnHand?: string;
  baseQuantityAvailable?: string;
  /** แถวนี้บันทึกไว้ด้วยหน่วยที่ไม่ใช่หน่วยหลัก */
  recordedInOtherUnit?: boolean;
  /** false = ไม่มีกฎแปลงไปหน่วยหลัก ช่อง base* ยังเป็นหน่วยเดิม */
  baseUnitConvertible?: boolean;
  expiryDate?: string;
  expirySource?: "LOT" | "CALCULATED";
  daysUntilExpiry?: number;
  expiryStatus: LotExpiryStatus;
  updatedAt: string;
};

export type LotExpiryStatus =
  | "EXPIRED"
  | "CRITICAL"
  | "WARNING"
  | "OK"
  | "UNKNOWN";

export const LOT_EXPIRY_STATUS_LABEL: Record<LotExpiryStatus, string> = {
  EXPIRED: "หมดอายุแล้ว",
  CRITICAL: "วิกฤต (≤7 วัน)",
  WARNING: "ใกล้หมดอายุ (≤30 วัน)",
  OK: "ปกติ",
  UNKNOWN: "ไม่ทราบ",
};

export type InventoryLotQueryParams = {
  warehouseId?: string;
  locationId?: string;
  itemId?: string;
  status?: string;
  itemCategoryCode?: string;
  isFinishedGood?: boolean;
  q?: string;
  hasStock?: boolean;
  nearExpiry?: boolean;
  /** วันที่รับเข้า Lot (YYYY-MM-DD) รวมวันต้น/ปลาย */
  dateFrom?: string;
  dateTo?: string;
  /** กรองเฉพาะ Lot ของ Batch นี้ — ฟอร์มใบแปรสภาพ **ไม่ใช้ตัวนี้** ดูที่ `batchNo` ของแต่ละแถวแทน */
  batchNo?: string;
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
  SALES_RETURN_IN: "รับคืนจากลูกค้า",
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
