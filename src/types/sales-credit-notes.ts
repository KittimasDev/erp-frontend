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

export type SalesCreditNoteItem = {
  id: string;
  pendingId: string;
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
  deliveryOrderId: string;
  deliveryOrderNo: string;
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
  pendingId: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
};

export type SaveSalesCreditNoteBody = {
  creditNoteDate?: string;
  reason?: string;
  remark?: string;
  items: SalesCreditNoteLineInput[];
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
