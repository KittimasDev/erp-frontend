export type StockBalanceLotRow = {
  /** ไม่มี Lot = "ไม่ระบุ Lot" */
  lotNo: string;
  warehouseName: string;
  quantityOnHand: string;
  quantityReserved: string;
  quantityAvailable: string;
};

export type StockBalanceGroup = {
  itemCode: string;
  itemName: string;
  itemCategoryName: string;
  unitCode: string;
  quantityOnHand: string;
  quantityReserved: string;
  quantityAvailable: string;
  lots: StockBalanceLotRow[];
};

export type StockBalanceReportPage = {
  asOfDate: string;
  /** จำนวนกลุ่มสินค้า ไม่ใช่จำนวน Lot */
  total: number;
  page: number;
  limit: number;
  items: StockBalanceGroup[];
};

export type StockBalanceReportExport = {
  asOfDate: string;
  total: number;
  items: StockBalanceGroup[];
};

export type StockBalanceStatusFilter = "ALL" | "IN_STOCK" | "OUT_OF_STOCK";

export type StockBalanceReportQuery = {
  page?: number;
  limit?: number;
  q?: string;
  asOfDate?: string;
  warehouseId?: string;
  itemCategoryId?: string;
  lotNo?: string;
  stockStatus?: StockBalanceStatusFilter;
};

export type ProcurementStockMovementRow = {
  movementDate: string;
  movementType: string;
  movementTypeLabel: string;
  referenceDocNo: string;
  itemCode: string;
  itemName: string;
  warehouseName: string;
  locationName: string;
  unitCode: string;
  quantityIn: string;
  quantityOut: string;
};

export type ProcurementSalesByItemRow = {
  itemCode: string;
  itemName: string;
  unitCode: string;
  quantity: string;
  amount: string;
};

export type ProcurementReportPage<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
};

export type ProcurementReportExport<T> = {
  items: T[];
  total: number;
  truncated: boolean;
};

export type ProcurementReportEnvelope<T> = {
  message: string;
  data: T;
};

export type ProcurementReportQuery = {
  page?: number;
  limit?: number;
  q?: string;
  warehouseId?: string;
  itemId?: string;
  dateFrom?: string;
  dateTo?: string;
};
