export type BillingNoteStatus = "DRAFT" | "CONFIRMED" | "CANCELLED";
export type BillingPvStatus = "NONE" | "PARTIAL" | "ALL";

export const BILLING_NOTE_STATUS_LABEL: Record<string, string> = {
  DRAFT: "ร่าง",
  CONFIRMED: "ยืนยันแล้ว",
  CANCELLED: "ยกเลิก",
};
export const BILLING_NOTE_STATUS_COLOR: Record<string, string> = {
  DRAFT: "default",
  CONFIRMED: "green",
  CANCELLED: "red",
};
export const BILLING_PV_STATUS_LABEL: Record<string, string> = {
  NONE: "ยังไม่ออก PV",
  PARTIAL: "ออก PV บางส่วน",
  ALL: "ออก PV ครบแล้ว",
};
export const BILLING_PV_STATUS_COLOR: Record<string, string> = {
  NONE: "default",
  PARTIAL: "gold",
  ALL: "green",
};

export type PendingBillingAp = {
  apId: string;
  docNo: string;
  docDate: string;
  purchaseOrderId?: string;
  poNo?: string;
  creditorId: string;
  creditorCode: string;
  creditorName: string;
  totalAmount: number;
  adjustmentNet: number;
  depositDeductAmount: number;
  billableAmount: number;
  dueDate?: string;
};

export type PendingBillingApList = {
  items: PendingBillingAp[];
  total: number;
  page: number;
  limit: number;
};

export type PendingBillingApQuery = {
  search?: string;
  apDateFrom?: string;
  apDateTo?: string;
  dueFrom?: string;
  dueTo?: string;
  creditorId?: string;
  page?: number;
  limit?: number;
};

export type BillingNoteListItem = {
  id: string;
  billingNo: string;
  billingDate: string;
  creditorId: string;
  creditorCode: string;
  creditorName: string;
  apCount: number;
  totalAmount: number;
  issuedPvAmount: number;
  remainingAmount: number;
  status: BillingNoteStatus;
  pvStatus: BillingPvStatus;
  createdAt: string;
};

export type BillingNoteList = {
  items: BillingNoteListItem[];
  total: number;
  page: number;
  limit: number;
};

export type BillingNoteQuery = {
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  pvStatus?: string;
  creditorId?: string;
  page?: number;
  limit?: number;
};

export type BillingCreateInfo = {
  creditorId: string;
  creditorCode: string;
  creditorName: string;
  items: PendingBillingAp[];
  totalBillable: number;
};

export type SaveBillingNoteBody = {
  creditorId: string;
  billingDate?: string;
  appointmentDate?: string;
  remark?: string;
  items: Array<{ apDocumentId: string; amount: number }>;
};

export type BillingNoteDetailItem = {
  apId: string;
  docNo: string;
  purchaseOrderId?: string;
  poNo?: string;
  dueDate?: string;
  /** ยอดพร้อมวางบิลของ AP ตอนนี้ */
  billableAmount: number;
  /** ยอดที่วางบิลของ AP ใบนี้ในใบวางบิล */
  amount: number;
  issuedAmount: number;
};

export type BillingNotePv = {
  queueItemId: string;
  queueNo: string;
  amount: number;
  queueStatus: string;
  voucherId?: string;
  voucherNo?: string;
  voucherStatus?: string;
  createdAt: string;
};

export type BillingNoteDetail = {
  id: string;
  billingNo: string;
  billingDate: string;
  appointmentDate?: string;
  status: BillingNoteStatus;
  creditorId: string;
  creditorCode: string;
  creditorName: string;
  remark?: string;
  totalAmount: number;
  issuedPvAmount: number;
  remainingAmount: number;
  pvStatus: BillingPvStatus;
  items: BillingNoteDetailItem[];
  pvs: BillingNotePv[];
  createdByName?: string;
  createdAt: string;
  confirmedByName?: string;
  confirmedAt?: string;
  cancelledByName?: string;
  cancelledAt?: string;
  cancelReason?: string;
};

export const BILLING_QUEUE_STATUS_LABEL: Record<string, string> = {
  PENDING: "รอสร้าง PV",
  PV_CREATED: "สร้าง PV แล้ว",
  CANCELLED: "ยกเลิก",
};
