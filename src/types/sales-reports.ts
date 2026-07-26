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

export type QuerySalesInvoiceSummaryReportParams = {
  dateFrom?: string;
  dateTo?: string;
  customerId?: string;
  status?: string;
  paymentStatus?: string;
  salesOrderId?: string;
  deliveryOrderId?: string;
  page?: number;
  limit?: number;
};

export type SalesInvoiceSummaryRow = {
  invoiceId: string;
  invoiceNo: string;
  invoiceDate: string;
  dueDate?: string;
  customerId: string;
  customerCode?: string;
  customerName?: string;
  salesOrderId?: string;
  salesOrderNo?: string;
  deliveryOrderId?: string;
  deliveryOrderNo?: string;
  subtotalAmount: string;
  discountAmount: string;
  vatAmount: string;
  totalAmount: string;
  paidAmount: string;
  outstandingAmount: string;
  status: string;
  paymentStatus?: string;
};

export type SalesInvoiceSummaryTotals = {
  invoiceCount: number;
  totalAmount: string;
  totalPaid: string;
  totalOutstanding: string;
};

export type SalesInvoiceSummaryReportData = {
  items: SalesInvoiceSummaryRow[];
  total: number;
  page: number;
  limit: number;
  summary: SalesInvoiceSummaryTotals;
};

export type SalesInvoiceSummaryReportApiResponse = {
  statusCode?: number;
  message: string;
  data: SalesInvoiceSummaryReportData;
};

export type QuerySalesPaymentReportParams = {
  dateFrom?: string;
  dateTo?: string;
  customerId?: string;
  salesInvoiceId?: string;
  paymentMethod?: string;
  page?: number;
  limit?: number;
};

export type SalesPaymentReportRow = {
  paymentId: string;
  paymentDate: string;
  invoiceId: string;
  invoiceNo: string;
  customerId: string;
  customerCode?: string;
  customerName?: string;
  amount: string;
  paymentMethod: string;
  transactionRef?: string;
  createdById?: string;
  createdByName?: string;
};

export type SalesPaymentReportTotals = {
  paymentCount: number;
  totalAmount: string;
};

export type SalesPaymentReportData = {
  items: SalesPaymentReportRow[];
  total: number;
  page: number;
  limit: number;
  summary: SalesPaymentReportTotals;
};

export type SalesPaymentReportApiResponse = {
  statusCode?: number;
  message: string;
  data: SalesPaymentReportData;
};
