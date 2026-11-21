/** ตัดยอดใบลดหนี้ + ใบเพิ่มหนี้ลูกหนี้ — ตรงกับ backend `/api/sales-credit-notes/:id/settlements` และ `/api/ar-debit-notes` */
export type CreditNoteSettlement = {
  id: string;
  creditNoteId: string;
  settleType: "OFFSET" | "CREDIT" | string;
  origin?: "AUTO" | "MANUAL" | string;
  salesInvoiceId?: string | null;
  invoiceNo?: string | null;
  amount: string;
  status: "ACTIVE" | "CANCELLED" | string;
  cancelReason?: string | null;
  createdAt: string;
};

export type SettleSuggestion = {
  id: string;
  invoiceNo: string;
  outstandingAmount: string;
  /** AR นี้รวมใบส่งสินค้าเดียวกับใบลดหนี้ */
  sameDelivery: boolean;
};

export type CreditNoteSettlementSummary = {
  creditNoteId: string;
  creditNoteNo: string;
  status: string;
  customerId: string;
  totalAmount: string;
  settledAmount: string;
  remainingAmount: string;
  settlements: CreditNoteSettlement[];
  openInvoices: SettleSuggestion[];
};

export type SettleCreditNoteBody = {
  settleType: "OFFSET" | "CREDIT";
  salesInvoiceId?: string;
  amount: number;
  remark?: string;
};

export const AR_DEBIT_STATUS_LABEL: Record<string, string> = {
  DRAFT: "ร่าง",
  POSTED: "ยืนยันแล้ว",
  CANCELLED: "ยกเลิก",
};

export const AR_DEBIT_STATUS_COLOR: Record<string, string> = {
  DRAFT: "default",
  POSTED: "green",
  CANCELLED: "red",
};

export type ArDebitNote = {
  id: string;
  debitNoteNo: string;
  debitNoteDate: string;
  customerId: string;
  customerName?: string;
  salesInvoiceId: string;
  invoiceNo?: string;
  invoiceDate?: string;
  salesTaxInvoiceId?: string | null;
  taxInvoiceNo?: string | null;
  taxInvoiceDate?: string | null;
  entryMode?: string;
  postingMode?: string;
  items?: ArDebitNoteItem[];
  reason: string;
  subtotalAmount: string;
  vatPercent: string;
  vatAmount: string;
  totalAmount: string;
  status: string;
  remark?: string | null;
  cancelReason?: string | null;
  createdAt: string;
};

export type ArDebitNoteItem = {
  salesInvoiceItemId: string;
  itemCode?: string;
  itemName?: string;
  quantity: string;
  unitPrice: string;
  amount: string;
  vatAmount: string;
  lineTotal: string;
};

export type SaveArDebitNoteLine = {
  salesInvoiceItemId: string;
  quantity: number;
  unitPrice: number;
};

export type SaveArDebitNoteBody = {
  salesInvoiceId: string;
  salesTaxInvoiceId?: string;
  debitNoteDate: string;
  reason: string;
  subtotalAmount?: number;
  items?: SaveArDebitNoteLine[];
  vatPercent?: number;
  remark?: string;
};

export type ArDebitNoteQuery = {
  keyword?: string;
  status?: string;
  customerId?: string;
  page?: number;
  limit?: number;
};

type Api<T> = { success: boolean; message: string; data: T };
export type SettlementSummaryApiResponse = Api<CreditNoteSettlementSummary>;
export type ArDebitNoteApiResponse = Api<ArDebitNote>;
export type ArDebitNoteListApiResponse = Api<{ items: ArDebitNote[]; total: number; page: number; limit: number }>;
