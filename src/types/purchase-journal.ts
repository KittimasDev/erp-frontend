export type JournalDocType = "AP_INVOICE" | "DEBIT_NOTE" | "CREDIT_NOTE";
export type JournalExpressStatus = "PENDING" | "EXPORTED";

export const JOURNAL_DOC_TYPE_LABEL: Record<JournalDocType, string> = {
  AP_INVOICE: "ใบตั้งหนี้",
  DEBIT_NOTE: "ใบเพิ่มหนี้",
  CREDIT_NOTE: "ใบลดหนี้",
};

export type JournalDocRef = { id: string; no: string };

export type JournalTaxGroup = "VAT" | "NON_VAT" | "TAX" | "PAYABLE";

export type JournalLine = {
  /** ลำดับบรรทัดในเอกสาร */
  no: number;
  taxGroup: JournalTaxGroup;
  vatRate?: number;
  /** null = ยังไม่ผูกบัญชี */
  accountCode: string | null;
  accountName: string | null;
  debit: number;
  credit: number;
  description: string;
  /** จำนวน × ราคา */
  detail?: string;
};

export type PurchaseJournalItem = {
  id: string;
  docNo: string;
  docType: JournalDocType;
  docDate: string;
  taxInvoiceNo?: string;
  taxInvoiceDate?: string;
  supplierDocNo?: string;
  supplierDocDate?: string;
  /** ใบลดหนี้เป็นยอดติดลบ */
  subtotalAmount: number;
  vatAmount: number;
  totalAmount: number;
  creditorId: string;
  creditorCode: string;
  creditorName: string;
  creditorTaxId?: string;
  po?: JournalDocRef;
  grns: JournalDocRef[];
  billingNotes: JournalDocRef[];
  paymentVouchers: JournalDocRef[];
  reference?: JournalDocRef & { docType: JournalDocType };
  isExportedToExpress: boolean;
  expressExportedAt?: string;
  lines: JournalLine[];
  totalDebit: number;
  totalCredit: number;
  /** เดบิต = เครดิต */
  balanced: boolean;
  /** การผูกบัญชีที่ยังไม่ได้ตั้ง */
  unmapped: string[];
};

export type PurchaseJournalSummary = {
  subtotalAmount: number;
  vatAmount: number;
  totalAmount: number;
};

export type PurchaseJournalList = {
  items: PurchaseJournalItem[];
  total: number;
  page: number;
  limit: number;
  summary: PurchaseJournalSummary;
  pendingExpressCount: number;
};

export type PurchaseJournalFilter = {
  dateFrom?: string;
  dateTo?: string;
  creditorId?: string;
  docType?: JournalDocType;
  search?: string;
  expressStatus?: JournalExpressStatus;
};

export type PurchaseJournalQuery = PurchaseJournalFilter & { page?: number; limit?: number };

export type ExpressExportBody = {
  dateFrom: string;
  dateTo: string;
  creditorId?: string;
  docType?: JournalDocType;
  search?: string;
  reexport?: boolean;
};

/** ใบสำคัญบัญชีของเอกสารเดียว (หน้ารายละเอียด AP) */
export type PurchaseJournalByDocument = {
  entry: PurchaseJournalItem;
  status: string;
  /** true = เอกสารยังไม่อนุมัติ แสดงเป็นตัวอย่าง */
  preview: boolean;
};
