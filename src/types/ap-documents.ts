/**
 * ใบตั้งหนี้ / ใบเพิ่มหนี้ ฝั่งเจ้าหนี้ — ตรงกับ backend `procurement/ap-documents/dto`
 * backend ใช้ตารางเดียวแยกด้วย docType แต่ endpoint แยกกัน (`/api/ap-invoices`, `/api/ap-debit-notes`)
 */

export type ApDocumentKind = "invoice" | "debitNote";

export type ApDocumentStatus = "DRAFT" | "APPROVED" | "CANCELLED";

export const AP_DOCUMENT_STATUS_LABEL: Record<string, string> = {
  DRAFT: "ร่าง",
  APPROVED: "อนุมัติแล้ว",
  CANCELLED: "ยกเลิก",
};

export const AP_DOCUMENT_STATUS_COLOR: Record<string, string> = {
  DRAFT: "default",
  APPROVED: "success",
  CANCELLED: "error",
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
  docType: "AP_INVOICE" | "DEBIT_NOTE";
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
  referenceDocumentId: string | null;
  referenceDocumentNo: string | null;
  reason: string | null;
  remark: string | null;
  vatMode: string;
  taxRateId: string | null;
  vatRate: number;
  /** ฐานก่อน VAT */
  subtotalAmount: number;
  vatAmount: number;
  totalAmount: number;
  createdByName: string | null;
  approvedByName: string | null;
  approvedAt: string | null;
  cancelledByName: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  /** หน้ารายการได้อาร์เรย์ว่าง — บรรทัดมาเฉพาะหน้ารายละเอียด */
  items: ApDocumentItem[];
  /** เฉพาะใบตั้งหนี้ในหน้ารายละเอียด */
  debitNotes?: ApDocumentLink[];
  adjustedTotalAmount?: number;
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
};

export type ApDocumentLineBody = {
  itemId?: string;
  description: string;
  quantity: number;
  unitLabel?: string;
  unitPrice: number;
};

type ApDocumentBaseBody = {
  docDate?: string;
  supplierDocNo?: string;
  supplierDocDate?: string;
  vatMode: string;
  taxRateId?: string;
  remark?: string;
  items: ApDocumentLineBody[];
};

export type SaveApInvoiceBody = ApDocumentBaseBody & {
  creditorId: string;
  dueDate?: string;
  /** บังคับ — ต้องเป็น PO ที่ยืนยันแล้วของเจ้าหนี้รายเดียวกัน */
  purchaseOrderId: string;
};

export type SaveApDebitNoteBody = ApDocumentBaseBody & {
  referenceDocumentId: string;
  reason: string;
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

export type ApInvoiceOption = {
  id: string;
  docNo: string;
  docDate: string;
  supplierDocNo: string | null;
  totalAmount: number;
  vatMode: string;
  taxRateId: string | null;
};

type Envelope<T> = { statusCode?: number; message: string; data: T };

export type ApDocumentResponse = Envelope<ApDocument>;
export type ApDocumentListResponse = Envelope<ApDocumentList>;
export type ApPurchaseOrderOptionsResponse = Envelope<ApPurchaseOrderOption[]>;
export type ApInvoiceOptionsResponse = Envelope<ApInvoiceOption[]>;
