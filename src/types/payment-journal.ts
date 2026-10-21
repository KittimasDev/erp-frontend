import type { JournalLine } from "@/types/purchase-journal";

export type PaymentJournalKind = "AP_PAYMENT" | "ADVANCE_FULL" | "DEPOSIT";
export type PaymentJournalMethod = "TRANSFER" | "CHEQUE" | "CASH";
export type PaymentJournalExpressStatus = "PENDING" | "EXPORTED";

export const PAYMENT_KIND_LABEL: Record<PaymentJournalKind, string> = {
  AP_PAYMENT: "ชำระหนี้ AP",
  ADVANCE_FULL: "จ่ายล่วงหน้า 100%",
  DEPOSIT: "จ่ายมัดจำ",
};

export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  TRANSFER: "โอนเงิน",
  CHEQUE: "เช็ค",
  CASH: "เงินสด/อื่นๆ",
};

export type PaymentDocRef = { id: string; no: string };

export type PaymentJournalItem = {
  /** รหัสรายการบันทึกจ่ายเงิน */
  id: string;
  paymentNo?: string;
  paymentDate: string;
  voucher: PaymentDocRef;
  voucherDate: string;
  kind: PaymentJournalKind;
  kindLabel: string;
  paymentMethod: string;
  transactionRef?: string;
  chequeNo?: string;
  bankName?: string;
  bankAccountNumber?: string;
  creditorId: string;
  creditorCode: string;
  creditorName: string;
  creditorTaxId?: string;
  po?: PaymentDocRef;
  advanceRequest?: PaymentDocRef;
  aps: Array<PaymentDocRef & { amount: number }>;
  /** ยอดรวมก่อนหัก ณ ที่จ่าย */
  grossAmount: number;
  whtAmount: number;
  /** ยอดจ่ายจริง */
  netAmount: number;
  isExportedToExpress: boolean;
  expressExportedAt?: string;
  lines: JournalLine[];
  totalDebit: number;
  totalCredit: number;
  balanced: boolean;
  unmapped: string[];
};

export type PaymentJournalSummary = {
  grossAmount: number;
  whtAmount: number;
  netAmount: number;
};

export type PaymentJournalList = {
  items: PaymentJournalItem[];
  total: number;
  page: number;
  limit: number;
  summary: PaymentJournalSummary;
  pendingExpressCount: number;
};

export type PaymentJournalFilter = {
  dateFrom?: string;
  dateTo?: string;
  creditorId?: string;
  kind?: PaymentJournalKind;
  method?: PaymentJournalMethod;
  search?: string;
  expressStatus?: PaymentJournalExpressStatus;
};

export type PaymentJournalQuery = PaymentJournalFilter & { page?: number; limit?: number };

export type PaymentExpressExportBody = {
  dateFrom: string;
  dateTo: string;
  creditorId?: string;
  kind?: PaymentJournalKind;
  method?: PaymentJournalMethod;
  search?: string;
  reexport?: boolean;
};
