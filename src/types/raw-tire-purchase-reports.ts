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
  createdAt: string;
};

export type RawTirePurchaseReportSummary = {
  totalReceipts: number;
  totalNetWeightKg: string;
  totalAmount: string;
};

export type RawTirePurchaseReportListData = {
  items: RawTirePurchaseReportRow[];
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
  page?: number;
  limit?: number;
};

export type RawTirePurchaseReportListApiResponse = {
  statusCode: number;
  message: string;
  data: RawTirePurchaseReportListData;
};

export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  UNPAID: "ยังไม่จ่าย",
  PARTIAL: "จ่ายบางส่วน",
  PAID: "จ่ายแล้ว",
};

export const STOCK_POSTING_STATUS_LABEL: Record<string, string> = {
  NOT_POSTED: "ยังไม่เข้าคลัง",
  POSTED: "เข้าคลังแล้ว",
  CANCELLED: "ยกเลิก",
};
