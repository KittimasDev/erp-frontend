export type CreditorBalancePaymentStatus = "UNPAID" | "PARTIAL" | "PAID" | "OVERDUE";

export type CreditorBalancePoLineStatus =
  | "NOT_INVOICED"
  | "UNPAID"
  | "PARTIAL"
  | "PAID"
  | "OVERDUE";

export const CREDITOR_BALANCE_PAYMENT_STATUS_LABEL: Record<string, string> = {
  UNPAID: "ยังไม่จ่าย",
  PARTIAL: "จ่ายบางส่วน",
  PAID: "จ่ายครบแล้ว",
  OVERDUE: "จ่ายล่าช้า",
};

export const CREDITOR_BALANCE_PAYMENT_STATUS_COLOR: Record<string, string> = {
  UNPAID: "default",
  PARTIAL: "gold",
  PAID: "green",
  OVERDUE: "red",
};

export const CREDITOR_BALANCE_PO_LINE_STATUS_LABEL: Record<string, string> = {
  NOT_INVOICED: "ยังไม่ตั้งหนี้",
  UNPAID: "ยังไม่จ่าย",
  PARTIAL: "จ่ายบางส่วน",
  PAID: "จ่ายครบแล้ว",
  OVERDUE: "จ่ายล่าช้า",
};

export const CREDITOR_BALANCE_PO_LINE_STATUS_COLOR: Record<string, string> = {
  NOT_INVOICED: "default",
  UNPAID: "default",
  PARTIAL: "gold",
  PAID: "green",
  OVERDUE: "red",
};

export type CreditorBalanceSummary = {
  totalApRemaining: number;
  totalOverdue: number;
  totalSupplierCreditRemaining: number;
  totalDepositAvailable: number;
};

export type CreditorBalanceRow = {
  creditorId: string;
  creditorCode: string;
  creditorName: string;
  poCount: number;
  creditTermsLabel: string;
  apRemaining: number;
  creditReceived: number;
  creditUsed: number;
  creditRemaining: number;
  depositAvailable: number;
  paymentStatus: string;
};

export type CreditorBalanceList = {
  items: CreditorBalanceRow[];
  total: number;
  page: number;
  limit: number;
};

export type CreditorBalancePoLine = {
  purchaseOrderId: string;
  poNo: string;
  poDate: string;
  termType: string | null;
  termLabel: string | null;
  poTotalAmount: number;
  amountAfterAdjustment: number;
  paidAmount: number;
  remainingAmount: number;
  dueDate: string | null;
  lineStatus: string;
};

export type CreditorBalanceQuery = {
  page?: number;
  limit?: number;
  search?: string;
  creditorId?: string;
  dateFrom?: string;
  dateTo?: string;
  termType?: "ADVANCE" | "ON_RECEIPT" | "CREDIT";
  paymentStatus?: CreditorBalancePaymentStatus;
  hasBalanceOrCredit?: boolean;
};

export const CREDITOR_BALANCES_SCREEN = "FINANCE_CREDITOR_BALANCES";
export const CREDITOR_BALANCES_PATH = "/finance/payables/creditor-balances";
