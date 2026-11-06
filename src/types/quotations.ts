import { tNow } from "@/lib/i18n/useT";

export type QuotationStatus =
  | "DRAFT"
  | "SENT"
  | "ACCEPTED"
  | "REJECTED"
  | "CANCELLED";

export const QUOTATION_STATUS_LABEL: Record<QuotationStatus, string> = {
  DRAFT: "แบบร่างเอกสาร",
  SENT: "รอลูกค้าตอบรับ",
  ACCEPTED: "ลูกค้าตอบรับแล้ว",
  REJECTED: "ลูกค้าปฏิเสธ",
  CANCELLED: "ยกเลิก",
};

export type QuotationCustomerSummary = {
  id: string;
  customerCode: string;
  nameTh: string;
  taxId?: string;
  address?: string;
  contactPhone?: string;
};

export type QuotationPaymentTermSummary = {
  id: string;
  code: string;
  name: string;
};

export type QuotationTaxRateSummary = {
  id: string;
  code: string;
  name: string;
  rate: number;
};

export type QuotationUserSummary = {
  id: string;
  username: string;
  displayName: string;
};

export type QuotationItem = {
  id: string;
  itemId: string;
  itemCode?: string;
  itemNameTh?: string;
  description?: string;
  quantity: string;
  unitId: string;
  unitCode?: string;
  unitNameTh?: string;
  unitPrice: string;
  discountAmount: string;
  amount: string;
  sortOrder: number;
};

export type Quotation = {
  id: string;
  quotationNo: string;
  quotationDate: string;
  customerId: string;
  customer?: QuotationCustomerSummary;
  paymentTermId?: string;
  paymentTerm?: QuotationPaymentTermSummary;
  taxRateId?: string;
  taxRate?: QuotationTaxRateSummary;
  vatMode?: string;
  contactName?: string;
  /** ที่อยู่บนใบ (แก้ได้ ไม่เขียนกลับ master) — ใบเก่า backend เติมจาก master ให้ */
  customerAddress?: string;
  preparedByPhone?: string;
  withholdingTaxType?: string;
  withholdingTaxPercent?: string;
  withholdingTaxAmount?: string;
  status: QuotationStatus | string;
  /** ใบสั่งขายที่เปิดจาก QT นี้ (ถ้ามี) */
  salesOrderId?: string;
  salesOrderNo?: string;
  validUntil?: string;
  subtotalAmount: string;
  discountAmount: string;
  vatAmount: string;
  totalAmount: string;
  remark?: string;
  createdById?: string;
  createdBy?: QuotationUserSummary;
  items: QuotationItem[];
  createdAt: string;
  updatedAt: string;
};

export type QuotationQueryParams = {
  quotationNo?: string;
  customerId?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  itemIds?: string[];
};

export type QuotationItemInput = {
  itemId: string;
  description?: string;
  quantity: number;
  unitId: string;
  unitPrice: number;
  discountAmount?: number;
};

export type CreateQuotationBody = {
  quotationDate: string;
  customerId: string;
  contactName?: string;
  customerAddress?: string;
  preparedByPhone?: string;
  paymentTermId?: string;
  vatMode?: string;
  taxRateId?: string;
  withholdingTaxType?: string;
  withholdingTaxPercent?: number;
  validUntil?: string;
  discountAmount?: number;
  remark?: string;
  items: QuotationItemInput[];
};

export type UpdateQuotationBody = Partial<CreateQuotationBody> & {
  items?: QuotationItemInput[];
};

export type QuotationApiResponse = {
  message: string;
  data: Quotation;
};

export type QuotationListApiResponse = {
  message: string;
  data: Quotation[];
};

export type QuotationItemAvailabilityRow = {
  itemId: string;
  quantityAvailable: string;
};

export type QuotationItemAvailabilityQueryParams = {
  isFinishedGood?: boolean;
};

export type QuotationItemAvailabilityListApiResponse = {
  message: string;
  data: QuotationItemAvailabilityRow[];
};

/** ป้ายสถานะตามภาษา — ไทยใช้ QUOTATION_STATUS_LABEL เดิม ("ยกเลิก" ชนกับปุ่ม Cancel) */
export function quotationStatusLabel(status: string, lang: "th" | "en"): string {
  if (lang === "en") {
    const en: Record<string, string> = {
      DRAFT: "Draft",
      SENT: "Awaiting customer response",
      ACCEPTED: "Accepted by customer",
      REJECTED: "Rejected by customer",
      CANCELLED: "Cancelled",
    };
    return en[status] ?? status;
  }
  return QUOTATION_STATUS_LABEL[status as QuotationStatus] ?? status;
}

/** ข้อความจาก utils/quotation-flow (ไทย) แปลตามภาษา — "ยกเลิก" ที่นี่คือสถานะ Cancelled ไม่ใช่ปุ่ม */
export function quotationFlowText(thai: string, lang: "th" | "en"): string {
  if (lang !== "en") return thai;
  if (thai === "ยกเลิก") return "Cancelled";
  const m = thai.match(/^เปิด SO แล้ว \((.+)\)$/);
  if (m) return `SO opened (${m[1]})`;
  return tNow(thai);
}
