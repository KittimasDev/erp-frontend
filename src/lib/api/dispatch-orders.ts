import { apiFetch } from "./client";
import type {
  AvailableLocationListApiResponse,
  CreateDispatchOrderBody,
  DeliverDispatchOrderBody,
  DispatchOrderApiResponse,
  DispatchOrderListApiResponse,
  DispatchOrderQueryParams,
  FifoLotSuggestionListApiResponse,
} from "@/types/dispatch-orders";

function buildDispatchOrdersQuery(params?: DispatchOrderQueryParams) {
  if (!params) {
    return "";
  }
  const search = new URLSearchParams();
  if (params.dispatchNo?.trim()) {
    search.set("dispatchNo", params.dispatchNo.trim());
  }
  if (params.status?.trim()) {
    search.set("status", params.status.trim());
  }
  if (params.salesOrderId) {
    search.set("salesOrderId", params.salesOrderId);
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

export function getDispatchOrders(
  token: string,
  params?: DispatchOrderQueryParams,
) {
  return apiFetch<DispatchOrderListApiResponse>(
    `/api/sales/dispatch-orders${buildDispatchOrdersQuery(params)}`,
    { method: "GET", token },
  );
}

export function getDispatchOrder(token: string, id: string) {
  return apiFetch<DispatchOrderApiResponse>(
    `/api/sales/dispatch-orders/${id}`,
    { method: "GET", token },
  );
}

export function createDispatchOrder(
  token: string,
  body: CreateDispatchOrderBody,
) {
  return apiFetch<DispatchOrderApiResponse>("/api/sales/dispatch-orders", {
    method: "POST",
    token,
    body,
  });
}

export function confirmPickingDispatchOrder(token: string, id: string) {
  return apiFetch<DispatchOrderApiResponse>(
    `/api/sales/dispatch-orders/${id}/confirm-picking`,
    { method: "POST", token },
  );
}

export function packDispatchOrder(token: string, id: string) {
  return apiFetch<DispatchOrderApiResponse>(
    `/api/sales/dispatch-orders/${id}/pack`,
    { method: "POST", token },
  );
}

export function cancelDispatchOrder(token: string, id: string) {
  return apiFetch<DispatchOrderApiResponse>(
    `/api/sales/dispatch-orders/${id}/cancel`,
    { method: "POST", token },
  );
}

export function dispatchDispatchOrder(
  token: string,
  id: string,
  body: DeliverDispatchOrderBody = {},
) {
  return apiFetch<DispatchOrderApiResponse>(
    `/api/sales/dispatch-orders/${id}/dispatch`,
    { method: "POST", token, body },
  );
}

export function getFifoLotSuggestion(
  token: string,
  params: {
    itemId: string;
    warehouseId: string;
    locationId: string;
    quantity: number;
  },
) {
  const search = new URLSearchParams({
    itemId: params.itemId,
    warehouseId: params.warehouseId,
    locationId: params.locationId,
    quantity: String(params.quantity),
  });
  return apiFetch<FifoLotSuggestionListApiResponse>(
    `/api/inventory/lots/fifo-suggestion?${search.toString()}`,
    { method: "GET", token },
  );
}

export function getAvailableLocations(
  token: string,
  params: { itemId: string; warehouseId: string },
) {
  const search = new URLSearchParams({
    itemId: params.itemId,
    warehouseId: params.warehouseId,
  });
  return apiFetch<AvailableLocationListApiResponse>(
    `/api/inventory/lots/available-locations?${search.toString()}`,
    { method: "GET", token },
  );
}
