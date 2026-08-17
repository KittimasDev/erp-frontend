import { apiFetch } from "./client";
import type {
  CancelProductionRequestBody,
  CreateProductionRequestBody,
  EligibleSalesOrderApiResponse,
  EligibleSalesOrderListApiResponse,
  ProductionRequestApiResponse,
  ProductionRequestListApiResponse,
  QueryProductionRequestsParams,
  UpdateProductionRequestBody,
} from "@/types/production-request";

const BASE = "/api/production/production-requests";

function buildQuery(params?: QueryProductionRequestsParams) {
  if (!params) {
    return "";
  }
  const search = new URLSearchParams();
  if (params.requestNo?.trim()) {
    search.set("requestNo", params.requestNo.trim());
  }
  if (params.soNo?.trim()) {
    search.set("soNo", params.soNo.trim());
  }
  if (params.status?.trim()) {
    search.set("status", params.status.trim());
  }
  if (params.salesOrderId) {
    search.set("salesOrderId", params.salesOrderId);
  }
  if (params.dateFrom) {
    search.set("dateFrom", params.dateFrom);
  }
  if (params.dateTo) {
    search.set("dateTo", params.dateTo);
  }
  if (params.page) {
    search.set("page", String(params.page));
  }
  if (params.limit) {
    search.set("limit", String(params.limit));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

export function getProductionRequests(
  token: string,
  params?: QueryProductionRequestsParams,
) {
  return apiFetch<ProductionRequestListApiResponse>(
    `${BASE}${buildQuery(params)}`,
    { method: "GET", token },
  );
}

export function getProductionRequest(token: string, id: string) {
  return apiFetch<ProductionRequestApiResponse>(`${BASE}/${id}`, {
    method: "GET",
    token,
  });
}

/** ใบสั่งขายที่ยังไม่อนุมัติและยังมีจำนวนคงค้างให้ขอผลิต */
export function getEligibleSalesOrders(
  token: string,
  params?: { q?: string; limit?: number },
) {
  const search = new URLSearchParams();
  if (params?.q?.trim()) {
    search.set("q", params.q.trim());
  }
  if (params?.limit) {
    search.set("limit", String(params.limit));
  }
  const query = search.toString();
  return apiFetch<EligibleSalesOrderListApiResponse>(
    `${BASE}/eligible-sales-orders${query ? `?${query}` : ""}`,
    { method: "GET", token },
  );
}

export function getEligibleSalesOrder(token: string, salesOrderId: string) {
  return apiFetch<EligibleSalesOrderApiResponse>(
    `${BASE}/eligible-sales-orders/${salesOrderId}`,
    { method: "GET", token },
  );
}

export function createProductionRequest(
  token: string,
  body: CreateProductionRequestBody,
) {
  return apiFetch<ProductionRequestApiResponse>(BASE, {
    method: "POST",
    token,
    body,
  });
}

export function updateProductionRequest(
  token: string,
  id: string,
  body: UpdateProductionRequestBody,
) {
  return apiFetch<ProductionRequestApiResponse>(`${BASE}/${id}`, {
    method: "PUT",
    token,
    body,
  });
}

export function cancelProductionRequest(
  token: string,
  id: string,
  body: CancelProductionRequestBody,
) {
  return apiFetch<ProductionRequestApiResponse>(`${BASE}/${id}/cancel`, {
    method: "POST",
    token,
    body,
  });
}
