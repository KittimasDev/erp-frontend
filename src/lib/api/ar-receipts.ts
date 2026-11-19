import { apiFetch } from "./client";
import type {
  ApplyCreditBody,
  ArRefundApiResponse,
  ArRefundListApiResponse,
  CreateArRefundBody,
  CreditApplicationApiResponse,
  CreditLedgerApiResponse,
  DepositStatusApiResponse,
  SalesOrderFinanceApiResponse,
  ArReceiptApiResponse,
  ArReceiptListApiResponse,
  ArReceiptQuery,
  AwaitingOrdersApiResponse,
  AwaitingOrdersQuery,
  CreateArReceiptBody,
  CustomerCreditApiResponse,
  OutstandingArInvoicesApiResponse,
  PaymentHistoryApiResponse,
} from "@/types/ar-receipts";

function qs(params: Record<string, string | number | undefined | null>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const s = search.toString();
  return s ? `?${s}` : "";
}

export function getArReceipts(token: string, params: ArReceiptQuery) {
  return apiFetch<ArReceiptListApiResponse>(
    `/api/ar-receipts${qs({ ...params, keyword: params.keyword?.trim() })}`,
    { token },
  );
}

export function getArReceipt(token: string, id: string) {
  return apiFetch<ArReceiptApiResponse>(`/api/ar-receipts/${id}`, { token });
}

export function getOutstandingArInvoices(token: string, customerId: string) {
  return apiFetch<OutstandingArInvoicesApiResponse>(
    `/api/ar-receipts/outstanding-invoices${qs({ customerId })}`,
    { token },
  );
}

export function getCustomerCredit(token: string, customerId: string) {
  return apiFetch<CustomerCreditApiResponse>(`/api/ar-receipts/customer-credit/${customerId}`, { token });
}

export function getArPaymentHistory(token: string, params: ArReceiptQuery) {
  return apiFetch<PaymentHistoryApiResponse>(
    `/api/ar-receipts/payment-history${qs({ ...params, keyword: params.keyword?.trim() })}`,
    { token },
  );
}

export function createArReceipt(token: string, body: CreateArReceiptBody) {
  return apiFetch<ArReceiptApiResponse>(`/api/ar-receipts`, { method: "POST", token, body });
}

export function cancelArReceipt(token: string, id: string, reason: string) {
  return apiFetch<ArReceiptApiResponse>(`/api/ar-receipts/${id}/cancel`, {
    method: "POST",
    token,
    body: { reason },
  });
}

export function getCreditLedger(token: string, customerId: string) {
  return apiFetch<CreditLedgerApiResponse>(`/api/ar-receipts/customer-credit/${customerId}/ledger`, { token });
}

export function getDepositStatus(token: string, salesOrderId: string) {
  return apiFetch<DepositStatusApiResponse>(`/api/ar-receipts/deposit-status/${salesOrderId}`, { token });
}

export function applyCredit(token: string, body: ApplyCreditBody) {
  return apiFetch<CreditApplicationApiResponse>(`/api/ar-receipts/apply-credit`, { method: "POST", token, body });
}

export function getArRefunds(token: string, params: { keyword?: string; status?: string; customerId?: string; page?: number; limit?: number }) {
  return apiFetch<ArRefundListApiResponse>(
    `/api/ar-refunds${qs({ ...params, keyword: params.keyword?.trim() })}`,
    { token },
  );
}

export function createArRefund(token: string, body: CreateArRefundBody) {
  return apiFetch<ArRefundApiResponse>(`/api/ar-refunds`, { method: "POST", token, body });
}

export function cancelArRefund(token: string, id: string, reason: string) {
  return apiFetch<ArRefundApiResponse>(`/api/ar-refunds/${id}/cancel`, { method: "POST", token, body: { reason } });
}

export function getSalesOrderFinance(token: string, salesOrderId: string) {
  return apiFetch<SalesOrderFinanceApiResponse>(`/api/ar-receipts/sales-order-summary/${salesOrderId}`, { token });
}

export function getArAwaitingOrders(token: string, params: AwaitingOrdersQuery) {
  return apiFetch<AwaitingOrdersApiResponse>(
    `/api/ar-receipts/awaiting-orders${qs({
      ...params,
      keyword: params.keyword?.trim(),
      overdueOnly: params.overdueOnly ? "true" : undefined,
    })}`,
    { token },
  );
}
