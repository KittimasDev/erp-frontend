export type AdvanceReceiptType = "DEPOSIT" | "PREPAYMENT";
export type AdvanceReceiptStatus = "DRAFT" | "RECEIVED" | "FULLY_APPLIED" | "CANCELLED";

/** ประวัติการนำใบรับเงินล่วงหน้าไปหักในใบแจ้งหนี้ (DRAFT = จองไว้ · POSTED = ใช้จริง) */
export type AdvanceReceiptApplication = {
  id: string;
  salesInvoiceId: string;
  invoiceNo: string;
  invoiceDate?: string;
  /** สถานะใบแจ้งหนี้: DRAFT | POSTED | CANCELLED */
  status: string;
  amount: string;
  baseAmount: string;
  vatAmount: string;
};

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
  /** (BE ใหม่) ยอดที่ใบแจ้งหนี้ร่างจองไว้ (applications สถานะ DRAFT) */
  reservedAmount?: string;
  /** (BE ใหม่) ยอดที่ใช้จริง (applications สถานะ POSTED) */
  usedAmount?: string;
  remainingAmount: string;
  /** (BE ใหม่) ประวัติการนำไปหัก */
  applications?: AdvanceReceiptApplication[];
  arReceiptId?: string;
  receiptNo?: string;
  /** สถานะใบรับชำระที่ผูกไว้ (POSTED / CANCELLED) */
  receiptStatus?: string;
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
  /** เพดานรับเงินล่วงหน้าของ SO */
  ceilingAmount?: string;
  /** ยอด Advance ที่รับแล้ว (ไม่นับ CANCELLED / ไม่รวมใบที่กำลังแก้) */
  receivedAmount?: string;
  /** ยอดที่ยังรับได้อีก */
  remainingReceivableAmount?: string;
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
