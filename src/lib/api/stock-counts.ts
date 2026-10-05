import { apiFetch } from "./client";
import type {
  CreateStockCountBody,
  StockCountApiResponse,
  StockCountListApiResponse,
  StockCountQueryParams,
  UpdateStockCountBody,
} from "@/types/stock-counts";

function buildQuery(params?: StockCountQueryParams) {
  if (!params) return "";
  const search = new URLSearchParams();
  if (params.countNo?.trim()) search.set("countNo", params.countNo.trim());
  if (params.status?.trim()) search.set("status", params.status.trim());
  if (params.warehouseId) search.set("warehouseId", params.warehouseId);
  if (params.warehouseGroup) {
    search.set("warehouseGroup", params.warehouseGroup);
  }
  if (params.dateFrom) search.set("dateFrom", params.dateFrom);
  if (params.dateTo) search.set("dateTo", params.dateTo);
  if (params.page != null) search.set("page", String(params.page));
  if (params.limit != null) search.set("limit", String(params.limit));
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export function getStockCounts(token: string, params?: StockCountQueryParams) {
  return apiFetch<StockCountListApiResponse>(
    `/api/stock-counts${buildQuery(params)}`,
    { token },
  );
}

export function getStockCount(token: string, id: string) {
  return apiFetch<StockCountApiResponse>(`/api/stock-counts/${id}`, {
    token,
  });
}

export function createStockCount(token: string, body: CreateStockCountBody) {
  return apiFetch<StockCountApiResponse>("/api/stock-counts", {
    method: "POST",
    token,
    body,
  });
}

export function updateStockCount(
  token: string,
  id: string,
  body: UpdateStockCountBody,
) {
  return apiFetch<StockCountApiResponse>(`/api/stock-counts/${id}`, {
    method: "PATCH",
    token,
    body,
  });
}

export function cancelStockCount(token: string, id: string) {
  return apiFetch<StockCountApiResponse>(`/api/stock-counts/${id}/cancel`, {
    method: "POST",
    token,
  });
}

export function approveStockCount(token: string, id: string) {
  return apiFetch<StockCountApiResponse>(`/api/stock-counts/${id}/approve`, {
    method: "POST",
    token,
  });
}
