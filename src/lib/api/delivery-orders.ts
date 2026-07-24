import { apiFetch } from "./client";
import type {
  CreateDeliveryOrderFromPackingBody,
  DeliveryOrderApiResponse,
  DeliveryOrderListApiResponse,
  DeliveryOrderQueryParams,
  ReadyPackingListApiResponse,
  UpdateDeliveryOrderBody,
} from "@/types/delivery-orders";

function buildQuery(params?: DeliveryOrderQueryParams) {
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

export function getDeliveryOrders(
  token: string,
  params?: DeliveryOrderQueryParams,
) {
  return apiFetch<DeliveryOrderListApiResponse>(
    `/api/delivery-orders${buildQuery(params)}`,
    { method: "GET", token },
  );
}

export function getReadyPackingsForDelivery(token: string) {
  return apiFetch<ReadyPackingListApiResponse>(
    "/api/delivery-orders/packings/ready",
    { method: "GET", token },
  );
}

export function getDeliveryOrder(token: string, id: string) {
  return apiFetch<DeliveryOrderApiResponse>(`/api/delivery-orders/${id}`, {
    method: "GET",
    token,
  });
}

export function createDeliveryOrderFromPacking(
  token: string,
  packingId: string,
  body: CreateDeliveryOrderFromPackingBody = {},
) {
  return apiFetch<DeliveryOrderApiResponse>(
    `/api/delivery-orders/from-packing/${packingId}`,
    { method: "POST", token, body },
  );
}

export function updateDeliveryOrder(
  token: string,
  id: string,
  body: UpdateDeliveryOrderBody,
) {
  return apiFetch<DeliveryOrderApiResponse>(`/api/delivery-orders/${id}`, {
    method: "PATCH",
    token,
    body,
  });
}

export function confirmDeliveryOrder(token: string, id: string) {
  return apiFetch<DeliveryOrderApiResponse>(
    `/api/delivery-orders/${id}/confirm`,
    { method: "POST", token },
  );
}

export function deliverDeliveryOrder(token: string, id: string) {
  return apiFetch<DeliveryOrderApiResponse>(
    `/api/delivery-orders/${id}/deliver`,
    { method: "POST", token },
  );
}

export function cancelDeliveryOrder(token: string, id: string) {
  return apiFetch<DeliveryOrderApiResponse>(
    `/api/delivery-orders/${id}/cancel`,
    { method: "POST", token },
  );
}
