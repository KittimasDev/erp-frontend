import { apiFetch } from "./client";
import type {
  CreatePickingFromSalesOrderBody,
  PickingApiResponse,
  PickingListApiResponse,
  PickingQueryParams,
  ReadySalesOrderListApiResponse,
  UpdatePickingBody,
} from "@/types/pickings";

function buildQuery(params?: PickingQueryParams) {
  if (!params) return "";
  const search = new URLSearchParams();
  if (params.keyword?.trim()) search.set("keyword", params.keyword.trim());
  if (params.status) search.set("status", params.status);
  if (params.dateFrom) search.set("dateFrom", params.dateFrom);
  if (params.dateTo) search.set("dateTo", params.dateTo);
  if (params.customerId) search.set("customerId", params.customerId);
  const q = search.toString();
  return q ? `?${q}` : "";
}

export function getPickings(token: string, params?: PickingQueryParams) {
  return apiFetch<PickingListApiResponse>(
    `/api/pickings${buildQuery(params)}`,
    { method: "GET", token },
  );
}

export function getReadySalesOrdersForPicking(token: string) {
  return apiFetch<ReadySalesOrderListApiResponse>(
    "/api/pickings/sales-orders/ready",
    { method: "GET", token },
  );
}

export function getPicking(token: string, id: string) {
  return apiFetch<PickingApiResponse>(`/api/pickings/${id}`, {
    method: "GET",
    token,
  });
}

export function createPickingFromSalesOrder(
  token: string,
  salesOrderId: string,
  body: CreatePickingFromSalesOrderBody = {},
) {
  return apiFetch<PickingApiResponse>(
    `/api/pickings/from-sales-order/${salesOrderId}`,
    { method: "POST", token, body },
  );
}

export function updatePicking(
  token: string,
  id: string,
  body: UpdatePickingBody,
) {
  return apiFetch<PickingApiResponse>(`/api/pickings/${id}`, {
    method: "PATCH",
    token,
    body,
  });
}

export function confirmPicking(token: string, id: string) {
  return apiFetch<PickingApiResponse>(`/api/pickings/${id}/confirm`, {
    method: "POST",
    token,
  });
}

export function cancelPicking(token: string, id: string) {
  return apiFetch<PickingApiResponse>(`/api/pickings/${id}/cancel`, {
    method: "POST",
    token,
  });
}
