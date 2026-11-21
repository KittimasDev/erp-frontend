import { apiFetch } from "./client";
import type {
  SalesTaxInvoiceListResponse,
  SalesTaxInvoiceResponse,
} from "@/types/sales-tax-invoices";

export type SalesTaxInvoiceQuery = {
  keyword?: string;
  status?: string;
  page?: number;
  limit?: number;
};

function buildQuery(params?: SalesTaxInvoiceQuery) {
  const search = new URLSearchParams();
  if (params?.keyword?.trim()) search.set("keyword", params.keyword.trim());
  if (params?.status?.trim()) search.set("status", params.status.trim());
  if (params?.page != null) search.set("page", String(params.page));
  if (params?.limit != null) search.set("limit", String(params.limit));
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export function getSalesTaxInvoices(token: string, params?: SalesTaxInvoiceQuery) {
  return apiFetch<SalesTaxInvoiceListResponse>(
    `/api/sales-tax-invoices${buildQuery(params)}`,
    { token },
  );
}

export function getSalesTaxInvoice(token: string, id: string) {
  return apiFetch<SalesTaxInvoiceResponse>(`/api/sales-tax-invoices/${id}`, {
    token,
  });
}

export function getSalesTaxInvoiceBySalesInvoice(
  token: string,
  salesInvoiceId: string,
) {
  return apiFetch<SalesTaxInvoiceResponse>(
    `/api/sales-tax-invoices/by-sales-invoice/${salesInvoiceId}`,
    { token },
  );
}

export function issueSalesTaxInvoice(token: string, salesInvoiceId: string) {
  return apiFetch<SalesTaxInvoiceResponse>("/api/sales-tax-invoices", {
    method: "POST",
    token,
    body: { salesInvoiceId },
  });
}

export function getSalesTaxInvoiceByAdvanceReceipt(
  token: string,
  advanceReceiptId: string,
) {
  return apiFetch<SalesTaxInvoiceResponse>(
    `/api/sales-tax-invoices/by-advance-receipt/${advanceReceiptId}`,
    { token },
  );
}

export function issueSalesTaxInvoiceFromAdvance(token: string, advanceReceiptId: string) {
  return apiFetch<SalesTaxInvoiceResponse>("/api/sales-tax-invoices", {
    method: "POST",
    token,
    body: { advanceReceiptId },
  });
}

export function cancelSalesTaxInvoice(token: string, id: string, reason: string) {
  return apiFetch<SalesTaxInvoiceResponse>(`/api/sales-tax-invoices/${id}/cancel`, {
    method: "POST",
    token,
    body: { reason },
  });
}
