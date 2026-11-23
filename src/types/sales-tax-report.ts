/** รายงานภาษีขาย — ตรงกับ backend `GET /api/reports/sales-tax` */
export type SalesTaxDocType = "TAX_INVOICE" | "ADVANCE_TAX_INVOICE" | "CREDIT_NOTE" | "DEBIT_NOTE";

export type SalesTaxReportRow = {
  id: string;
  docType: SalesTaxDocType | string;
  docTypeLabel: string;
  docNo: string;
  docDate: string;
  refNo?: string;
  customerName: string;
  customerTaxId?: string;
  subtotalAmount: number;
  vatAmount: number;
  totalAmount: number;
  /** 1 = เพิ่มภาษีขาย · -1 = ลดภาษีขาย (ใบลดหนี้) */
  sign: number;
};

export type SalesTaxReportSummary = {
  count: number;
  subtotalAmount: number;
  vatAmount: number;
  totalAmount: number;
  byType: Record<string, { count: number; vatAmount: number }>;
};

export type SalesTaxReportData = {
  items: SalesTaxReportRow[];
  summary: SalesTaxReportSummary;
  truncated: boolean;
};

export type SalesTaxReportQuery = {
  dateFrom?: string;
  dateTo?: string;
  docType?: string;
  keyword?: string;
};

export type SalesTaxReportApiResponse = {
  success: boolean;
  message: string;
  data: SalesTaxReportData;
};
