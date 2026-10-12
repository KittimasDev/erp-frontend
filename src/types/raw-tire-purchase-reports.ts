export type RawTirePurchaseReportRow = {
  id: string;
  receiptNo: string;
  receiptDate: string;
  sellerCode?: string;
  sellerName?: string;
  truckLicensePlate?: string;
  netWeightKg: string;
  deductionWeightKg: string;
  payableWeightKg: string;
  subtotalAmount: string;
  deductionAmount: string;
  totalAmount: string;
  paymentStatus: string;
  stockPostingStatus: string;
  status: string;
  currentStep?: string;
  nextAction?: string;
  nextActionHref?: string;
  createdAt: string;
};

export type RawTirePurchaseReportSummary = {
  totalReceipts: number;
  totalNetWeightKg: string;
  totalAmount: string;
};

/** ยอดรวมต่อวัน — backend คิดจากทั้งชุดที่กรอง (ไม่ใช่เฉพาะแถวในหน้า) */
export type RawTirePurchaseReportDailySummary = {
  /** YYYY-MM-DD */
  date: string;
  receiptCount: number;
  netWeightKg: string;
  totalAmount: string;
};

export type RawTirePurchaseReportListData = {
  items: RawTirePurchaseReportRow[];
  dailySummaries: RawTirePurchaseReportDailySummary[];
  total: number;
  page: number;
  limit: number;
  summary: RawTirePurchaseReportSummary;
};

export type RawTirePurchaseReportQueryParams = {
  dateFrom?: string;
  dateTo?: string;
  sellerId?: string;
  tireClassificationId?: string;
  paymentStatus?: string;
  stockPostingStatus?: string;
  page?: number;
  limit?: number;
};

export type RawTirePurchaseReportListApiResponse = {
  statusCode: number;
  message: string;
  data: RawTirePurchaseReportListData;
};

/** รายเดือน — น้ำหนักเป็น กก. ล้วนและเงินเป็นบาท (ไม่มีจำนวนสินค้าหลายหน่วยมาปนกัน) */
export type RawTirePurchaseReportMonthRow = {
  /** YYYY-MM (ค.ศ.) */
  month: string;
  receiptCount: number;
  netWeightKg: string;
  deductionWeightKg: string;
  payableWeightKg: string;
  subtotalAmount: string;
  deductionAmount: string;
  totalAmount: string;
};

export type RawTirePurchaseReportMonthlyData = {
  items: RawTirePurchaseReportMonthRow[];
  summary: RawTirePurchaseReportSummary;
};

export type RawTirePurchaseReportMonthlyApiResponse = {
  statusCode: number;
  message: string;
  data: RawTirePurchaseReportMonthlyData;
};

export type RawTirePurchaseReportViewMode = "daily" | "monthly";

export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  UNPAID: "ยังไม่จ่าย",
  PARTIAL: "จ่ายบางส่วน",
  PAID: "จ่ายแล้ว",
};

export const STOCK_POSTING_STATUS_LABEL: Record<string, string> = {
  NOT_POSTED: "ยังไม่เข้าคลัง",
  // เดิมไม่มีป้ายนี้ ใบที่เข้าคลังบางส่วนจึงโชว์รหัสดิบ PARTIALLY_POSTED
  PARTIALLY_POSTED: "เข้าคลังบางส่วน",
  POSTED: "เข้าคลังแล้ว",
  CANCELLED: "ยกเลิก",
};

/**
 * สถานะคลังที่เลือกกรองได้ — ไม่ใส่ CANCELLED: รายงานนี้มีแต่ใบ CONFIRMED
 * ซึ่งไม่เคยมีสถานะคลัง CANCELLED ใส่ไปตัวกรองจะได้ผลว่างเสมอ (ต้องตรงกับ backend)
 */
export const STOCK_POSTING_FILTER_OPTIONS = [
  "NOT_POSTED",
  "PARTIALLY_POSTED",
  "POSTED",
] as const;
