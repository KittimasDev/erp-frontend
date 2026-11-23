import {
  STANDARD_STATUS,
  standardStatusColor,
  standardStatusLabel,
  type StandardStatus,
} from "@/lib/status/standard-status";

export const SALES_CREDIT_NOTE_STATUS_LABEL: Record<string, string> = {
  DRAFT: STANDARD_STATUS.DRAFT.th,
  PENDING_APPROVAL: STANDARD_STATUS.PENDING_APPROVAL.th,
  COMPLETED: STANDARD_STATUS.COMPLETED.th,
  CANCELLED: STANDARD_STATUS.CANCELLED.th,
};

/** ทุกสถานะของใบลดหนี้ขายตรงกับสถานะมาตรฐาน (COMPLETED = อนุมัติแล้วและมีผล) */
const CREDIT_NOTE_STANDARD: Record<string, StandardStatus> = {
  DRAFT: "DRAFT",
  PENDING_APPROVAL: "PENDING_APPROVAL",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
};

export function salesCreditNoteStatusColor(status: string): string {
  const std = CREDIT_NOTE_STANDARD[status];
  return std ? standardStatusColor(std) : "default";
}

export type SalesCreditNotePendingRow = {
  id: string;
  deliveryOrderId: string;
  deliveryOrderNo: string;
  salesOrderId: string;
  salesOrderNo: string;
  customerId: string;
  customerName: string;
  itemCode: string;
  itemName: string;
  unitName: string;
  quantity: number;
  reservedQuantity: number;
  remainingQuantity: number;
  unitPrice: number;
  reason?: string;
};

export const SALES_CREDIT_NOTE_REASON_LABEL: Record<string, string> = {
  PRICE_REDUCTION: "ลดราคา",
  GOODS_RETURN: "คืนสินค้า",
  WRONG_PRICE: "คิดราคาผิด",
  WRONG_DISCOUNT: "คำนวณส่วนลดผิด",
  DEFECTIVE: "สินค้าชำรุด",
  OTHER: "อื่นๆ",
};

export type SalesCreditNoteItem = {
  id: string;
  pendingId?: string | null;
  salesInvoiceItemId?: string | null;
  itemCode: string;
  itemName: string;
  unitName: string;
  quantity: number;
  remainingQuantity: number;
  unitPrice: number;
  discountAmount: number;
  amount: number;
  vatAmount: number;
  lineTotal: number;
  /** ใบส่งสินค้าต้นทางของบรรทัดนี้: จำนวนที่ลูกค้ารับ / ตีกลับ */
  deliveryAcceptedQuantity?: number;
  deliveryReturnedQuantity?: number;
};

export type SalesCreditNote = {
  id: string;
  creditNoteNo: string;
  creditNoteDate: string;
  status: string;
  customerId: string;
  customerName: string;
  salesOrderId: string;
  salesOrderNo: string;
  deliveryOrderId?: string | null;
  deliveryOrderNo?: string;
  salesInvoiceId?: string | null;
  invoiceNo?: string;
  invoiceDate?: string;
  salesTaxInvoiceId?: string | null;
  taxInvoiceNo?: string;
  taxInvoiceDate?: string;
  reasonCode?: string | null;
  isReturn?: boolean;
  /** จากใบส่ง — false = ตอนตีกลับไม่นำเข้าคลัง */
  returnToStock?: boolean | null;
  /** สร้างใบรับคืนได้เมื่อคืนสินค้า + นำเข้าคลัง */
  canCreateReturnNote?: boolean;
  sourceSubtotalAmount?: number;
  sourceVatAmount?: number;
  sourceTotalAmount?: number;
  cancelReason?: string | null;
  reason?: string;
  remark?: string;
  vatMode: string;
  vatRate: number;
  grossAmount: number;
  discountAmount: number;
  subtotalAmount: number;
  vatAmount: number;
  totalAmount: number;
  createdByName?: string;
  approvedByName?: string;
  approvedAt?: string;
  items: SalesCreditNoteItem[];
};

export type SalesCreditNoteLineInput = {
  pendingId?: string;
  salesInvoiceItemId?: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  adjustmentAmount?: number;
};

export type SaveSalesCreditNoteBody = {
  salesInvoiceId: string;
  salesTaxInvoiceId?: string;
  creditNoteDate?: string;
  reasonCode: string;
  reason: string;
  isReturn?: boolean;
  remark?: string;
  items: SalesCreditNoteLineInput[];
};

export type CreditNoteInvoiceCandidate = {
  id: string;
  invoiceNo: string;
  invoiceDate: string;
  customerId: string;
  customerName: string;
  subtotalAmount: string;
  vatAmount: string;
  totalAmount: string;
  salesTaxInvoiceId?: string | null;
  taxInvoiceNo?: string | null;
  taxInvoiceDate?: string | null;
};

export type CreditNoteInvoiceSourceLine = {
  id: string;
  itemCode: string;
  itemName: string;
  unitName: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  amount: number;
  creditedQuantity: number;
  creditedAmount: number;
  remainingQuantity: number;
  remainingAmount: number;
  /** ใบส่งสินค้าของบรรทัดนี้: ลูกค้ารับ / ตีกลับ (ตีกลับ > 0 = เตือนไม่ให้ลดหนี้ซ้ำ) */
  acceptedQuantity?: number;
  returnedQuantity?: number;
};

export type CreditNoteInvoiceSource = {
  id: string;
  invoiceNo: string;
  invoiceDate: string;
  customerId: string;
  vatMode: string;
  /** ฐานจำนวนที่ใบแจ้งหนี้คิดเงิน — SHIPPED = ของตีกลับอยู่ในบิล ลดหนี้คืนสินค้าได้ */
  quantityBasis?: "ACCEPTED" | "SHIPPED";
  vatRate: number;
  subtotalAmount: string;
  vatAmount: string;
  totalAmount: string;
  lines: CreditNoteInvoiceSourceLine[];
  taxInvoices: Array<{
    id: string;
    taxInvoiceNo: string;
    taxInvoiceDate: string;
    status: string;
  }>;
};

type ApiEnvelope<T> = {
  statusCode: number;
  message: string;
  data: T;
};

export type SalesCreditNotePendingListResponse = ApiEnvelope<{
  items: SalesCreditNotePendingRow[];
  total: number;
}>;

export type SalesCreditNoteListResponse = ApiEnvelope<{
  items: SalesCreditNote[];
  total: number;
  page: number;
  limit: number;
}>;

export type SalesCreditNoteResponse = ApiEnvelope<SalesCreditNote>;

/** ป้ายสถานะตามภาษา — ไทยใช้ SALES_CREDIT_NOTE_STATUS_LABEL เดิม ("ยกเลิก" ชนกับปุ่ม Cancel) */
export function salesCreditNoteStatusLabel(status: string, lang: "th" | "en"): string {
  const std = CREDIT_NOTE_STANDARD[status];
  if (std) return standardStatusLabel(std, lang);
  return SALES_CREDIT_NOTE_STATUS_LABEL[status] ?? status;
}
