import { apiFetch } from "./client";
import type {
  CreatePurchaseOrderFromPrBody,
  PurchaseOrderApiResponse,
  PurchaseOrderByPrApiResponse,
  PurchaseOrderListApiResponse,
  PurchaseOrderQueryParams,
  RejectPurchaseOrderBody,
  UpdatePurchaseOrderBody,
} from "@/types/purchase-orders";

function buildQuery(params?: PurchaseOrderQueryParams) {
  if (!params) return "";
  const search = new URLSearchParams();
  if (params.poNo?.trim()) search.set("poNo", params.poNo.trim());
  if (params.status?.trim()) search.set("status", params.status.trim());
  if (params.purchaseRequestId)
    search.set("purchaseRequestId", params.purchaseRequestId);
  if (params.poDateFrom) search.set("poDateFrom", params.poDateFrom);
  if (params.poDateTo) search.set("poDateTo", params.poDateTo);
  if (params.page != null) search.set("page", String(params.page));
  if (params.limit != null) search.set("limit", String(params.limit));
  const query = search.toString();
  return query ? `?${query}` : "";
}

export function getPurchaseOrders(
  token: string,
  params?: PurchaseOrderQueryParams,
) {
  return apiFetch<PurchaseOrderListApiResponse>(
    `/api/purchase-orders${buildQuery(params)}`,
    { method: "GET", token },
  );
}

export function getPurchaseOrder(token: string, id: string) {
  return apiFetch<PurchaseOrderApiResponse>(`/api/purchase-orders/${id}`, {
    method: "GET",
    token,
  });
}

export function getPurchaseOrderByPr(
  token: string,
  purchaseRequestId: string,
) {
  return apiFetch<PurchaseOrderByPrApiResponse>(
    `/api/purchase-orders/by-pr/${purchaseRequestId}`,
    { method: "GET", token },
  );
}

export function createPurchaseOrderFromPr(
  token: string,
  purchaseRequestId: string,
  body: CreatePurchaseOrderFromPrBody,
) {
  return apiFetch<PurchaseOrderApiResponse>(
    `/api/purchase-orders/from-pr/${purchaseRequestId}`,
    { method: "POST", token, body },
  );
}

export function updatePurchaseOrder(
  token: string,
  id: string,
  body: UpdatePurchaseOrderBody,
) {
  return apiFetch<PurchaseOrderApiResponse>(`/api/purchase-orders/${id}`, {
    method: "PATCH",
    token,
    body,
  });
}

/** ใบสั่งซื้อรออนุมัติ — หน้า /purchase-orders/approvals */
export function getPendingPurchaseOrderApprovals(
  token: string,
  params?: PurchaseOrderQueryParams,
) {
  return apiFetch<PurchaseOrderListApiResponse>(
    `/api/purchase-orders/approvals/pending${buildQuery(params)}`,
    { method: "GET", token },
  );
}

/** จัดซื้อส่งให้หัวหน้าอนุมัติ (DRAFT → รออนุมัติ) */
export function submitPurchaseOrder(token: string, id: string) {
  return apiFetch<PurchaseOrderApiResponse>(
    `/api/purchase-orders/${id}/submit`,
    { method: "POST", token },
  );
}

/** หัวหน้าอนุมัติ (รออนุมัติ → อนุมัติแล้ว รอส่งสินค้า) */
export function approvePurchaseOrder(token: string, id: string) {
  return apiFetch<PurchaseOrderApiResponse>(
    `/api/purchase-orders/${id}/approve`,
    { method: "POST", token },
  );
}

export function rejectPurchaseOrder(
  token: string,
  id: string,
  body: RejectPurchaseOrderBody,
) {
  return apiFetch<PurchaseOrderApiResponse>(
    `/api/purchase-orders/${id}/reject`,
    { method: "POST", token, body },
  );
}

/** ส่งกลับให้จัดซื้อแก้ไข (รออนุมัติ → ร่าง) */
export function returnPurchaseOrderToDraft(
  token: string,
  id: string,
  body: RejectPurchaseOrderBody,
) {
  return apiFetch<PurchaseOrderApiResponse>(
    `/api/purchase-orders/${id}/return-to-draft`,
    { method: "POST", token, body },
  );
}

export function cancelPurchaseOrder(token: string, id: string) {
  return apiFetch<PurchaseOrderApiResponse>(
    `/api/purchase-orders/${id}/cancel`,
    { method: "POST", token },
  );
}
