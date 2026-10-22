import type { PaymentTermType } from "@/types/payment-terms";

export type PayableItemStatus = "UNPAID" | "PARTIAL" | "PAID" | "OVERDUE";

export const PAYABLE_ITEM_STATUS_LABEL: Record<PayableItemStatus, string> = {
  UNPAID: "ยังไม่จ่าย",
  PARTIAL: "จ่ายแล้วบางส่วน",
  PAID: "จ่ายครบแล้ว",
  OVERDUE: "จ่ายล่าช้า",
};

export const PAYABLE_ITEM_STATUS_COLOR: Record<PayableItemStatus, string> = {
  UNPAID: "default",
  PARTIAL: "gold",
  PAID: "green",
  OVERDUE: "red",
};

/** ตัวกรองประเภทเงื่อนไข — NONE = PO ที่ไม่ได้ระบุเงื่อนไขชำระ */
export type PayableTermTypeFilter = PaymentTermType | "NONE";

export type PayablePaymentTerm = {
  id: string;
  code: string;
  name: string;
  termType: PaymentTermType;
  creditDays: number;
  advancePercent: number;
};

export type PayablePurchaseOrder = {
  id: string;
  poNo: string;
  poDate: string;
  expectedDeliveryDate: string | null;
  poStatus: string;
  receiveStatus: string;
  creditor: { id: string; creditorCode: string; nameTh: string } | null;
  paymentTerm: PayablePaymentTerm | null;
  totalAmount: number;
  amountDue: number;
  /** ค่าสินค้า (รวม VAT) = ยอด PO − ค่าใช้จ่ายเพิ่มเติมรวม VAT */
  goodsAmount: number;
  /** ค่าใช้จ่ายเพิ่มเติมตาม PO (รวม VAT) — รวมอยู่ใน totalAmount แล้ว */
  extraChargesAmount: number;
  /** ค่าใช้จ่ายเพิ่มเติมที่ตั้งหนี้แล้ว (รวม VAT) */
  extraChargesInvoiced: number;
  /** ค่าใช้จ่ายเพิ่มเติมที่ยังไม่ได้ตั้งหนี้ (รวม VAT) */
  extraChargesRemaining: number;
  dueDate: string | null;
  /** วันครบกำหนดแยกตามใบตั้งหนี้ (ว่าง = ยังใช้ประมาณการ dueDate จากเงื่อนไข PO) */
  apDueDates: PayableApDueDate[];
  payableStatus: PayableItemStatus;
};

export type PayableApDueDate = {
  id: string;
  docNo: string;
  dueDate: string;
  totalAmount: number;
};

export type PayablePurchaseOrderLine = {
  id: string;
  itemCode: string | null;
  itemName: string | null;
  description: string | null;
  quantity: number;
  unitName: string | null;
  unitPrice: number;
  discountAmount: number;
  amount: number;
};

export type PaymentInstallmentKind =
  | "DEPOSIT"
  | "BALANCE"
  | "ON_RECEIPT"
  | "CREDIT"
  | "FULL";

/** งวดในแผนการจ่ายตาม PO — ไม่ใช่ประวัติการจ่ายจริง */
export type PaymentInstallment = {
  seq: number;
  kind: PaymentInstallmentKind;
  label: string;
  percent: number;
  amount: number;
  dueDate: string | null;
  dueNote: string;
};

export type CreditBaseSource = "EXPECTED_DELIVERY" | "PO_DATE" | "AP_INVOICE";

export const CREDIT_BASE_SOURCE_LABEL: Record<CreditBaseSource, string> = {
  EXPECTED_DELIVERY: "วันส่งมอบที่ระบุใน PO",
  PO_DATE: "วันที่ PO (PO ไม่ระบุวันส่งมอบ)",
  AP_INVOICE: "วันครบกำหนดของใบตั้งหนี้",
};

export type PaymentPlan = {
  termType: PaymentTermType | null;
  depositPercent: number | null;
  depositAmount: number | null;
  remainingAmount: number | null;
  creditDays: number | null;
  creditBaseDate: string | null;
  creditBaseSource: CreditBaseSource | null;
  installments: PaymentInstallment[];
};

export type PayablePurchaseOrderDetail = PayablePurchaseOrder & {
  currency: string;
  amountBeforeVat: number;
  paymentPlan: PaymentPlan;
  vatMode: string;
  subtotalAmount: number;
  discountAmount: number;
  vatAmount: number;
  paymentMethod: string | null;
  remark: string | null;
  approvedAt: string | null;
  items: PayablePurchaseOrderLine[];
};

export type PayablePurchaseOrderQueryParams = {
  page?: number;
  limit?: number;
  search?: string;
  supplier?: string;
  poDateFrom?: string;
  poDateTo?: string;
  termType?: PayableTermTypeFilter;
  status?: PayableItemStatus;
};

export type PayablePurchaseOrderSummary = {
  unpaid: number;
  partial: number;
  paid: number;
  overdue: number;
};

export type PayablePurchaseOrderListData = {
  items: PayablePurchaseOrder[];
  total: number;
  page: number;
  limit: number;
  summary: PayablePurchaseOrderSummary;
};

export type PayablePurchaseOrderListResponse = {
  message: string;
  data: PayablePurchaseOrderListData;
};

export type PayablePurchaseOrderDetailResponse = {
  message: string;
  data: PayablePurchaseOrderDetail;
};
