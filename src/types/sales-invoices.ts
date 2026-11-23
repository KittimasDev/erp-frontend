import { STANDARD_STATUS, standardStatusLabel } from "@/lib/status/standard-status";

export type SalesInvoiceStatus = "DRAFT" | "POSTED" | "CANCELLED" | string;
export type SalesInvoicePaymentStatus =
  | "UNPAID"
  | "PARTIALLY_PAID"
  | "PAID"
  | string;

export const SALES_INVOICE_STATUS_LABEL: Record<string, string> = {
  DRAFT: STANDARD_STATUS.DRAFT.th,
  POSTED: "โพสต์แล้ว",
  CANCELLED: STANDARD_STATUS.CANCELLED.th,
};

export const SALES_INVOICE_PAYMENT_STATUS_LABEL: Record<string, string> = {
  UNPAID: "ยังไม่ชำระ",
  PARTIALLY_PAID: "ชำระบางส่วน",
  PAID: "ชำระแล้ว",
};

export const SALES_INVOICE_PAYMENT_METHOD_LABEL: Record<string, string> = {
  CASH: "เงินสด",
  TRANSFER: "โอนเงิน",
  CHEQUE: "เช็ค",
  CREDIT: "หักจากเครดิตลูกค้า",
  CREDIT_NOTE: "หักด้วยใบลดหนี้",
  DEBIT_NOTE: "เพิ่มยอดด้วยใบเพิ่มหนี้",
};

export type SalesInvoiceCustomerSummary = {
  id: string;
  customerCode: string;
  nameTh: string;
};

export type SalesInvoiceSalesOrderSummary = {
  id: string;
  soNo: string;
  status: string;
  totalAmount: string;
};

export type SalesInvoiceDeliveryOrderSummary = {
  id: string;
  deliveryOrderNo: string;
  status: string;
  deliveryDate: string;
};

export type SalesInvoicePaymentTermSummary = {
  id: string;
  code: string;
  name: string;
  creditDays: number;
};

export type SalesInvoiceTaxRateSummary = {
  id: string;
  code: string;
  name: string;
  rate: number;
};

export type SalesInvoiceUserSummary = {
  id: string;
  username: string;
  displayName: string;
};

export type SalesInvoiceItem = {
  id: string;
  salesInvoiceId: string;
  salesOrderItemId: string;
  deliveryOrderItemId: string;
  itemId: string;
  itemCode?: string;
  itemName?: string;
  quantity: string;
  unitId: string;
  unitName?: string;
  unitPrice: string;
  discountAmount: string;
  amount: string;
  sortOrder: number;
};

export type SalesInvoiceAdvanceDeduction = {
  id: string;
  advanceReceiptId: string;
  docNo: string;
  baseAmount: string;
  vatAmount: string;
  amount: string;
};

export type SalesInvoiceAdvanceDeductionInput = {
  advanceReceiptId: string;
  amount: number;
};

export type AdvanceCandidate = {
  id: string;
  docNo: string;
  receiptDate: string;
  totalAmount: string;
  appliedAmount: string;
  remainingAmount: string;
  subtotalAmount: string;
  vatAmount: string;
  remainingBaseAmount: string;
  remainingVatAmount: string;
  vatRate?: string;
  /** (BE ใหม่) ยอดที่ใบแจ้งหนี้ร่างจองไว้ — ยังไม่ตัดจริง */
  reservedAmount?: string;
  /** (BE ใหม่) ยอดที่ใช้จริง (ใบแจ้งหนี้ที่ยืนยันแล้ว) */
  usedAmount?: string;
};

export type AdvanceSuggestedAllocation = {
  advanceReceiptId: string;
  amount: string;
};

export type AdvanceCandidateList = {
  salesOrderId: string;
  depositTotalAmount: string;
  depositAppliedAmount: string;
  /** (BE ใหม่) มัดจำที่ถูกใบร่างจองไว้ — ยังไม่ตัดจริง */
  depositReservedAmount?: string;
  /** (BE ใหม่) มัดจำที่ใช้จริงจากใบที่ยืนยันแล้ว (fallback = depositAppliedAmount) */
  depositUsedAmount?: string;
  depositAvailableAmount: string;
  maxDeductibleAmount: string;
  soBaseAmount?: string;
  priorInvoicedBaseAmount?: string;
  currentBaseAmount?: string;
  currentInvoiceGrossAmount?: string;
  suggestedCumulativeAmount?: string;
  suggestedAmount?: string;
  suggestedAllocations?: AdvanceSuggestedAllocation[];
  items: AdvanceCandidate[];
};

export type SalesInvoicePayment = {
  id: string;
  salesInvoiceId: string;
  paymentMethod: string;
  amount: string;
  paidAt: string;
  transactionRef?: string;
  remark?: string;
  arReceiptId?: string;
  receiptNo?: string;
  /** เฉพาะ paymentMethod = CREDIT_NOTE: ใบลดหนี้ที่หักยอด */
  creditNoteId?: string;
  creditNoteNo?: string;
  createdById?: string;
  createdBy?: SalesInvoiceUserSummary;
  createdAt: string;
};

export type SalesInvoice = {
  id: string;
  invoiceNo: string;
  invoiceDate: string;
  deliveryOrderId: string;
  deliveryOrder?: SalesInvoiceDeliveryOrderSummary;
  /** DN ทั้งหมดที่รวมอยู่ใน AR นี้ (deliveryOrder = ใบแรก) */
  deliveryOrders?: SalesInvoiceDeliveryOrderSummary[];
  salesOrderId: string;
  salesOrder?: SalesInvoiceSalesOrderSummary;
  customerId: string;
  customer?: SalesInvoiceCustomerSummary;
  paymentTermId?: string;
  paymentTerm?: SalesInvoicePaymentTermSummary;
  vatMode?: string;
  /** ฐานจำนวนที่คิดเงิน: ACCEPTED จำนวนที่ลูกค้ารับ · SHIPPED จำนวนที่ส่ง (ออกก่อนส่งของ) */
  quantityBasis?: "ACCEPTED" | "SHIPPED";
  taxRate?: SalesInvoiceTaxRateSummary;
  subtotalAmount: string;
  discountAmount: string;
  vatAmount: string;
  totalAmount: string;
  advanceDeductions?: SalesInvoiceAdvanceDeduction[];
  status: SalesInvoiceStatus;
  paymentStatus?: SalesInvoicePaymentStatus;
  /** ยอดหักด้วยใบลดหนี้ (ไม่ใช่เงินจริง) · เงินชำระจริง = ทุกรายการที่ไม่ใช่ CREDIT_NOTE */
  creditNoteAmount?: string;
  cashPaidAmount?: string;
  dueDate?: string;
  remark?: string;
  createdById?: string;
  createdBy?: SalesInvoiceUserSummary;
  confirmedById?: string;
  confirmedBy?: SalesInvoiceUserSummary;
  confirmedAt?: string;
  paidById?: string;
  paidBy?: SalesInvoiceUserSummary;
  paidAt?: string;
  cancelledById?: string;
  cancelledBy?: SalesInvoiceUserSummary;
  cancelledAt?: string;
  /** (BE ใหม่) เหตุผลที่ยกเลิก */
  cancelReason?: string;
  items: SalesInvoiceItem[];
  payments: SalesInvoicePayment[];
  createdAt: string;
  updatedAt: string;
};

export type PendingSalesInvoiceDelivery = {
  id: string;
  deliveryOrderNo: string;
  deliveryDate: string;
  status: string;
  salesOrderId: string;
  salesOrderNo?: string;
  customerId: string;
  customerName?: string;
  itemCount: number;
  salesOrderTotalAmount?: string;
  /** ยอดที่เรียกเก็บได้ของ DN นี้ (จำนวนที่ลูกค้ารับจริง × ราคา ก่อน VAT) */
  billableAmount?: string;
};

export type CreateSalesInvoiceFromDeliveriesBody = {
  deliveryOrderIds: string[];
  invoiceDate: string;
  dueDate?: string;
  remark?: string;
  advanceDeductions?: SalesInvoiceAdvanceDeductionInput[];
};

export type SalesInvoiceListData = {
  items: SalesInvoice[];
  total: number;
  page: number;
  limit: number;
};

export type PendingSalesInvoiceListData = {
  items: PendingSalesInvoiceDelivery[];
  total: number;
  page: number;
  limit: number;
};

export type SalesInvoiceQueryParams = {
  keyword?: string;
  status?: string;
  paymentStatus?: string;
  customerId?: string;
  deliveryOrderId?: string;
  invoiceDateFrom?: string;
  invoiceDateTo?: string;
  page?: number;
  limit?: number;
};

export type CreateSalesInvoiceFromDeliveryBody = {
  invoiceDate: string;
  dueDate?: string;
  remark?: string;
  advanceDeductions?: SalesInvoiceAdvanceDeductionInput[];
};

export type AdvanceCandidateListApiResponse = {
  statusCode: number;
  message: string;
  data: AdvanceCandidateList;
};

export type UpdateSalesInvoiceBody = {
  invoiceDate?: string;
  dueDate?: string;
  remark?: string;
  /** แทนที่ยอดหักมัดจำของใบร่าง (ส่ง [] เพื่อล้าง) */
  advanceDeductions?: SalesInvoiceAdvanceDeductionInput[];
};

export type SalesInvoiceApiResponse = {
  statusCode: number;
  message: string;
  data: SalesInvoice;
};

export type SalesInvoiceListApiResponse = {
  statusCode: number;
  message: string;
  data: SalesInvoiceListData;
};

export type PendingSalesInvoiceListApiResponse = {
  statusCode: number;
  message: string;
  data: PendingSalesInvoiceListData;
};

export type SalesInvoiceByDeliveryApiResponse = {
  statusCode: number;
  message: string;
  data: SalesInvoice | null;
};

/** ป้ายสถานะ/วิธีชำระตามภาษา — ไทยใช้ค่าคงที่เดิม ("ยกเลิก" ชนกับปุ่ม Cancel) */
export function salesInvoiceStatusLabel(status: string, lang: "th" | "en"): string {
  if (status === "DRAFT") return standardStatusLabel("DRAFT", lang);
  if (status === "CANCELLED") return standardStatusLabel("CANCELLED", lang);
  if (lang === "en") {
    const en: Record<string, string> = { POSTED: "Posted" };
    return en[status] ?? status;
  }
  return SALES_INVOICE_STATUS_LABEL[status] ?? status;
}

export function salesInvoicePaymentStatusLabel(status: string, lang: "th" | "en"): string {
  if (lang === "en") {
    const en: Record<string, string> = { UNPAID: "Unpaid", PARTIALLY_PAID: "Partially paid", PAID: "Paid" };
    return en[status] ?? status;
  }
  return SALES_INVOICE_PAYMENT_STATUS_LABEL[status] ?? status;
}

/**
 * ป้ายสถานะชำระ — ถ้า "ยังไม่มีเงินจริงเข้าเลย" แต่มียอดหักใบลดหนี้ ให้บอกว่าเป็นการหักกับใบลดหนี้
 * (ไม่ใช่ชำระ) · มีเงินจริงเข้าแล้ว/ไม่มียอดหักลดหนี้ ใช้ป้ายเดิม
 * ยอดหักใบลดหนี้ = payment ที่ paymentMethod = CREDIT_NOTE · เงินจริง = ทุกรายการที่ไม่ใช่ CREDIT_NOTE
 */
export function salesInvoicePaymentStatusDisplay(
  status: string,
  creditNoteAmount: number | string | undefined,
  cashPaidAmount: number | string | undefined,
  lang: "th" | "en",
): string {
  const cn = Number(creditNoteAmount ?? 0) || 0;
  const cash = Number(cashPaidAmount ?? 0) || 0;
  if (cn > 0.004 && cash <= 0.004) {
    if (status === "PARTIALLY_PAID") {
      return lang === "en" ? "Partially offset by credit note" : "หักกับใบลดหนี้บางส่วน";
    }
    if (status === "PAID") {
      return lang === "en" ? "Fully offset by credit note" : "หักกับใบลดหนี้ครบแล้ว";
    }
  }
  return salesInvoicePaymentStatusLabel(status, lang);
}

export function salesInvoicePaymentMethodLabel(method: string, lang: "th" | "en"): string {
  if (lang === "en") {
    const en: Record<string, string> = { CASH: "Cash", TRANSFER: "Bank transfer", CHEQUE: "Cheque" };
    return en[method] ?? method;
  }
  return SALES_INVOICE_PAYMENT_METHOD_LABEL[method] ?? method;
}
