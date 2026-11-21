import { apiFetch } from "./client";
import type {
  AdvanceReceipt,
  AdvanceReceiptInput,
  AdvanceReceiptSuggestion,
  AdvanceSalesOrderOption,
} from "@/types/advance-receipts";

type Api<T> = { statusCode: number; message: string; data: T };

export type AdvanceReceiptQuery = {
  keyword?: string;
  status?: string;
  page?: number;
  limit?: number;
};

function qs(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue;
    search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

export function getAdvanceReceipts(token: string, params: AdvanceReceiptQuery) {
  return apiFetch<Api<{ items: AdvanceReceipt[]; total: number; page: number; limit: number }>>(
    `/api/advance-receipts${qs(params)}`,
    { token },
  );
}

export function getAdvanceReceipt(token: string, id: string) {
  return apiFetch<Api<AdvanceReceipt>>(`/api/advance-receipts/${id}`, { token });
}

export function searchAdvanceSalesOrders(token: string, keyword: string) {
  return apiFetch<Api<AdvanceSalesOrderOption[]>>(
    `/api/advance-receipts/sales-orders${qs({ keyword })}`,
    { token },
  );
}

export function getAdvanceReceiptSuggestion(token: string, salesOrderId: string) {
  return apiFetch<Api<AdvanceReceiptSuggestion>>(
    `/api/advance-receipts/suggestion${qs({ salesOrderId })}`,
    { token },
  );
}

export function createAdvanceReceipt(token: string, body: AdvanceReceiptInput) {
  return apiFetch<Api<AdvanceReceipt>>("/api/advance-receipts", {
    method: "POST",
    token,
    body,
  });
}

export function updateAdvanceReceipt(token: string, id: string, body: AdvanceReceiptInput) {
  return apiFetch<Api<AdvanceReceipt>>(`/api/advance-receipts/${id}`, {
    method: "PATCH",
    token,
    body,
  });
}

export function confirmAdvanceReceipt(token: string, id: string) {
  return apiFetch<Api<AdvanceReceipt>>(`/api/advance-receipts/${id}/confirm`, {
    method: "POST",
    token,
  });
}

export function cancelAdvanceReceipt(token: string, id: string, reason: string) {
  return apiFetch<Api<AdvanceReceipt>>(`/api/advance-receipts/${id}/cancel`, {
    method: "POST",
    token,
    body: { reason },
  });
}
