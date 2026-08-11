export type QuotationStatus =
  | "DRAFT"
  | "SENT"
  | "ACCEPTED"
  | "REJECTED"
  | "CANCELLED";

export const QUOTATION_STATUS_LABEL: Record<QuotationStatus, string> = {
  DRAFT: "ร่าง",
  SENT: "รอลูกค้าตอบรับ",
  ACCEPTED: "ลูกค้าตอบรับแล้ว",
  REJECTED: "ลูกค้าปฏิเสธ",
  CANCELLED: "ยกเลิก",
};

export type QuotationCustomerSummary = {
  id: string;
  customerCode: string;
  nameTh: string;
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
  paymentTermId?: string;
  taxRateId?: string;
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
  itemCategoryCode?: string;
};

export type QuotationItemAvailabilityListApiResponse = {
  message: string;
  data: QuotationItemAvailabilityRow[];
};
