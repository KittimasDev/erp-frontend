/** ใบวางบิลฝั่งขาย (ลูกหนี้) — ตรงกับ backend `/api/ar-billing-notes` */
export type ArBillingNoteStatus = "DRAFT" | "CONFIRMED" | "CANCELLED";

export const AR_BILLING_STATUS_LABEL: Record<string, string> = {
  DRAFT: "ร่าง",
  CONFIRMED: "ยืนยันแล้ว",
  CANCELLED: "ยกเลิก",
};

export const AR_BILLING_STATUS_COLOR: Record<string, string> = {
  DRAFT: "default",
  CONFIRMED: "green",
  CANCELLED: "red",
};

export type PendingArInvoice = {
  id: string;
  invoiceNo: string;
  invoiceDate: string;
  dueDate?: string | null;
  customerId: string;
  customerCode?: string;
  customerName?: string;
  salesOrderNo?: string;
  totalAmount: string;
  paidAmount: string;
  /** ยอดค้างชำระ = ยอดที่วางบิล */
  outstandingAmount: string;
};

export type ArBillingNoteItem = {
  id: string;
  salesInvoiceId: string;
  invoiceNo: string;
  invoiceDate: string;
  dueDate?: string | null;
  salesOrderNo?: string;
  invoiceTotalAmount: string;
  /** ยอดที่วางบิล */
  amount: string;
  /** ยอดค้างชำระปัจจุบันของ AR (อาจต่างจากยอดที่วางบิลถ้ามีรับชำระหลังวางบิล) */
  currentOutstanding: string;
};

export type ArBillingNote = {
  id: string;
  billingNo: string;
  billingDate: string;
  customerId: string;
  customerCode?: string;
  customerName?: string;
  totalAmount: string;
  appointmentDate?: string | null;
  remark?: string | null;
  status: ArBillingNoteStatus | string;
  itemCount: number;
  createdByName?: string;
  confirmedByName?: string;
  confirmedAt?: string;
  cancelledByName?: string;
  cancelledAt?: string;
  cancelReason?: string | null;
  createdAt: string;
  items: ArBillingNoteItem[];
};

export type ArBillingNoteListData = {
  items: ArBillingNote[];
  total: number;
  page: number;
  limit: number;
};

export type PendingArInvoiceListData = {
  items: PendingArInvoice[];
  total: number;
  page: number;
  limit: number;
};

export type ArBillingNoteQuery = {
  keyword?: string;
  status?: string;
  customerId?: string;
  page?: number;
  limit?: number;
};

export type PendingArInvoiceQuery = {
  keyword?: string;
  customerId?: string;
  page?: number;
  limit?: number;
};

export type SaveArBillingNoteBody = {
  customerId: string;
  salesInvoiceIds: string[];
  billingDate?: string;
  appointmentDate?: string;
  remark?: string;
};

export type ArBillingNoteApiResponse = {
  success: boolean;
  message: string;
  data: ArBillingNote;
};

export type ArBillingNoteListApiResponse = {
  success: boolean;
  message: string;
  data: ArBillingNoteListData;
};

export type PendingArInvoiceListApiResponse = {
  success: boolean;
  message: string;
  data: PendingArInvoiceListData;
};
