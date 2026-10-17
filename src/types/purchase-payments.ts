export type SupplierPaymentVoucherStatus =
  | "DRAFT"
  | "PAID"
  | "CANCELLED"
  | string;

export const SUPPLIER_PAYMENT_STATUS_LABEL: Record<string, string> = {
  DRAFT: "แบบร่างเอกสาร",
  PENDING_APPROVAL: "รออนุมัติ",
  REJECTED: "ไม่อนุมัติ",
  APPROVED: "อนุมัติแล้ว (รอจ่ายเงิน)",
  PAID: "จ่ายแล้ว",
  CANCELLED: "ยกเลิก",
};

export const SUPPLIER_PAYMENT_METHOD_LABEL: Record<string, string> = {
  CASH: "เงินสด",
  TRANSFER: "โอนเงิน",
  CHEQUE: "เช็ค",
};

export type SupplierPaymentCreditorSummary = {
  id: string;
  creditorCode: string;
  nameTh: string;
};

export type SupplierPaymentPoSummary = {
  id: string;
  poNo: string;
  status: string;
  paymentStatus: string;
  totalAmount: string;
};

export type SupplierPaymentTermSummary = {
  id: string;
  code: string;
  name: string;
};

export type SupplierPaymentUserSummary = {
  id: string;
  username: string;
  displayName: string;
};

export type SupplierPaymentLine = {
  id: string;
  voucherId: string;
  purchaseOrderId?: string;
  paymentDate: string;
  paymentMethod: string;
  amount: string;
  transactionRef?: string;
  paidById?: string;
  paidBy?: SupplierPaymentUserSummary;
  remark?: string;
  createdAt: string;
};

export type SupplierPaymentVoucher = {
  id: string;
  voucherNo: string;
  voucherDate: string;
  /** ว่างได้สำหรับ PV ที่มาจากคิว (เช่น ใบวางบิลที่ครอบคลุมหลาย PO) */
  purchaseOrderId?: string;
  /** ประเภทเอกสารต้นทาง — ว่าง = ใบสั่งซื้อ (PV แบบเดิม) */
  sourceType?: "ADVANCE_REQUEST" | "BILLING_NOTE" | string;
  sourceId?: string;
  /** เลขที่เอกสารอ้างอิง (ถ้าเป็น PV จาก PO จะเป็นเลข PO) */
  sourceNo?: string;
  queueItemId?: string;
  /** วันที่ต้องการจ่าย */
  desiredPayDate?: string;
  /** วัน-เวลาที่อนุมัติ */
  approvedAt?: string;
  paymentKind?: string;
  whtAmount: string;
  /** ยอดสุทธิหลังหัก ณ ที่จ่าย */
  netAmount: string;
  purchaseOrder?: SupplierPaymentPoSummary;
  creditorId: string;
  creditor?: SupplierPaymentCreditorSummary;
  paymentTermId?: string;
  paymentTerm?: SupplierPaymentTermSummary;
  paymentMethod: string;
  totalAmount: string;
  status: SupplierPaymentVoucherStatus;
  paidAt?: string;
  paidById?: string;
  paidBy?: SupplierPaymentUserSummary;
  createdById?: string;
  createdBy?: SupplierPaymentUserSummary;
  remark?: string;
  payments: SupplierPaymentLine[];
  createdAt: string;
  updatedAt: string;
};

export type PendingSupplierPaymentPo = {
  id: string;
  poNo: string;
  poDate: string;
  status: string;
  paymentStatus: string;
  totalAmount: string;
  creditor?: SupplierPaymentCreditorSummary;
  paymentTerm?: SupplierPaymentTermSummary;
  confirmedGrCount: number;
};

export type SupplierPaymentListData = {
  items: SupplierPaymentVoucher[];
  total: number;
  page: number;
  limit: number;
};

export type PendingSupplierPaymentListData = {
  items: PendingSupplierPaymentPo[];
  total: number;
  page: number;
  limit: number;
};

export type SupplierPaymentQueryParams = {
  voucherNo?: string;
  status?: string;
  purchaseOrderId?: string;
  voucherDateFrom?: string;
  voucherDateTo?: string;
  page?: number;
  limit?: number;
};

export type CreateSupplierPaymentFromPoBody = {
  voucherDate: string;
  paymentMethod: string;
  remark?: string;
};

export type ConfirmSupplierPaymentBody = {
  paymentDate?: string;
  transactionRef?: string;
  remark?: string;
};

export type SupplierPaymentApiResponse = {
  statusCode: number;
  message: string;
  data: SupplierPaymentVoucher;
};

export type SupplierPaymentListApiResponse = {
  statusCode: number;
  message: string;
  data: SupplierPaymentListData;
};

export type PendingSupplierPaymentListApiResponse = {
  statusCode: number;
  message: string;
  data: PendingSupplierPaymentListData;
};

export type SupplierPaymentByPoApiResponse = {
  statusCode: number;
  message: string;
  data: SupplierPaymentVoucher | null;
};
