export const AGING_BUCKET_LABEL: Record<string, string> = {
  not_due: "ยังไม่ครบกำหนด",
  "1_30": "1-30 วัน",
  "31_60": "31-60 วัน",
  "61_90": "61-90 วัน",
  over_90: "เกิน 90 วัน",
};

export type QueryArAgingReportParams = {
  dateFrom?: string;
  dateTo?: string;
  customerId?: string;
  page?: number;
  limit?: number;
};

export type ArAgingRow = {
  invoiceId: string;
  invoiceNo: string;
  invoiceDate: string;
  dueDate?: string;
  customerId: string;
  customerCode?: string;
  customerName?: string;
  totalAmount: string;
  paidAmount: string;
  outstandingAmount: string;
  paymentStatus: string;
  agingBucket: string;
  daysOverdue: number;
};

export type ArAgingSummary = {
  totalInvoiced: string;
  totalPaid: string;
  totalOutstanding: string;
  overdueAmount: string;
  notDueAmount: string;
  bucket1To30: string;
  bucket31To60: string;
  bucket61To90: string;
  bucketOver90: string;
};

export type ArAgingReportData = {
  items: ArAgingRow[];
  total: number;
  page: number;
  limit: number;
  summary: ArAgingSummary;
};

export type ArAgingReportApiResponse = {
  statusCode?: number;
  message: string;
  data: ArAgingReportData;
};
