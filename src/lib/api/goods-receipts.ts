import { apiFetch } from "./client";
import type {
  CreateGoodsReceiptFromPoBody,
  GoodsReceiptApiResponse,
  GoodsReceiptByPoApiResponse,
  GoodsReceiptListApiResponse,
  GoodsReceiptQueryParams,
  UpdateGoodsReceiptBody,
} from "@/types/goods-receipts";

function buildQuery(params?: GoodsReceiptQueryParams) {
  if (!params) return "";
  const search = new URLSearchParams();
  if (params.grNo?.trim()) search.set("grNo", params.grNo.trim());
  if (params.status?.trim()) search.set("status", params.status.trim());
  if (params.purchaseOrderId)
    search.set("purchaseOrderId", params.purchaseOrderId);
  if (params.grDateFrom) search.set("grDateFrom", params.grDateFrom);
  if (params.grDateTo) search.set("grDateTo", params.grDateTo);
  if (params.page != null) search.set("page", String(params.page));
  if (params.limit != null) search.set("limit", String(params.limit));
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export function getGoodsReceipts(
  token: string,
  params?: GoodsReceiptQueryParams,
) {
  return apiFetch<GoodsReceiptListApiResponse>(
    `/api/goods-receipts${buildQuery(params)}`,
    { token },
  );
}

export function getGoodsReceipt(token: string, id: string) {
  return apiFetch<GoodsReceiptApiResponse>(`/api/goods-receipts/${id}`, {
    token,
  });
}

export function getGoodsReceiptsByPo(
  token: string,
  purchaseOrderId: string,
) {
  return apiFetch<GoodsReceiptByPoApiResponse>(
    `/api/goods-receipts/by-po/${purchaseOrderId}`,
    { token },
  );
}

export function createGoodsReceiptFromPo(
  token: string,
  purchaseOrderId: string,
  body: CreateGoodsReceiptFromPoBody,
) {
  return apiFetch<GoodsReceiptApiResponse>(
    `/api/goods-receipts/from-po/${purchaseOrderId}`,
    { method: "POST", token, body },
  );
}

export function updateGoodsReceipt(
  token: string,
  id: string,
  body: UpdateGoodsReceiptBody,
) {
  return apiFetch<GoodsReceiptApiResponse>(`/api/goods-receipts/${id}`, {
    method: "PATCH",
    token,
    body,
  });
}

export function confirmGoodsReceipt(token: string, id: string) {
  return apiFetch<GoodsReceiptApiResponse>(
    `/api/goods-receipts/${id}/confirm`,
    { method: "POST", token },
  );
}

export function cancelGoodsReceipt(token: string, id: string) {
  return apiFetch<GoodsReceiptApiResponse>(
    `/api/goods-receipts/${id}/cancel`,
    { method: "POST", token },
  );
}
