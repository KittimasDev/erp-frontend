export type PaymentVoucherSourceType = "ADVANCE_REQUEST" | "BILLING_NOTE" | "AP_INVOICE";

export const PV_SOURCE_LABEL: Record<string, string> = {
  ADVANCE_REQUEST: "ขอจ่ายล่วงหน้า / มัดจำ",
  BILLING_NOTE: "ใบวางบิล",
  AP_INVOICE: "ใบตั้งหนี้ (AP)",
  /** PV แบบเดิมที่ออกจากใบสั่งซื้อโดยตรง (ไม่มีต้นทางในคิว) */
  PURCHASE_ORDER: "ใบสั่งซื้อ (PO)",
};

export const PV_KIND_LABEL: Record<string, string> = {
  ADVANCE: "ล่วงหน้า",
  DEPOSIT: "มัดจำ",
  AP_PAYMENT: "ชำระเจ้าหนี้",
};

/** สถานะของรายการในคิว (ตารางรอสร้างใบสำคัญจ่ายแสดงเฉพาะ PENDING) */
export const PV_QUEUE_STATUS_LABEL: Record<string, string> = {
  PENDING: "รอสร้างใบสำคัญจ่าย",
  PV_CREATED: "สร้างใบสำคัญจ่ายแล้ว",
  CANCELLED: "ยกเลิก",
};

export type PaymentVoucherQueueAllocation = {
  apDocumentId: string;
  apDocumentNo?: string;
  amount: string;
};

export type PaymentVoucherQueueItem = {
  id: string;
  /** เลขอ้างอิงภายในของคิว */
  queueNo: string;
  queuedAt: string;
  sourceType: PaymentVoucherSourceType | string;
  sourceId: string;
  sourceNo: string;
  creditor?: { id: string; creditorCode: string; nameTh: string };
  paymentKind: string;
  amount: string;
  whtAmount: string;
  netAmount: string;
  desiredPayDate?: string;
  purchaseOrderId?: string;
  sourceTotalAmount?: string;
  vatAmount: string;
  whtBaseAmount: string;
  whtRate: string;
  status: string;
  voucherId?: string;
  allocations: PaymentVoucherQueueAllocation[];
};

export type PaymentVoucherQueueList = {
  items: PaymentVoucherQueueItem[];
  total: number;
  page: number;
  limit: number;
};

export type PaymentVoucherQueueQuery = {
  search?: string;
  sourceType?: string;
  page?: number;
  limit?: number;
};

export type CreatedVoucherQuery = {
  search?: string;
  sourceType?: string;
  status?: string;
  page?: number;
  limit?: number;
};

export type CreateVoucherFromQueueBody = {
  voucherDate: string;
  paymentMethod: string;
  remark?: string;
};

// ─── ฟอร์ม PV กลาง ──────────────────────────────────────────────────────────

export const VOUCHER_STATUS_LABEL: Record<string, string> = {
  DRAFT: "ร่าง",
  PENDING_APPROVAL: "รออนุมัติ",
  REJECTED: "ไม่อนุมัติ",
  APPROVED: "อนุมัติแล้ว (รอจ่ายเงิน)",
  PAID: "จ่ายแล้ว",
  CANCELLED: "ยกเลิก",
};

export const VOUCHER_STATUS_COLOR: Record<string, string> = {
  DRAFT: "default",
  PENDING_APPROVAL: "gold",
  REJECTED: "red",
  APPROVED: "blue",
  PAID: "green",
  CANCELLED: "default",
};

/** สถานะ Express — แสดงข้อมูลอย่างเดียว แยกจากสถานะ PV */
export const EXPRESS_STATUS_LABEL: Record<string, string> = {
  NOT_SENT: "ยังไม่ส่ง",
  PENDING: "รอส่ง",
  SENT: "ส่งสำเร็จ",
  FAILED: "ส่งไม่สำเร็จ",
};

export const EXPRESS_STATUS_COLOR: Record<string, string> = {
  NOT_SENT: "default",
  PENDING: "gold",
  SENT: "green",
  FAILED: "red",
};

export const VOUCHER_EVENT_LABEL: Record<string, string> = {
  CREATE: "สร้างใบสำคัญจ่าย",
  UPDATE: "แก้ไข",
  SUBMIT: "ส่งอนุมัติ",
  REVIEW: "ตรวจสอบ",
  APPROVE: "อนุมัติ",
  REJECT: "ไม่อนุมัติ",
  CANCEL: "ยกเลิก",
  PAY: "บันทึกจ่ายเงิน",
  ATTACH_ADD: "แนบไฟล์",
  ATTACH_REMOVE: "ลบไฟล์แนบ",
  PAYMENT_CANCEL: "ยกเลิกการจ่ายเงิน",
  WHT_ISSUE: "ออกหนังสือรับรองหัก ณ ที่จ่าย",
};

export type VoucherSourceDocument = { documentType: string; documentNo: string; documentId?: string };
export type VoucherApDocument = {
  id: string;
  docNo: string;
  allocatedAmount: string;
  whtAmount: string;
  purchaseOrderId?: string;
  poNo?: string;
};
export type VoucherPurchaseOrderRef = { id: string; poNo: string };
export type VoucherSupplier = { id: string; creditorCode?: string; nameTh: string; taxId?: string };
export type VoucherBankAccount = {
  id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  branchName?: string;
  isDefault: boolean;
};
export type VoucherPersonAction = { userId?: string; name?: string; at?: string };
export type VoucherEvent = {
  id: string;
  action: string;
  fromStatus?: string;
  toStatus?: string;
  note?: string;
  performedByName?: string;
  performedAt: string;
};

export type VoucherSourceInfo = {
  sources: VoucherSourceDocument[];
  apDocuments: VoucherApDocument[];
  purchaseOrders: VoucherPurchaseOrderRef[];
  supplier: VoucherSupplier;
  sourceDocumentAmount: string;
  issuedPvAmount: string;
  remainingIssuable: string;
  defaultBankAccount?: VoucherBankAccount;
  bankAccounts: VoucherBankAccount[];
};

export type QueueContext = VoucherSourceInfo & { queueItem: PaymentVoucherQueueItem };

export type PaymentVoucherDetail = VoucherSourceInfo & {
  voucher: import("@/types/purchase-payments").SupplierPaymentVoucher;
  desiredPayDate?: string;
  bankAccount?: VoucherBankAccount;
  vatAmount: string;
  whtBaseAmount: string;
  whtRate: string;
  expressStatus: string;
  createdByAction?: VoucherPersonAction;
  submittedByAction?: VoucherPersonAction;
  reviewedByAction?: VoucherPersonAction;
  approvedByAction?: VoucherPersonAction;
  rejectedByAction?: VoucherPersonAction;
  cancelledByAction?: VoucherPersonAction;
  rejectReason?: string;
  cancelReason?: string;
  events: VoucherEvent[];
};

export type VoucherAllocationInput = { apDocumentId: string; apDocumentNo?: string; amount: number };

export type CreateVoucherFormBody = {
  voucherDate: string;
  amount?: number;
  paymentMethod: string;
  desiredPayDate?: string;
  companyBankAccountId?: string;
  remark?: string;
  allocations?: VoucherAllocationInput[];
  submit?: boolean;
};

export type UpdateVoucherFormBody = {
  voucherDate?: string;
  paymentMethod?: string;
  desiredPayDate?: string;
  companyBankAccountId?: string;
  remark?: string;
};


export type PayableVoucherQuery = { search?: string; paymentKind?: string; page?: number; limit?: number };

// ─── หน้าบันทึกจ่ายเงิน: รายการที่บันทึกจ่ายแล้ว ─────────────────────────────

/** สถานะรายการจ่าย */
export const PAYMENT_RECORD_STATUS_LABEL: Record<string, string> = { PAID: "จ่ายแล้ว", CANCELLED: "ยกเลิก" };

export const PAYMENT_RECORD_STATUS_COLOR: Record<string, string> = { PAID: "green", CANCELLED: "default" };

export type PaymentRecord = {
  id: string;
  /** เลขที่รายการจ่าย */
  paymentNo?: string;
  paymentDate: string;
  voucherId: string;
  voucherNo: string;
  /** true = PV จากคิว (หน้ารายละเอียดใหม่) · false = PV เดิมจากใบสั่งซื้อ */
  viaQueue: boolean;
  creditor?: { id: string; creditorCode: string; nameTh: string };
  paymentMethod: string;
  amount: string;
  transactionRef?: string;
  status: string;
  paidByName?: string;
  createdAt: string;
};

export type PaymentRecordList = { items: PaymentRecord[]; total: number; page: number; limit: number };

export type PaymentRecordQuery = {
  search?: string;
  paymentDateFrom?: string;
  paymentDateTo?: string;
  paymentMethod?: string;
  status?: string;
  page?: number;
  limit?: number;
};

// ─── หน้าสร้าง / รายละเอียดบันทึกจ่ายเงิน ─────────────────────────────────────

export type PaymentRecordAttachment = {
  id: string;
  originalFileName?: string;
  mimeType?: string;
  fileSize?: string;
  description?: string;
  uploadedByName?: string;
  createdAt: string;
};

export type WhtParty = { name: string; taxId?: string; address?: string };

export type WhtCertificate = {
  id: string;
  certNo: string;
  status: string;
  taxForm: "PND3" | "PND53" | string;
  incomeType: string;
  paymentDate: string;
  baseAmount: string;
  rate: string;
  whtAmount: string;
  payer: WhtParty;
  payee: WhtParty;
  issuedByName?: string;
  issuedAt: string;
};

export type PaymentRecordDetail = {
  id: string;
  paymentNo?: string;
  status: string;
  documentDate: string;
  paymentDate: string;
  /** ยอดจ่ายจริง */
  amount: string;
  paymentMethod: string;
  bankAccount?: VoucherBankAccount;
  transactionRef?: string;
  chequeNo?: string;
  chequeDate?: string;
  chequeBankName?: string;
  otherMethodDetail?: string;
  remark?: string;
  paidByName?: string;
  createdAt: string;
  cancelledByName?: string;
  cancelledAt?: string;
  cancelReason?: string;
  /** ส่งสมุดรายวันจ่ายไป Express แล้ว — ส่งแล้วยกเลิกการจ่ายไม่ได้ */
  isExportedToExpress: boolean;
  voucherDetail: PaymentVoucherDetail;
  evidence: PaymentRecordAttachment[];
  voucherAttachments: PaymentRecordAttachment[];
  whtCertificate?: WhtCertificate;
  hasWht: boolean;
};

/** ฟิลด์ของฟอร์มยืนยันการจ่ายเงิน (ส่งเป็น multipart พร้อมไฟล์หลักฐาน) */
export type RecordPaymentForm = {
  documentDate?: string;
  paymentDate: string;
  amount: number;
  paymentMethod: string;
  companyBankAccountId?: string;
  transactionRef?: string;
  chequeNo?: string;
  chequeDate?: string;
  chequeBankName?: string;
  otherMethodDetail?: string;
  remark?: string;
};

export type IssueWhtBody = { taxForm: string; incomeType: string };

export const WHT_TAX_FORM_LABEL: Record<string, string> = {
  PND3: "ภ.ง.ด.3 (บุคคลธรรมดา)",
  PND53: "ภ.ง.ด.53 (นิติบุคคล)",
};

/** ประเภทเงินได้ที่พบบ่อย — ผู้ใช้เลือกหรือพิมพ์เองตอนออกหนังสือรับรอง */
export const WHT_INCOME_TYPE_OPTIONS = [
  "ค่าจ้างทำของ / ค่าบริการ",
  "ค่าขนส่ง",
  "ค่าเช่า",
  "ค่านายหน้า / ค่าธรรมเนียม",
  "ค่าโฆษณา",
  "เงินมัดจำ / เงินล่วงหน้าค่าสินค้าหรือบริการ",
];
