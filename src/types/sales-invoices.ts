export type SalesInvoiceStatus = "DRAFT" | "POSTED" | "CANCELLED" | string;
export type SalesInvoicePaymentStatus =
  | "UNPAID"
  | "PARTIALLY_PAID"
  | "PAID"
  | string;

export const SALES_INVOICE_STATUS_LABEL: Record<string, string> = {
  DRAFT: "แบบร่างเอกสาร",
  POSTED: "โพสต์แล้ว",
  CANCELLED: "ยกเลิก",
};

export const SALES_INVOICE_PAYMENT_STATUS_LABEL: Record<string, string> = {
  UNPAID: "ยังไม่ชำระ",
  PARTIALLY_PAID: "ชำระบางส่วน",
  PAID: "ชำระแล้ว",
};

export const SALES_INVOICE_PAYMENT_METHOD_LABEL: Record<string, string> = {
  CASH: "เงินสด",
  TRANSFER: "โอนเงิน",
  CHEQUE: "เช็ค",
};

export type SalesInvoiceCustomerSummary = {
  id: string;
  customerCode: string;
  nameTh: string;
};

export type SalesInvoiceSalesOrderSummary = {
  id: string;
  soNo: string;
  status: string;
  totalAmount: string;
};

export type SalesInvoiceDeliveryOrderSummary = {
  id: string;
  deliveryOrderNo: string;
  status: string;
  deliveryDate: string;
};

export type SalesInvoicePaymentTermSummary = {
  id: string;
  code: string;
  name: string;
  creditDays: number;
};

export type SalesInvoiceTaxRateSummary = {
  id: string;
  code: string;
  name: string;
  rate: number;
};

export type SalesInvoiceUserSummary = {
  id: string;
  username: string;
  displayName: string;
};

export type SalesInvoiceItem = {
  id: string;
  salesInvoiceId: string;
  salesOrderItemId: string;
  deliveryOrderItemId: string;
  itemId: string;
  itemCode?: string;
  itemName?: string;
  quantity: string;
  unitId: string;
  unitName?: string;
  unitPrice: string;
  discountAmount: string;
  amount: string;
  sortOrder: number;
};

export type SalesInvoicePayment = {
  id: string;
  salesInvoiceId: string;
  paymentMethod: string;
  amount: string;
  paidAt: string;
  transactionRef?: string;
  remark?: string;
  createdById?: string;
  createdBy?: SalesInvoiceUserSummary;
  createdAt: string;
};

export type SalesInvoice = {
  id: string;
  invoiceNo: string;
  invoiceDate: string;
  deliveryOrderId: string;
  deliveryOrder?: SalesInvoiceDeliveryOrderSummary;
  salesOrderId: string;
  salesOrder?: SalesInvoiceSalesOrderSummary;
  customerId: string;
  customer?: SalesInvoiceCustomerSummary;
  paymentTermId?: string;
  paymentTerm?: SalesInvoicePaymentTermSummary;
  vatMode?: string;
  taxRate?: SalesInvoiceTaxRateSummary;
  subtotalAmount: string;
  discountAmount: string;
  vatAmount: string;
  totalAmount: string;
  status: SalesInvoiceStatus;
  paymentStatus?: SalesInvoicePaymentStatus;
  dueDate?: string;
  remark?: string;
  createdById?: string;
  createdBy?: SalesInvoiceUserSummary;
  confirmedById?: string;
  confirmedBy?: SalesInvoiceUserSummary;
  confirmedAt?: string;
  paidById?: string;
  paidBy?: SalesInvoiceUserSummary;
  paidAt?: string;
  cancelledById?: string;
  cancelledBy?: SalesInvoiceUserSummary;
  cancelledAt?: string;
  items: SalesInvoiceItem[];
  payments: SalesInvoicePayment[];
  createdAt: string;
  updatedAt: string;
};

export type PendingSalesInvoiceDelivery = {
  id: string;
  deliveryOrderNo: string;
  deliveryDate: string;
  status: string;
  salesOrderId: string;
  salesOrderNo?: string;
  customerId: string;
  customerName?: string;
  itemCount: number;
  salesOrderTotalAmount?: string;
};

export type SalesInvoiceListData = {
  items: SalesInvoice[];
  total: number;
  page: number;
  limit: number;
};

export type PendingSalesInvoiceListData = {
  items: PendingSalesInvoiceDelivery[];
  total: number;
  page: number;
  limit: number;
};

export type SalesInvoiceQueryParams = {
  keyword?: string;
  status?: string;
  paymentStatus?: string;
  customerId?: string;
  deliveryOrderId?: string;
  invoiceDateFrom?: string;
  invoiceDateTo?: string;
  page?: number;
  limit?: number;
};

export type CreateSalesInvoiceFromDeliveryBody = {
  invoiceDate: string;
  dueDate?: string;
  remark?: string;
};

export type UpdateSalesInvoiceBody = {
  invoiceDate?: string;
  dueDate?: string;
  remark?: string;
};

export type ReceiveSalesInvoicePaymentBody = {
  paymentMethod: string;
  amount?: number;
  paidAt?: string;
  transactionRef?: string;
  remark?: string;
};

export type SalesInvoiceApiResponse = {
  statusCode: number;
  message: string;
  data: SalesInvoice;
};

export type SalesInvoiceListApiResponse = {
  statusCode: number;
  message: string;
  data: SalesInvoiceListData;
};

export type PendingSalesInvoiceListApiResponse = {
  statusCode: number;
  message: string;
  data: PendingSalesInvoiceListData;
};

export type SalesInvoiceByDeliveryApiResponse = {
  statusCode: number;
  message: string;
  data: SalesInvoice | null;
};
