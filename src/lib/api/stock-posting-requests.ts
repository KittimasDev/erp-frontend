import { apiFetch } from "./client";
import type {
  CreateStockPostingRequestBody,
  RejectStockPostingRequestBody,
  StockPostingRequestApiResponse,
  StockPostingRequestListApiResponse,
  StockPostingRequestNullableApiResponse,
} from "@/types/stock-posting-request";

export function getStockPostingRequestByReceipt(
  token: string,
  receiptId: string,
) {
  return apiFetch<StockPostingRequestNullableApiResponse>(
    `/api/raw-tire-purchase/receipts/${receiptId}/stock-posting-request`,
    { method: "GET", token },
  );
}

export function createStockPostingRequest(
  token: string,
  receiptId: string,
  body: CreateStockPostingRequestBody,
) {
  return apiFetch<StockPostingRequestApiResponse>(
    `/api/raw-tire-purchase/receipts/${receiptId}/stock-posting-request`,
    { method: "POST", token, body },
  );
}

export function getStockPostingApprovals(
  token: string,
  status?: string,
) {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  return apiFetch<StockPostingRequestListApiResponse>(
    `/api/warehouse/stock-posting-approvals${query}`,
    { method: "GET", token },
  );
}

export function getStockPostingApproval(token: string, id: string) {
  return apiFetch<StockPostingRequestApiResponse>(
    `/api/warehouse/stock-posting-approvals/${id}`,
    { method: "GET", token },
  );
}

export function approveStockPostingRequest(token: string, id: string) {
  return apiFetch<StockPostingRequestApiResponse>(
    `/api/warehouse/stock-posting-approvals/${id}/approve`,
    { method: "POST", token },
  );
}

export function rejectStockPostingRequest(
  token: string,
  id: string,
  body: RejectStockPostingRequestBody,
) {
  return apiFetch<StockPostingRequestApiResponse>(
    `/api/warehouse/stock-posting-approvals/${id}/reject`,
    { method: "POST", token, body },
  );
}
