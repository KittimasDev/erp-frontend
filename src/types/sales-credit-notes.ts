export const SALES_CREDIT_NOTE_STATUS_LABEL: Record<string, string> = {
  DRAFT: "ร่าง",
  PENDING_APPROVAL: "รออนุมัติ",
  COMPLETED: "เสร็จสิ้น",
  CANCELLED: "ยกเลิก",
};

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
