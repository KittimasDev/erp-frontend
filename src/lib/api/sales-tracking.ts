import { apiFetch } from "./client";
import type { DeliveryOrderApiResponse } from "@/types/delivery-orders";
import type {
  SalesTrackingDetail,
  SalesTrackingList,
  SalesTrackingQueryParams,
  SalesTrackingSummary,
} from "@/types/sales-tracking";

type ApiWrap<T> = { statusCode?: number; message: string; data: T };

function buildQuery(params?: SalesTrackingQueryParams) {
  if (!params) return "";
  const search = new URLSearchParams();
  if (params.keyword?.trim()) search.set("keyword", params.keyword.trim());
  if (params.customerId) search.set("customerId", params.customerId);
  if (params.salesOrderStatus) search.set("salesOrderStatus", params.salesOrderStatus);
  if (params.dateFrom) search.set("dateFrom", params.dateFrom);
  if (params.dateTo) search.set("dateTo", params.dateTo);
  if (params.page) search.set("page", String(params.page));
  if (params.pageSize) search.set("pageSize", String(params.pageSize));
  const q = search.toString();
  return q ? `?${q}` : "";
}

export function getSalesTrackingSummary(token: string) {
  return apiFetch<ApiWrap<SalesTrackingSummary>>("/api/sales-tracking/summary", {
    method: "GET",
    token,
  });
}

export function getSalesTrackingList(
  token: string,
  params?: SalesTrackingQueryParams,
) {
  return apiFetch<ApiWrap<SalesTrackingList>>(
    `/api/sales-tracking${buildQuery(params)}`,
    { method: "GET", token },
  );
}

export function getSalesTrackingDetail(token: string, salesOrderId: string) {
  return apiFetch<ApiWrap<SalesTrackingDetail>>(
    `/api/sales-tracking/${salesOrderId}`,
    { method: "GET", token },
  );
}

export function getSalesTrackingDeliveryOrder(
  token: string,
  salesOrderId: string,
  deliveryOrderId: string,
) {
  return apiFetch<DeliveryOrderApiResponse>(
    `/api/sales-tracking/${salesOrderId}/delivery-orders/${deliveryOrderId}`,
    { method: "GET", token },
  );
}
