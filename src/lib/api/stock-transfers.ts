import { apiFetch } from "./client";
import type {
  CreateStockTransferBody,
  StockTransferApiResponse,
  StockTransferListApiResponse,
  StockTransferQueryParams,
  UpdateStockTransferBody,
} from "@/types/stock-transfers";

function buildQuery(params?: StockTransferQueryParams) {
  if (!params) return "";
  const search = new URLSearchParams();
  if (params.transferNo?.trim())
    search.set("transferNo", params.transferNo.trim());
  if (params.status?.trim()) search.set("status", params.status.trim());
  if (params.dateFrom) search.set("dateFrom", params.dateFrom);
  if (params.dateTo) search.set("dateTo", params.dateTo);
  if (params.warehouseGroup) {
    search.set("warehouseGroup", params.warehouseGroup);
  }
  if (params.page != null) search.set("page", String(params.page));
  if (params.limit != null) search.set("limit", String(params.limit));
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export function getStockTransfers(
  token: string,
  params?: StockTransferQueryParams,
) {
  return apiFetch<StockTransferListApiResponse>(
    `/api/stock-transfers${buildQuery(params)}`,
    { token },
  );
}

export function getStockTransfer(token: string, id: string) {
  return apiFetch<StockTransferApiResponse>(`/api/stock-transfers/${id}`, {
    token,
  });
}

export function createStockTransfer(
  token: string,
  body: CreateStockTransferBody,
) {
  return apiFetch<StockTransferApiResponse>("/api/stock-transfers", {
    method: "POST",
    token,
    body,
  });
}

export function updateStockTransfer(
  token: string,
  id: string,
  body: UpdateStockTransferBody,
) {
  return apiFetch<StockTransferApiResponse>(`/api/stock-transfers/${id}`, {
    method: "PATCH",
    token,
    body,
  });
}

export function cancelStockTransfer(token: string, id: string) {
  return apiFetch<StockTransferApiResponse>(
    `/api/stock-transfers/${id}/cancel`,
    { method: "POST", token },
  );
}

export function approveStockTransfer(token: string, id: string) {
  return apiFetch<StockTransferApiResponse>(
    `/api/stock-transfers/${id}/approve`,
    { method: "POST", token },
  );
}
