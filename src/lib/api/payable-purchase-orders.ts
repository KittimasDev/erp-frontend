import { apiFetch } from "./client";
import type {
  PayablePurchaseOrderDetailResponse,
  PayablePurchaseOrderListResponse,
  PayablePurchaseOrderQueryParams,
} from "@/types/payable-purchase-orders";

function buildQuery(params?: PayablePurchaseOrderQueryParams) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      search.set(key, String(value).trim());
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export function getPayablePurchaseOrders(
  token: string,
  params?: PayablePurchaseOrderQueryParams,
) {
  return apiFetch<PayablePurchaseOrderListResponse>(
    `/api/payable-purchase-orders${buildQuery(params)}`,
    { token },
  );
}

export function getPayablePurchaseOrder(token: string, id: string) {
  return apiFetch<PayablePurchaseOrderDetailResponse>(
    `/api/payable-purchase-orders/${id}`,
    { token },
  );
}
