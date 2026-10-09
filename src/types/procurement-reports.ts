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

export type StockMovementSummaryLot = {
  lotId: string | null;
  /** ไม่มี Lot = "ไม่ระบุ Lot" */
  lotNo: string;
  /** คลังที่ Lot นี้มียอดหรือเคลื่อนไหวในช่วง */
  warehouseNames: string[];
  openingQty: string;
  receivedQty: string;
  issuedQty: string;
  /** ปรับปรุงสุทธิ ติดลบได้ */
  adjustedQty: string;
  closingQty: string;
};

export type StockMovementSummaryGroup = {
  itemCode: string;
  itemName: string;
  itemCategoryName: string;
  unitCode: string;
  openingQty: string;
  receivedQty: string;
  issuedQty: string;
  adjustedQty: string;
  closingQty: string;
  lots: StockMovementSummaryLot[];
};

export type StockMovementSummaryReportPage = {
  dateFrom: string;
  dateTo: string;
  /** จำนวนกลุ่มสินค้า ไม่ใช่จำนวน Lot */
  total: number;
  page: number;
  limit: number;
  items: StockMovementSummaryGroup[];
};

export type StockMovementSummaryReportExport = {
  dateFrom: string;
  dateTo: string;
  total: number;
  items: StockMovementSummaryGroup[];
};

export type StockMovementSummaryReportQuery = {
  page?: number;
  limit?: number;
  q?: string;
  dateFrom?: string;
  dateTo?: string;
  warehouseId?: string;
  itemCategoryId?: string;
  lotNo?: string;
};

export type SalesSummaryLine = {
  itemCode: string;
  itemName: string;
  itemCategoryName: string;
  unitCode: string;
  orderedQty: string;
  /** ส่งมอบสำเร็จสุทธิ หักตีกลับแล้ว */
  deliveredQty: string;
  /** สั่งขาย - ส่งแล้ว - ยอดตีกลับที่ปิดการส่ง */
  outstandingQty: string;
  /** หลังหักส่วนลด ไม่รวม VAT */
  salesAmount: string;
  deliveredAmount: string;
  outstandingAmount: string;
  /** ยกเลิกจนสั่งขายเป็น 0 และไม่เคยส่ง — มาเฉพาะเมื่อ includeCancelled ไม่นับในยอด */
  cancelled: boolean;
  /** จำนวนในรอบส่งที่ยกเลิกถึงวันสิ้นสุดรายงาน */
  cancelledQty: string;
};

/** จำนวนรวมของกลุ่ม — null = หน่วยปนกัน รวมไม่ได้ */
export type SalesSummaryQtyRollup = {
  unitCode: string | null;
  orderedQty: string | null;
  deliveredQty: string | null;
  outstandingQty: string | null;
};

export type SalesSummaryOrder = SalesSummaryQtyRollup & {
  salesOrderId: string;
  soNo: string;
  soDate: string;
  status: string;
  /** ทุกรายการที่แสดงถูกยกเลิก (รวม SO ที่ยกเลิกทั้งใบ) */
  cancelled: boolean;
  salesAmount: string;
  deliveredAmount: string;
  outstandingAmount: string;
  lines: SalesSummaryLine[];
};

export type SalesSummaryCustomerGroup = SalesSummaryQtyRollup & {
  customerCode: string;
  customerName: string;
  salesAmount: string;
  deliveredAmount: string;
  outstandingAmount: string;
  orders: SalesSummaryOrder[];
};

export type SalesSummaryTotals = SalesSummaryQtyRollup & {
  salesAmount: string;
  deliveredAmount: string;
  outstandingAmount: string;
  salesOrderCount: number;
};

export type SalesSummaryReportPage = {
  dateFrom: string;
  dateTo: string;
  /** ยอดรวมทุกหน้า */
  summary: SalesSummaryTotals;
  /** จำนวนลูกค้า */
  total: number;
  page: number;
  limit: number;
  items: SalesSummaryCustomerGroup[];
};

export type SalesSummaryReportExport = {
  dateFrom: string;
  dateTo: string;
  summary: SalesSummaryTotals;
  total: number;
  items: SalesSummaryCustomerGroup[];
};

export type SalesDeliveryStatusFilter =
  | "ALL"
  | "NOT_DELIVERED"
  | "PARTIAL"
  | "DELIVERED";

export type SalesSummaryReportQuery = {
  page?: number;
  limit?: number;
  dateFrom?: string;
  dateTo?: string;
  customerId?: string;
  itemId?: string;
  itemCategoryId?: string;
  soStatus?: string;
  deliveryStatus?: SalesDeliveryStatusFilter;
  /** แสดงรายการ/SO ที่ยกเลิกจนเหลือ 0 ด้วย */
  includeCancelled?: boolean;
};

export type ProcurementReportEnvelope<T> = {
  message: string;
  data: T;
};
