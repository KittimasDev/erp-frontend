import { standardStatusColor, standardStatusLabel } from "@/lib/status/standard-status";
/**
 * ใบตั้งหนี้ / ใบเพิ่มหนี้ ฝั่งเจ้าหนี้ — ตรงกับ backend `procurement/ap-documents/dto`
 * backend ใช้ตารางเดียวแยกด้วย docType แต่ endpoint แยกกัน (`/api/ap-invoices`, `/api/ap-debit-notes`)
 */

export type ApDocumentKind = "invoice" | "debitNote" | "creditNote";

/** วิธีจัดการยอดใบลดหนี้ — เลือกได้ 1 วิธีต่อใบ */
export type ApSettlementMethod = "OFFSET_AP" | "REFUND" | "SUPPLIER_CREDIT";

export const AP_SETTLEMENT_METHOD_LABEL: Record<string, string> = {
  OFFSET_AP: "หักยอดเจ้าหนี้คงค้าง",
  REFUND: "รับเงินคืนจากผู้ขาย",
  SUPPLIER_CREDIT: "เก็บเป็นเครดิตผู้ขาย",
};

/** สถานะการนำไปใช้ (แยกจากสถานะเอกสาร) */
export const AP_USAGE_STATUS_LABEL: Record<string, string> = {
  UNUSED: "ยังไม่ใช้",
  USED: "ใช้ปรับหนี้แล้ว",
  WAITING_REFUND: "รอรับเงินคืน",
  REFUNDED: "รับคืนครบแล้ว",
  CREDIT_REMAINING: "เครดิตคงเหลือ",
  CREDIT_USED: "ใช้เครดิตครบแล้ว",
};

export const AP_USAGE_STATUS_COLOR: Record<string, string> = {
  UNUSED: "default",
  USED: "success",
  WAITING_REFUND: "gold",
  REFUNDED: "success",
  CREDIT_REMAINING: "processing",
  CREDIT_USED: "success",
};

export type ApCreditNoteRefund = {
  id: string;
  refundDate: string;
  amount: number;
  companyBankAccountId: string | null;
  bankAccountLabel: string | null;
  referenceNo: string | null;
  remark: string | null;
  status: "ACTIVE" | "CANCELLED" | string;
  createdByName: string | null;
  createdAt: string;
  cancelReason: string | null;
};

export type ApSupplierCreditUsage = {
  id: string;
  apDocumentId: string;
  apDocumentNo: string;
  amount: number;
  usedByName: string | null;
  usedAt: string;
};

/** เครดิตผู้ขายคงเหลือที่นำมาใช้กับใบตั้งหนี้ใบหนึ่งได้ */
export type ApSupplierCreditCandidate = {
  id: string;
  docNo: string;
  docDate: string;
  reason: string | null;
  totalAmount: number;
  usedAmount: number;
  remainingAmount: number;
};

export type ApDocumentStatus = "DRAFT" | "PENDING_APPROVAL" | "REJECTED" | "APPROVED" | "CANCELLED";

export const AP_DOCUMENT_STATUS_LABEL: Record<string, string> = {
  DRAFT: standardStatusLabel("DRAFT"),
  PENDING_APPROVAL: standardStatusLabel("PENDING_APPROVAL"),
  REJECTED: standardStatusLabel("REJECTED"),
  APPROVED: standardStatusLabel("APPROVED"),
  CANCELLED: standardStatusLabel("CANCELLED"),
};

export const AP_DOCUMENT_STATUS_COLOR: Record<string, string> = {
  DRAFT: standardStatusColor("DRAFT"),
  PENDING_APPROVAL: standardStatusColor("PENDING_APPROVAL"),
  REJECTED: standardStatusColor("REJECTED"),
  APPROVED: standardStatusColor("APPROVED"),
  CANCELLED: standardStatusColor("CANCELLED"),
};

export const AP_VAT_MODE_LABEL: Record<string, string> = {
  EXCLUSIVE: "ราคาไม่รวม VAT (แยก VAT)",
  INCLUSIVE: "ราคารวม VAT แล้ว",
  NONE: "ไม่มี VAT",
};

export type ApDocumentItem = {
  id: string;
  itemId: string | null;
  itemCode: string | null;
  description: string;
  quantity: number;
  unitLabel: string | null;
  unitPrice: number;
  amount: number;
  sortOrder: number;
  goodsReceiptItemId?: string | null;
  discountAmount?: number;
};

export type ApDocumentLink = {
  id: string;
  docNo: string;
  docDate: string;
  status: string;
  totalAmount: number;
};

export type ApDocument = {
  id: string;
  docType: "AP_INVOICE" | "DEBIT_NOTE" | "CREDIT_NOTE";
  docNo: string;
  docDate: string;
  status: ApDocumentStatus | string;
  creditorId: string;
  creditorCode: string;
  creditorName: string;
  creditorTaxId: string | null;
  creditorAddress: string | null;
  supplierDocNo: string | null;
  supplierDocDate: string | null;
  dueDate: string | null;
  purchaseOrderId: string | null;
  purchaseOrderNo: string | null;
  /** สถานะ PO ต้นทาง — CANCELLED = ห้ามส่งอนุมัติ/อนุมัติ ต้องยกเลิกเอกสารนี้ */
  purchaseOrderStatus?: string | null;
  referenceDocumentId: string | null;
  referenceDocumentNo: string | null;
  reason: string | null;
  remark: string | null;
  /** โน้ตภายในบริษัท — ไม่ออกในเอกสารที่ส่งผู้ขาย */
  internalNote: string | null;
  vatMode: string;
  taxRateId: string | null;
  vatRate: number;
  /** ฐานก่อน VAT */
  subtotalAmount: number;
  vatAmount: number;
  totalAmount: number;
  /** ยอดหักมัดจำ (Task หน้าสร้าง AP เป็นผู้กรอก) */
  depositDeductAmount?: number;
  /** GRN ที่ตั้งหนี้ (ถ้าตั้งจาก GRN) */
  goodsReceiptId?: string | null;
  goodsReceiptNo?: string | null;
  createdByName: string | null;
  approvedByName: string | null;
  approvedAt: string | null;
  cancelledByName: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  /** หน้ารายการได้อาร์เรย์ว่าง — บรรทัดมาเฉพาะหน้ารายละเอียด */
  items: ApDocumentItem[];
  /** เฉพาะใบตั้งหนี้ในหน้ารายละเอียด — ค่าใช้จ่ายเพิ่มเติมจาก PO ที่ตั้งหนี้ในใบนี้ (รวมอยู่ใน totalAmount แล้ว) */
  charges?: ApChargeAllocation[];
  /** ยอดค่าสินค้า (รวม VAT) ส่วนที่ไม่ใช่ค่าใช้จ่ายเพิ่มเติม */
  goodsAmount?: number;
  /** เฉพาะใบตั้งหนี้ในหน้ารายละเอียด */
  debitNotes?: ApDocumentLink[];
  adjustedTotalAmount?: number;
  /** เฉพาะใบเพิ่มหนี้/ลดหนี้ */
  settlementMethod?: ApSettlementMethod | string;
  /** สถานะการนำไปใช้ — มีเมื่ออนุมัติแล้ว */
  usageStatus?: string | null;
  /** ยอดคงเหลือที่ยังไม่ได้ดำเนินการ (ใบอนุมัติแล้ว) */
  outstandingAmount?: number;
  refundedAmount?: number;
  creditUsedAmount?: number;
  appliedToApId?: string | null;
  appliedToApNo?: string | null;
  appliedAt?: string | null;
  submittedByName?: string | null;
  submittedAt?: string | null;
  rejectedByName?: string | null;
  rejectedAt?: string | null;
  rejectReason?: string | null;
  /** เฉพาะหน้ารายละเอียดใบเพิ่มหนี้/ลดหนี้ */
  events?: ApEvent[];
  refunds?: ApCreditNoteRefund[];
  creditUsages?: ApSupplierCreditUsage[];
  createdAt: string;
  updatedAt: string;
};

export type ApDocumentList = {
  items: ApDocument[];
  total: number;
  page: number;
  limit: number;
};

export type ApDocumentQueryParams = {
  page?: number;
  limit?: number;
  status?: string;
  creditorId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  /** ใบลดหนี้: กรองวิธีจัดการยอด / สถานะการนำไปใช้ */
  settlementMethod?: string;
  usageStatus?: string;
};

export type ApDocumentLineBody = {
  itemId?: string;
  description: string;
  quantity: number;
  unitLabel?: string;
  unitPrice: number;
  /** บรรทัดของ GRN — backend กันตั้งเกินจำนวนรับจริง */
  goodsReceiptItemId?: string;
  discountAmount?: number;
};

type ApDocumentBaseBody = {
  docDate?: string;
  supplierDocNo?: string;
  supplierDocDate?: string;
  vatMode: string;
  taxRateId?: string;
  remark?: string;
  internalNote?: string;
  /** ใบตั้งหนี้ค่าใช้จ่ายล้วนส่งว่างได้ (ต้องมี charges) · ใบเพิ่ม/ลดหนี้ต้องมีอย่างน้อย 1 รายการ */
  items: ApDocumentLineBody[];
};

/** ค่าใช้จ่ายเพิ่มเติมของ PO ที่เลือกนำมาตั้งหนี้ (ยอดก่อน VAT) */
export type ApChargeAllocationInput = { poChargeId: string; amount: number };

/** ค่าใช้จ่ายของ PO + วงเงิน/ยอดที่ AP อื่นใช้แล้ว/คงเหลือ */
export type PoChargeOption = {
  poChargeId: string;
  chargeType: string;
  description: string;
  taxRateId?: string | null;
  taxRatePercent: number;
  poAmountBeforeVat: number;
  poVatAmount: number;
  poTotalAmount: number;
  allocatedByOthers: number;
  /** VAT ของยอดที่ AP อื่นจัดสรรไปแล้ว */
  allocatedVatByOthers: number;
  remaining: number;
  thisAmount: number;
  whtApplicable: boolean;
  whtIncomeType?: string | null;
  whtRate: number;
};

/** ข้อมูล PO + ค่าใช้จ่ายที่ตั้งหนี้ได้ (หน้าสร้าง/แก้ AP ทั้งโหมดมี GRN และโหมดค่าใช้จ่ายล้วน) */
export type PoChargeInfo = {
  purchaseOrderId: string;
  poNo: string;
  receiveStatus: string;
  creditorId: string;
  creditorCode: string;
  creditorName: string;
  vatMode: string;
  taxRateId?: string;
  paymentTerm: { termType?: string; name?: string; creditDays: number; advancePercent: number };
  charges: PoChargeOption[];
};

/** ค่าใช้จ่ายเพิ่มเติมที่ตั้งหนี้ในใบตั้งหนี้ใบนี้ */
export type ApChargeAllocation = {
  poChargeId: string;
  chargeType: string;
  description: string;
  amountBeforeVat: number;
  vatRate: number;
  vatAmount: number;
  totalAmount: number;
  whtBaseAmount: number;
  whtRate: number;
  whtAmount: number;
};

/** PO ที่ยังมีค่าใช้จ่ายคงเหลือรอตั้งหนี้ (ไม่ต้องมี GRN) */
export type PendingChargePo = {
  purchaseOrderId: string;
  poNo: string;
  creditorId: string;
  creditorCode: string;
  creditorName: string;
  receiveStatus: string;
  chargeAmountBeforeVat: number;
  allocatedAmount: number;
  remainingAmount: number;
  remainingCount: number;
};

export type PendingChargePoList = { items: PendingChargePo[]; total: number; page: number; limit: number };

export type SaveApInvoiceBody = ApDocumentBaseBody & {
  /** ค่าใช้จ่ายเพิ่มเติมจาก PO ที่ตั้งหนี้ในใบนี้ — ไม่ส่ง = ไม่ตั้ง · ใบค่าใช้จ่ายล้วนส่ง items ว่างได้ */
  charges?: ApChargeAllocationInput[];
  creditorId: string;
  dueDate?: string;
  /** บังคับ — ต้องเป็น PO ที่ยืนยันแล้วของเจ้าหนี้รายเดียวกัน */
  purchaseOrderId: string;
  /** GRN ที่ตั้งหนี้ (มาจากปุ่ม "สร้างใบตั้งหนี้" ในตารางรอสร้าง) */
  goodsReceiptId?: string;
  taxInvoiceNo?: string;
  taxInvoiceDate?: string;
  /** ยอดเงินล่วงหน้า/มัดจำที่นำมาหัก (ไม่ส่ง = ไม่หัก) */
  depositDeductAmount?: number;
};

export type SaveApDebitNoteBody = ApDocumentBaseBody & {
  referenceDocumentId: string;
  reason: string;
};

export type SaveApCreditNoteBody = ApDocumentBaseBody & {
  creditorId: string;
  /** บังคับเมื่อวิธีจัดการยอด = OFFSET_AP */
  referenceDocumentId?: string;
  purchaseOrderId?: string;
  settlementMethod: ApSettlementMethod | string;
  reason: string;
};

export type RefundApCreditNoteBody = {
  refundDate: string;
  amount: number;
  companyBankAccountId: string;
  referenceNo?: string;
  remark?: string;
};

export type ApPurchaseOrderOption = {
  id: string;
  poNo: string;
  poDate: string;
  status: string;
  /** สถานะการรับของ — บอกผู้ตั้งหนี้ว่าของมาครบหรือยัง */
  receiveStatus: string;
  vatMode: string;
  taxRateId: string | null;
  totalAmount: number;
};

export type ApInvoiceBillingStatus = "UNBILLED" | "BILLED";
export type ApInvoiceBillingStatusFilter = ApInvoiceBillingStatus | "ALL";

export type ApInvoiceOption = {
  id: string;
  docNo: string;
  docDate: string;
  supplierDocNo: string | null;
  poNo: string | null;
  creditorCode: string;
  creditorName: string;
  totalAmount: number;
  vatMode: string;
  taxRateId: string | null;
  /** ยอดเจ้าหนี้คงเหลือ — ถ้า ≤ 0 ไม่ให้เลือกหักยอด (OFFSET_AP) */
  remainingAmount: number;
  paymentStatus: string;
  billedAmount: number;
  billingStatus: ApInvoiceBillingStatus | string;
};

export type ApInvoiceOptionList = {
  items: ApInvoiceOption[];
  total: number;
  page: number;
  limit: number;
};

export type ApInvoiceOptionsQuery = {
  creditorId: string;
  search?: string;
  billingStatus?: ApInvoiceBillingStatusFilter;
  paymentStatus?: "UNPAID" | "PARTIAL" | "PAID";
  page?: number;
  limit?: number;
};

export const AP_BILLING_STATUS_LABEL: Record<string, string> = {
  UNBILLED: "ยังไม่วางบิล",
  BILLED: "วางบิลแล้ว",
};

export const AP_BILLING_STATUS_COLOR: Record<string, string> = {
  UNBILLED: "default",
  BILLED: "blue",
};

type Envelope<T> = { statusCode?: number; message: string; data: T };

export type ApDocumentResponse = Envelope<ApDocument>;
export type ApDocumentListResponse = Envelope<ApDocumentList>;
export type ApPurchaseOrderOptionsResponse = Envelope<ApPurchaseOrderOption[]>;
export type ApInvoiceOptionsResponse = Envelope<ApInvoiceOptionList>;

// ─── หน้ารายการใบตั้งหนี้ 2 ส่วน ─────────────────────────────────────────────

export const AP_PAYMENT_STATUS_LABEL: Record<string, string> = {
  UNPAID: "ยังไม่ชำระ",
  PARTIAL: "ชำระบางส่วน",
  PAID: "ชำระครบแล้ว",
};

export const AP_PAYMENT_STATUS_COLOR: Record<string, string> = {
  UNPAID: "default",
  PARTIAL: "gold",
  PAID: "success",
};

/** เงื่อนไขการชำระ (ประเภท) ของใบสั่งซื้อ */
export const AP_TERM_TYPE_LABEL: Record<string, string> = {
  ADVANCE: "ล่วงหน้า / มัดจำ",
  ON_RECEIPT: "เมื่อรับสินค้า",
  CREDIT: "เครดิต",
};

export type PendingGrnPaymentTerm = {
  termType?: string;
  name?: string;
  creditDays: number;
  advancePercent: number;
};

export type PendingGrn = {
  grnId: string;
  grnNo: string;
  /** วันที่รับสินค้า */
  grnDate: string;
  /** วัน-เวลาที่ยืนยัน GRN */
  confirmedAt?: string;
  purchaseOrderId: string;
  poNo: string;
  creditorId: string;
  creditorCode: string;
  creditorName: string;
  grnTotalAmount: number;
  /** มูลค่ารอสร้างใบตั้งหนี้ (เฉพาะส่วนที่ยังไม่ได้ตั้งหนี้) */
  pendingAmount: number;
  paymentTerm: PendingGrnPaymentTerm;
  /** CONTINUE_DRAFT = มีใบตั้งหนี้ร่างอยู่แล้ว ให้ดำเนินการต่อ */
  action: "CREATE" | "CONTINUE_DRAFT" | string;
  draftApId?: string;
  draftApNo?: string;
};

export type PendingGrnList = { items: PendingGrn[]; total: number; page: number; limit: number };

export type PendingGrnQuery = {
  search?: string;
  receivedFrom?: string;
  receivedTo?: string;
  termType?: string;
  page?: number;
  limit?: number;
};

export type GrnCreateItem = {
  goodsReceiptItemId: string;
  itemId?: string;
  itemCode?: string;
  description: string;
  /** จำนวนที่ตั้งหนี้ได้ (ค่าเริ่มต้น = จำนวนรับจริงที่ยังไม่ได้ตั้งหนี้) */
  quantity: number;
  receivedQuantity: number;
  remainingQuantity: number;
  unitLabel?: string;
  unitPrice: number;
  discountAmount: number;
  amount: number;
};

export type GrnCreateInfo = {
  grnId: string;
  grnNo: string;
  grnDate: string;
  purchaseOrderId: string;
  poNo: string;
  creditorId: string;
  creditorCode: string;
  creditorName: string;
  vatMode: string;
  taxRateId?: string;
  paymentTerm: PendingGrnPaymentTerm;
  suggestedDueDate?: string;
  pendingAmount: number;
  items: GrnCreateItem[];
  draftApId?: string;
};

export type CreatedAp = {
  id: string;
  docNo: string;
  docDate: string;
  creditorId: string;
  creditorCode: string;
  creditorName: string;
  poNo?: string;
  /** เลขที่รายการจ่ายเงิน (= เลขที่ PO ต้นทาง) */
  paymentListNo?: string;
  grnNos: string[];
  totalAmount: number;
  vatAmount: number;
  depositDeductAmount: number;
  paidAmount: number;
  remainingAmount: number;
  dueDate?: string;
  /** วันที่ใบแจ้งหนี้ Supplier — ฐานคำนวณ due date */
  supplierDocDate?: string;
  /** due date ที่ควรเป็น = วันที่ใบแจ้งหนี้ Supplier + เครดิตวัน (เฉพาะเงื่อนไขเครดิต) */
  expectedDueDate?: string;
  /** true = due date ที่เก็บไว้ไม่ตรงกับที่ควรเป็น (ตรวจเอกสารเดิม ระบบไม่แก้ให้) */
  dueDateMismatch?: boolean;
  status: ApDocumentStatus | string;
  paymentStatus: "UNPAID" | "PARTIAL" | "PAID" | string;
  createdAt: string;
};

export type CreatedApList = { items: CreatedAp[]; total: number; page: number; limit: number };

export type CreatedApQuery = {
  /** "true" = เฉพาะ AP ที่ due date ไม่ตรงฐานวันที่ใบแจ้งหนี้ Supplier + เครดิตวัน */
  dueDateMismatch?: "true";
  search?: string;
  docDateFrom?: string;
  docDateTo?: string;
  status?: string;
  paymentStatus?: string;
  dueFrom?: string;
  dueTo?: string;
  page?: number;
  limit?: number;
};

// ─── หน้าสร้าง / รายละเอียดใบตั้งหนี้ (มัดจำ ปรับหนี้ วางบิล) ──────────────────

export const AP_EVENT_LABEL: Record<string, string> = {
  CREATE: "สร้างใบตั้งหนี้",
  UPDATE: "แก้ไข",
  SUBMIT: "ส่งอนุมัติ",
  APPROVE: "อนุมัติ",
  REJECT: "ไม่อนุมัติ",
  CANCEL: "ยกเลิก",
  ADJUST: "ปรับหนี้",
  ISSUE_PV: "ออกใบสำคัญจ่าย (เข้าคิว)",
  CANCEL_PV_QUEUE: "ยกเลิกรายการรอสร้างใบสำคัญจ่าย",
  DEPOSIT_ALLOCATED: "จัดสรรมัดจำ",
  BILLING_RESERVE: "นำไปวางบิล",
  BILLING_RELEASE: "คืนยอดวางบิล",
  REFUND: "รับเงินคืน",
  CANCEL_REFUND: "ยกเลิกรับเงินคืน",
  USE_CREDIT: "ใช้เครดิตผู้ขาย",
  CHARGE_ALLOCATED: "จัดสรรค่าใช้จ่ายเพิ่มเติมจาก PO",
};

export type DepositSource = {
  voucherId: string;
  voucherNo: string;
  paymentNo?: string;
  paymentDate?: string;
  amount: number;
  whtAmount: number;
};

export type DepositInfo = {
  totalPaid: number;
  usedByOthers: number;
  /** มัดจำคงเหลือที่ใช้ได้กับ AP ใบนี้ */
  available: number;
  whtWithheld: number;
  sources: DepositSource[];
};

export type ApDepositSection = DepositInfo & {
  thisDeduct: number;
  remainingAfterThis: number;
};

export type ApAdjustmentCandidate = {
  id: string;
  docNo: string;
  docType: "DEBIT_NOTE" | "CREDIT_NOTE" | string;
  docDate: string;
  supplierDocNo?: string;
  reason?: string;
  totalAmount: number;
  /** ใบเพิ่มหนี้ = +, ใบลดหนี้ = − */
  signedAmount: number;
  referenceDocumentNo?: string;
  creditorCode?: string;
  creditorName?: string;
  status: string;
  /** OFFSET_AP = หักกับ AP · REFUND/SUPPLIER_CREDIT = ติดตามแยก ไม่หัก AP ซ้ำ */
  settlementMethod: string;
  selectable: boolean;
  unselectableReason?: string;
};

export type ApAdjustmentHistory = ApAdjustmentCandidate & { appliedAt: string; appliedByName?: string };

export type ApBillingLink = {
  id: string;
  billingNoteId: string;
  billingNoteNo: string;
  billingNoteDate?: string;
  amount: number;
  status: string;
  billingNoteStatus?: string;
  pvStatus?: string;
};

export type ApPaymentRef = {
  voucherId: string;
  voucherNo: string;
  paymentId?: string;
  paymentNo?: string;
  paymentDate?: string;
  amount: number;
};

/** เอกสารการจ่ายเงินของ AP: PV ที่ออกแล้ว + รายการรอสร้าง PV */
export type ApVoucherRef = {
  voucherId?: string;
  voucherNo?: string;
  queueItemId?: string;
  queueNo?: string;
  docDate: string;
  amount: number;
  /** สถานะ PV หรือ WAITING_PV = รอสร้างใบสำคัญจ่าย */
  status: string;
  paymentStatus: "UNPAID" | "PAID" | string;
  paymentId?: string;
  paymentNo?: string;
  paymentDate?: string;
  sourceType: string;
  canCancelQueue: boolean;
};

export type ApEvent = {
  id: string;
  action: string;
  fromStatus?: string;
  toStatus?: string;
  note?: string;
  performedByName?: string;
  performedAt: string;
};

export type ApInvoiceDetail = ApDocument & {
  paymentListNo?: string;
  paymentTerm: PendingGrnPaymentTerm;
  deposit: ApDepositSection;
  adjustments: ApAdjustmentHistory[];
  adjustmentNet: number;
  appliedDebits: number;
  appliedCredits: number;
  adjustedTotal: number;
  paidAmount: number;
  netPayableAmount: number;
  /** ฐาน WHT รวมที่จะหักตอนจ่าย (ก่อน VAT) */
  whtBaseAmount: number;
  /** อัตรา WHT เฉลี่ยโดยประมาณ */
  whtRate: number;
  /** ยอด WHT ที่จะหักตอนจ่าย (หลังหักส่วนมัดจำแล้ว) */
  whtAmount: number;
  /** ยอดโอนสุทธิโดยประมาณ = netPayable − WHT */
  netTransferAmount: number;
  remainingAmount: number;
  paymentStatus: "UNPAID" | "PARTIAL" | "PAID" | string;
  billedAmount: number;
  billableAmount: number;
  canIssueBilling: boolean;
  billingBlockReason?: string;
  billingNotes: ApBillingLink[];
  payments: ApPaymentRef[];
  vouchers: ApVoucherRef[];
  pvOpenAmount: number;
  issuablePvAmount: number;
  canIssuePv: boolean;
  pvBlockReason?: string;
  events: ApEvent[];
  submittedByName?: string;
  submittedAt?: string;
  rejectedByName?: string;
  rejectedAt?: string;
  rejectReason?: string;
  taxInvoiceNo?: string;
  taxInvoiceDate?: string;
};
