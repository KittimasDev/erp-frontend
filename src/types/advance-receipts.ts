export type AdvanceReceiptType = "DEPOSIT" | "PREPAYMENT";
export type AdvanceReceiptStatus = "DRAFT" | "RECEIVED" | "FULLY_APPLIED" | "CANCELLED";

export type AdvanceReceipt = {
  id: string;
  docNo: string;
  docType: AdvanceReceiptType | string;
  status: AdvanceReceiptStatus | string;
  customerId: string;
  customerCode?: string;
  customerName?: string;
  salesOrderId: string;
  soNo?: string;
  receiptDate: string;
  paymentMethod: string;
  companyBankAccountId?: string;
  transactionRef?: string;
  percent: string;
  subtotalAmount: string;
  vatAmount: string;
  totalAmount: string;
  vatMode: string;
  vatRate?: string;
  appliedAmount: string;
  remainingAmount: string;
  arReceiptId?: string;
  receiptNo?: string;
  remark?: string;
  cancelReason?: string;
  createdAt: string;
};

export type AdvanceReceiptSuggestion = {
  salesOrderId: string;
  soNo: string;
  customerId: string;
  customerCode?: string;
  customerName: string;
  termType?: string;
  termName?: string;
  percent: number;
  soTotalAmount: string;
  vatMode: string;
  vatRate?: number;
  suggestedTotal?: string;
  subtotalAmount?: string;
  vatAmount?: string;
  totalAmount?: string;
};

export type AdvanceSalesOrderOption = {
  id: string;
  soNo: string;
  status: string;
  customerId: string;
  customerCode?: string;
  customerName: string;
};

export type AdvanceReceiptInput = {
  salesOrderId: string;
  docType: string;
  receiptDate: string;
  totalAmount: number;
  paymentMethod: string;
  companyBankAccountId?: string;
  transactionRef?: string;
  remark?: string;
};

export const ADVANCE_TYPE_LABEL: Record<string, string> = {
  DEPOSIT: "มัดจำ",
  PREPAYMENT: "เงินล่วงหน้า",
};

export const ADVANCE_STATUS_LABEL: Record<string, string> = {
  DRAFT: "ร่าง",
  RECEIVED: "รับเงินแล้ว",
  FULLY_APPLIED: "หักหมดแล้ว",
  CANCELLED: "ยกเลิก",
};

export const ADVANCE_STATUS_COLOR: Record<string, string> = {
  DRAFT: "default",
  RECEIVED: "green",
  FULLY_APPLIED: "blue",
  CANCELLED: "red",
};
