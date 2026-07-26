import { apiFetch } from "./client";
import type {
  CompleteProductionOrderBody,
  CreateProductionOrderBody,
  CreateProductionOrderLogBody,
  EndDowntimeBody,
  ProductionOrderApiResponse,
  ProductionOrderListApiResponse,
  ProductionOrderSummaryApiResponse,
  QueryProductionOrdersParams,
  RecordDowntimeBody,
} from "@/types/production-order";

function buildQuery(params?: QueryProductionOrdersParams) {
  if (!params) {
    return "";
  }
  const search = new URLSearchParams();
  if (params.orderNo?.trim()) {
    search.set("orderNo", params.orderNo.trim());
  }
  if (params.status?.trim()) {
    search.set("status", params.status.trim());
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

export function getProductionOrders(
  token: string,
  params?: QueryProductionOrdersParams,
) {
  return apiFetch<ProductionOrderListApiResponse>(
    `/api/production/production-orders${buildQuery(params)}`,
    { method: "GET", token },
  );
}

export function getProductionOrder(token: string, id: string) {
  return apiFetch<ProductionOrderApiResponse>(
    `/api/production/production-orders/${id}`,
    { method: "GET", token },
  );
}

export function createProductionOrder(
  token: string,
  body: CreateProductionOrderBody,
) {
  return apiFetch<ProductionOrderApiResponse>(
    "/api/production/production-orders",
    { method: "POST", token, body },
  );
}

export function cancelProductionOrder(token: string, id: string) {
  return apiFetch<ProductionOrderApiResponse>(
    `/api/production/production-orders/${id}/cancel`,
    { method: "POST", token },
  );
}

export function startProductionOrder(token: string, id: string) {
  return apiFetch<ProductionOrderApiResponse>(
    `/api/production/production-orders/${id}/start`,
    { method: "POST", token },
  );
}

export function completeProductionOrder(
  token: string,
  id: string,
  body: CompleteProductionOrderBody,
) {
  return apiFetch<ProductionOrderApiResponse>(
    `/api/production/production-orders/${id}/complete`,
    { method: "POST", token, body },
  );
}

export function getProductionOrderSummary(token: string, id: string) {
  return apiFetch<ProductionOrderSummaryApiResponse>(
    `/api/production/production-orders/${id}/summary`,
    { method: "GET", token },
  );
}

export function recordProductionOrderDowntime(
  token: string,
  id: string,
  body: RecordDowntimeBody,
) {
  return apiFetch<ProductionOrderApiResponse>(
    `/api/production/production-orders/${id}/downtime`,
    { method: "POST", token, body },
  );
}

export function endProductionOrderDowntime(
  token: string,
  id: string,
  downtimeId: string,
  body: EndDowntimeBody,
) {
  return apiFetch<ProductionOrderApiResponse>(
    `/api/production/production-orders/${id}/downtime/${downtimeId}/end`,
    { method: "PATCH", token, body },
  );
}

export function addProductionOrderLog(
  token: string,
  id: string,
  body: CreateProductionOrderLogBody,
) {
  return apiFetch<ProductionOrderApiResponse>(
    `/api/production/production-orders/${id}/logs`,
    { method: "POST", token, body },
  );
}
