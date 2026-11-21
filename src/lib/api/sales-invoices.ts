import { apiFetch } from "./client";
import type {
  CreateSalesInvoiceFromDeliveriesBody,
  CreateSalesInvoiceFromDeliveryBody,
  PendingSalesInvoiceListApiResponse,
  SalesInvoiceApiResponse,
  SalesInvoiceByDeliveryApiResponse,
  SalesInvoiceListApiResponse,
  SalesInvoiceQueryParams,
  UpdateSalesInvoiceBody,
} from "@/types/sales-invoices";

function buildQuery(params?: SalesInvoiceQueryParams) {
  if (!params) return "";
  const search = new URLSearchParams();
  if (params.keyword?.trim()) search.set("keyword", params.keyword.trim());
  if (params.status?.trim()) search.set("status", params.status.trim());
  if (params.paymentStatus?.trim()) {
    search.set("paymentStatus", params.paymentStatus.trim());
  }
  if (params.customerId) search.set("customerId", params.customerId);
  if (params.deliveryOrderId) {
    search.set("deliveryOrderId", params.deliveryOrderId);
  }
  if (params.invoiceDateFrom) {
    search.set("invoiceDateFrom", params.invoiceDateFrom);
  }
  if (params.invoiceDateTo) search.set("invoiceDateTo", params.invoiceDateTo);
  if (params.page != null) search.set("page", String(params.page));
  if (params.limit != null) search.set("limit", String(params.limit));
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export function getPendingSalesInvoices(
  token: string,
  params?: {
    page?: number;
    limit?: number;
    keyword?: string;
    salesOrderId?: string;
  },
) {
  const search = new URLSearchParams();
  if (params?.keyword?.trim()) search.set("keyword", params.keyword.trim());
  if (params?.salesOrderId) search.set("salesOrderId", params.salesOrderId);
  if (params?.page != null) search.set("page", String(params.page));
  if (params?.limit != null) search.set("limit", String(params.limit));
  const qs = search.toString();
  return apiFetch<PendingSalesInvoiceListApiResponse>(
    `/api/sales-invoices/pending${qs ? `?${qs}` : ""}`,
    { token },
  );
}

export function getSalesInvoices(
  token: string,
  params?: SalesInvoiceQueryParams,
) {
  return apiFetch<SalesInvoiceListApiResponse>(
    `/api/sales-invoices${buildQuery(params)}`,
    { token },
  );
}

export function getSalesInvoice(token: string, id: string) {
  return apiFetch<SalesInvoiceApiResponse>(`/api/sales-invoices/${id}`, {
    token,
  });
}

export function getSalesInvoiceByDelivery(
  token: string,
  deliveryOrderId: string,
) {
  return apiFetch<SalesInvoiceByDeliveryApiResponse>(
    `/api/sales-invoices/by-delivery/${deliveryOrderId}`,
    { token },
  );
}

export function createSalesInvoiceFromDelivery(
  token: string,
  deliveryOrderId: string,
  body: CreateSalesInvoiceFromDeliveryBody,
) {
  return apiFetch<SalesInvoiceApiResponse>(
    `/api/sales-invoices/from-delivery/${deliveryOrderId}`,
    { method: "POST", token, body },
  );
}

/** รวมหลายใบส่งสินค้า (ลูกค้า + ใบสั่งขายเดียวกัน) เป็น AR ร่างใบเดียว */
export function createSalesInvoiceFromDeliveries(
  token: string,
  body: CreateSalesInvoiceFromDeliveriesBody,
) {
  return apiFetch<SalesInvoiceApiResponse>(
    `/api/sales-invoices/from-deliveries`,
    { method: "POST", token, body },
  );
}

export function addSalesInvoiceDeliveries(
  token: string,
  id: string,
  deliveryOrderIds: string[],
) {
  return apiFetch<SalesInvoiceApiResponse>(
    `/api/sales-invoices/${id}/add-deliveries`,
    { method: "POST", token, body: { deliveryOrderIds } },
  );
}

export function removeSalesInvoiceDelivery(
  token: string,
  id: string,
  deliveryOrderId: string,
) {
  return apiFetch<SalesInvoiceApiResponse>(
    `/api/sales-invoices/${id}/remove-delivery/${deliveryOrderId}`,
    { method: "POST", token },
  );
}

export function updateSalesInvoice(
  token: string,
  id: string,
  body: UpdateSalesInvoiceBody,
) {
  return apiFetch<SalesInvoiceApiResponse>(`/api/sales-invoices/${id}`, {
    method: "PATCH",
    token,
    body,
  });
}

export function confirmSalesInvoice(token: string, id: string) {
  return apiFetch<SalesInvoiceApiResponse>(
    `/api/sales-invoices/${id}/confirm`,
    { method: "POST", token },
  );
}

export function cancelSalesInvoice(token: string, id: string) {
  return apiFetch<SalesInvoiceApiResponse>(
    `/api/sales-invoices/${id}/cancel`,
    { method: "POST", token },
  );
}
