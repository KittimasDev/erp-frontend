import { apiFetch } from "./client";
import type {
  SalesCreditNoteListResponse,
  SalesCreditNotePendingListResponse,
  SalesCreditNoteResponse,
  SaveSalesCreditNoteBody,
} from "@/types/sales-credit-notes";

export function getPendingSalesCreditNotes(token: string) {
  return apiFetch<SalesCreditNotePendingListResponse>(
    "/api/sales-credit-notes/pending",
    { token },
  );
}

export function getSalesCreditNotes(
  token: string,
  params?: { page?: number; limit?: number; status?: string; search?: string },
) {
  const search = new URLSearchParams();
  if (params?.page != null) search.set("page", String(params.page));
  if (params?.limit != null) search.set("limit", String(params.limit));
  if (params?.status) search.set("status", params.status);
  if (params?.search?.trim()) search.set("search", params.search.trim());
  const qs = search.toString();
  return apiFetch<SalesCreditNoteListResponse>(
    `/api/sales-credit-notes${qs ? `?${qs}` : ""}`,
    { token },
  );
}

export function getSalesCreditNote(token: string, id: string) {
  return apiFetch<SalesCreditNoteResponse>(`/api/sales-credit-notes/${id}`, {
    token,
  });
}

export function createSalesCreditNote(
  token: string,
  body: SaveSalesCreditNoteBody,
) {
  return apiFetch<SalesCreditNoteResponse>("/api/sales-credit-notes", {
    method: "POST",
    token,
    body,
  });
}

export function updateSalesCreditNote(
  token: string,
  id: string,
  body: SaveSalesCreditNoteBody,
) {
  return apiFetch<SalesCreditNoteResponse>(`/api/sales-credit-notes/${id}`, {
    method: "PATCH",
    token,
    body,
  });
}

export function confirmSalesCreditNote(token: string, id: string) {
  return apiFetch<SalesCreditNoteResponse>(
    `/api/sales-credit-notes/${id}/confirm`,
    { method: "POST", token },
  );
}

export function approveSalesCreditNote(token: string, id: string) {
  return apiFetch<SalesCreditNoteResponse>(
    `/api/sales-credit-notes/${id}/approve`,
    { method: "POST", token },
  );
}

export function cancelSalesCreditNote(token: string, id: string) {
  return apiFetch<SalesCreditNoteResponse>(
    `/api/sales-credit-notes/${id}/cancel`,
    { method: "POST", token },
  );
}
