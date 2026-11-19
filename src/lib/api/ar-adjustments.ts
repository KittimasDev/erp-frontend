import { apiFetch } from "./client";
import type {
  ArDebitNoteApiResponse,
  ArDebitNoteListApiResponse,
  ArDebitNoteQuery,
  SaveArDebitNoteBody,
  SettleCreditNoteBody,
  SettlementSummaryApiResponse,
} from "@/types/ar-adjustments";

function qs(params: Record<string, string | number | undefined | null>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const s = search.toString();
  return s ? `?${s}` : "";
}

export function getCreditNoteSettlements(token: string, creditNoteId: string) {
  return apiFetch<SettlementSummaryApiResponse>(`/api/sales-credit-notes/${creditNoteId}/settlements`, { token });
}

export function settleCreditNote(token: string, creditNoteId: string, body: SettleCreditNoteBody) {
  return apiFetch<SettlementSummaryApiResponse>(`/api/sales-credit-notes/${creditNoteId}/settlements`, {
    method: "POST",
    token,
    body,
  });
}

export function cancelCreditNoteSettlement(token: string, settlementId: string, reason: string) {
  return apiFetch<SettlementSummaryApiResponse>(`/api/sales-credit-notes/settlements/${settlementId}/cancel`, {
    method: "POST",
    token,
    body: { reason },
  });
}

export function getArDebitNotes(token: string, params: ArDebitNoteQuery) {
  return apiFetch<ArDebitNoteListApiResponse>(
    `/api/ar-debit-notes${qs({ ...params, keyword: params.keyword?.trim() })}`,
    { token },
  );
}

export function getArDebitNote(token: string, id: string) {
  return apiFetch<ArDebitNoteApiResponse>(`/api/ar-debit-notes/${id}`, { token });
}

export function createArDebitNote(token: string, body: SaveArDebitNoteBody) {
  return apiFetch<ArDebitNoteApiResponse>(`/api/ar-debit-notes`, { method: "POST", token, body });
}

export function updateArDebitNote(token: string, id: string, body: SaveArDebitNoteBody) {
  return apiFetch<ArDebitNoteApiResponse>(`/api/ar-debit-notes/${id}`, { method: "PATCH", token, body });
}

export function confirmArDebitNote(token: string, id: string) {
  return apiFetch<ArDebitNoteApiResponse>(`/api/ar-debit-notes/${id}/confirm`, { method: "POST", token });
}

export function cancelArDebitNote(token: string, id: string, reason?: string) {
  return apiFetch<ArDebitNoteApiResponse>(`/api/ar-debit-notes/${id}/cancel`, {
    method: "POST",
    token,
    body: { reason },
  });
}
