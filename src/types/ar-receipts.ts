/** ใบรับชำระเงินฝั่งขาย — ตรงกับ backend `/api/ar-receipts` */
export const AR_RECEIPT_STATUS_LABEL: Record<string, string> = {
  POSTED: "บันทึกแล้ว",
  CANCELLED: "ยกเลิก",
};

export const AR_RECEIPT_STATUS_COLOR: Record<string, string> = {
  POSTED: "green",
  CANCELLED: "red",
};

export const AR_PAYMENT_METHOD_LABEL: Record<string, string> = {
  CASH: "เงินสด",
  TRANSFER: "โอนเงิน",
  CHEQUE: "เช็ค",
  CREDIT: "หักจากเครดิตลูกค้า",
  CREDIT_NOTE: "หักด้วยใบลดหนี้",
  DEBIT_NOTE: "เพิ่มยอดด้วยใบเพิ่มหนี้",
};

export type ArReceiptAllocation = {
  id: string;
  salesInvoiceId: string;
  invoiceNo: string;
  salesOrderNo?: string;
  amount: string;
  whtAmount: string;
  isActive: boolean;
};

export type ArReceipt = {
  id: string;
  receiptNo: string;
  receiptDate: string;
  customerId: string;
  customerCode?: string;
  customerName?: string;
  paymentMethod: string;
  /** PAYMENT = รับชำระตัด AR · DEPOSIT = เงินมัดจำ/รับล่วงหน้า */
  receiptType: "PAYMENT" | "DEPOSIT" | string;
  salesOrderId?: string | null;
  transactionRef?: string | null;
  receivedAmount: string;
  allocatedAmount: string;
  whtAmount: string;
  overpayAmount: string;
  status: string;
  remark?: string | null;
  createdByName?: string;
  cancelledByName?: string;
  cancelledAt?: string;
  cancelReason?: string | null;
  createdAt: string;
  allocations: ArReceiptAllocation[];
};

export type OutstandingArInvoice = {
  id: string;
  invoiceNo: string;
  invoiceDate: string;
  dueDate?: string | null;
  salesOrderNo?: string;
  totalAmount: string;
  paidAmount: string;
  outstandingAmount: string;
  billingNoteNo?: string | null;
};

export type PaymentHistoryRow = {
  id: string;
  receiptId: string;
  receiptNo: string;
  receiptDate: string;
  customerId: string;
  customerName?: string;
  salesInvoiceId: string;
  invoiceNo: string;
  paymentMethod: string;
  transactionRef?: string | null;
  amount: string;
  whtAmount: string;
  status: string;
};

export type ArReceiptQuery = {
  keyword?: string;
  status?: string;
  customerId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
};

export type CreateArReceiptBody = {
  customerId: string;
  receiptDate: string;
  paymentMethod: string;
  transactionRef?: string;
  receivedAmount: number;
  allocations: Array<{ salesInvoiceId: string; amount: number; whtAmount?: number }>;
  overpayToCredit?: boolean;
  /** เงินมัดจำ/รับล่วงหน้า — ไม่ตัด AR (allocations ว่าง) เก็บทั้งก้อนเป็นเครดิตลูกค้า */
  isDeposit?: boolean;
  salesOrderId?: string;
  remark?: string;
};

export type CreditLedgerRow = {
  id: string;
  entryType: string;
  /** บวก = เครดิตเข้า · ลบ = เครดิตออก */
  amount: string;
  refId?: string | null;
  refNo?: string | null;
  createdAt: string;
};

export const CREDIT_ENTRY_LABEL: Record<string, string> = {
  RECEIPT_OVERPAY: "รับเกินจากใบรับชำระ",
  RECEIPT_CANCEL: "ยกเลิกใบรับชำระ",
  DEPOSIT: "เงินมัดจำ/รับล่วงหน้า",
  CREDIT_APPLY: "ใช้เครดิตหัก AR",
  CREDIT_APPLY_CANCEL: "ยกเลิกการใช้เครดิต",
  REFUND: "คืนเงินลูกค้า",
  REFUND_CANCEL: "ยกเลิกใบคืนเงิน",
};

export type DepositStatus = {
  salesOrderId: string;
  termType: string;
  requiredPercent: number;
  requiredAmount: string;
  receivedAmount: string;
  status: "NOT_REQUIRED" | "PENDING" | "PARTIAL" | "COMPLETE" | string;
};

export type ArRefund = {
  id: string;
  refundNo: string;
  refundDate: string;
  customerId: string;
  customerName?: string;
  amount: string;
  paymentMethod: string;
  transactionRef?: string | null;
  status: string;
  remark?: string | null;
  cancelReason?: string | null;
  createdAt: string;
};

export type CreateArRefundBody = {
  customerId: string;
  refundDate: string;
  paymentMethod: string;
  amount: number;
  transactionRef?: string;
  remark?: string;
};

export type ApplyCreditBody = {
  customerId: string;
  salesInvoiceId: string;
  amount: number;
  remark?: string;
};

type Api<T> = { success: boolean; message: string; data: T };
type Paged<T> = { items: T[]; total: number; page: number; limit: number };

export type ArReceiptApiResponse = Api<ArReceipt>;
export type ArReceiptListApiResponse = Api<Paged<ArReceipt>>;
export type OutstandingArInvoicesApiResponse = Api<OutstandingArInvoice[]>;
export type CreditLedgerApiResponse = Api<CreditLedgerRow[]>;
export type DepositStatusApiResponse = Api<DepositStatus>;
export type ArRefundApiResponse = Api<ArRefund>;
export type ArRefundListApiResponse = Api<Paged<ArRefund>>;
export type CreditApplicationApiResponse = Api<{ id: string; status: string; amount: string }>;
export type CustomerCreditApiResponse = Api<{ customerId: string; balance: string }>;
export type PaymentHistoryApiResponse = Api<Paged<PaymentHistoryRow>>;

export type SalesOrderFinancialStatus = "NOT_BILLED" | "BILLED" | "PARTIALLY_PAID" | "PAID";

export const SO_FINANCIAL_STATUS_LABEL: Record<string, string> = {
  NOT_BILLED: "ยังไม่ตั้งหนี้",
  BILLED: "ตั้งหนี้แล้ว รอรับชำระ",
  PARTIALLY_PAID: "รับชำระบางส่วน",
  PAID: "รับชำระครบ",
};

export const SO_FINANCIAL_STATUS_COLOR: Record<string, string> = {
  NOT_BILLED: "default",
  BILLED: "blue",
  PARTIALLY_PAID: "orange",
  PAID: "green",
};

export type SalesOrderFinance = {
  salesOrderId: string;
  status: string;
  deliveryStatus: string | null;
  financialStatus: SalesOrderFinancialStatus | string;
  billedAmount: string;
  paidAmount: string;
  outstandingAmount: string;
  depositReceived: string;
  /** ส่งครบ + ตั้งหนี้ครบ + รับครบ + ไม่มีเอกสารค้าง */
  canClose: boolean;
  /** เหตุผลที่ยังปิด SO ไม่ได้ */
  blockers: string[];
  deposit: DepositStatus;
};

export type SalesOrderFinanceApiResponse = { success: boolean; message: string; data: SalesOrderFinance };
