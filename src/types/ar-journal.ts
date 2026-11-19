import type { JournalLine } from "@/types/purchase-journal";

/** สมุดรายวันขาย / สมุดรายวันรับ (ฝั่งลูกหนี้) — ตรงกับ backend `/api/reports/journals/sales|receipts` */
export type ArJournalKind = "SALES" | "RECEIPT";
export type ArJournalEvent = "POST" | "REVERSAL";

export type ArJournalSourceType =
  | "AR_INVOICE"
  | "CREDIT_NOTE"
  | "DEBIT_NOTE"
  | "RECEIPT"
  | "DEPOSIT"
  | "CREDIT_APPLY"
  | "CN_CREDIT"
  | "REFUND";

export const AR_SOURCE_LABEL: Record<ArJournalSourceType, string> = {
  AR_INVOICE: "ใบตั้งลูกหนี้ (ขาย)",
  CREDIT_NOTE: "ใบลดหนี้",
  DEBIT_NOTE: "ใบเพิ่มหนี้",
  RECEIPT: "รับชำระหนี้",
  DEPOSIT: "รับเงินมัดจำ/ล่วงหน้า",
  CREDIT_APPLY: "ใช้เครดิตลูกค้าหักหนี้",
  CN_CREDIT: "ใบลดหนี้เข้าเครดิตลูกค้า",
  REFUND: "คืนเงินลูกค้า",
};

export const AR_SOURCE_COLOR: Record<ArJournalSourceType, string> = {
  AR_INVOICE: "blue",
  CREDIT_NOTE: "volcano",
  DEBIT_NOTE: "geekblue",
  RECEIPT: "green",
  DEPOSIT: "gold",
  CREDIT_APPLY: "cyan",
  CN_CREDIT: "purple",
  REFUND: "orange",
};

export const SALES_JOURNAL_SOURCES: ArJournalSourceType[] = ["AR_INVOICE", "CREDIT_NOTE", "DEBIT_NOTE"];
export const RECEIPT_JOURNAL_SOURCES: ArJournalSourceType[] = [
  "RECEIPT",
  "DEPOSIT",
  "CREDIT_APPLY",
  "CN_CREDIT",
  "REFUND",
];

export type ArJournalStatusFilter = "NORMAL" | "REVERSAL" | "REVERSED";
export type ArJournalExpressStatus = "PENDING" | "EXPORTED";

export type ArJournalRef = {
  id: string;
  no: string;
  type: "AR_INVOICE" | "SALES_ORDER" | "CREDIT_NOTE" | "RECEIPT";
};

export type ArJournalEntry = {
  /** `{ประเภท}:{id}:{POST|REVERSAL}` */
  id: string;
  entryNo: string;
  kind: ArJournalKind;
  sourceType: ArJournalSourceType;
  sourceLabel: string;
  event: ArJournalEvent;
  sourceId: string;
  docNo: string;
  postingDate: string;
  transactionDate?: string;
  customerId: string;
  customerCode: string;
  customerName: string;
  customerTaxId?: string;
  description: string;
  refs: ArJournalRef[];
  docStatus: string;
  /** รายการนี้ถูกกลับรายการแล้ว */
  reversed: boolean;
  subtotalAmount?: number;
  vatAmount?: number;
  totalAmount?: number;
  paymentMethod?: string;
  bankLabel?: string;
  transactionRef?: string;
  receivedAmount?: number;
  whtAmount?: number;
  exportCount: number;
  lastExportedAt?: string;
  /** บรรทัดบัญชีมาจาก snapshot ตอนส่งออก */
  frozen: boolean;
  lines: JournalLine[];
  totalDebit: number;
  totalCredit: number;
  balanced: boolean;
  unmapped: string[];
};

export type ArJournalSummary = {
  entryCount: number;
  totalDebit: number;
  totalCredit: number;
  subtotalAmount: number;
  vatAmount: number;
  totalAmount: number;
  receivedAmount: number;
};

export type ArJournalList = {
  items: ArJournalEntry[];
  total: number;
  page: number;
  limit: number;
  summary: ArJournalSummary;
  pendingExpressCount: number;
  unmappedCount: number;
  unbalancedCount: number;
};

export type ArJournalFilter = {
  dateFrom?: string;
  dateTo?: string;
  customerId?: string;
  sourceType?: ArJournalSourceType;
  status?: ArJournalStatusFilter;
  search?: string;
  expressStatus?: ArJournalExpressStatus;
};

export type ArJournalQuery = ArJournalFilter & { page?: number; limit?: number };

export type ArExpressExportBody = {
  dateFrom?: string;
  dateTo?: string;
  customerId?: string;
  sourceType?: ArJournalSourceType;
  search?: string;
  documentIds?: string[];
  reexport?: boolean;
};
