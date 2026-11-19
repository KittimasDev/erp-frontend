import { apiFetch } from "./client";
import type {
  ArBillingNoteApiResponse,
  ArBillingNoteListApiResponse,
  ArBillingNoteQuery,
  PendingArInvoiceListApiResponse,
  PendingArInvoiceQuery,
  SaveArBillingNoteBody,
} from "@/types/ar-billing-notes";

function qs(params: Record<string, string | number | undefined | null>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const s = search.toString();
  return s ? `?${s}` : "";
}

export function getPendingArInvoices(token: string, params: PendingArInvoiceQuery) {
  return apiFetch<PendingArInvoiceListApiResponse>(
    `/api/ar-billing-notes/pending-invoices${qs({ ...params, keyword: params.keyword?.trim() })}`,
    { token },
  );
}

export function getArBillingNotes(token: string, params: ArBillingNoteQuery) {
  return apiFetch<ArBillingNoteListApiResponse>(
    `/api/ar-billing-notes${qs({ ...params, keyword: params.keyword?.trim() })}`,
    { token },
  );
}

export function getArBillingNote(token: string, id: string) {
  return apiFetch<ArBillingNoteApiResponse>(`/api/ar-billing-notes/${id}`, { token });
}

export function createArBillingNote(token: string, body: SaveArBillingNoteBody) {
  return apiFetch<ArBillingNoteApiResponse>(`/api/ar-billing-notes`, {
    method: "POST",
    token,
    body,
  });
}

export function updateArBillingNote(token: string, id: string, body: SaveArBillingNoteBody) {
  return apiFetch<ArBillingNoteApiResponse>(`/api/ar-billing-notes/${id}`, {
    method: "PATCH",
    token,
    body,
  });
}

export function confirmArBillingNote(token: string, id: string) {
  return apiFetch<ArBillingNoteApiResponse>(`/api/ar-billing-notes/${id}/confirm`, {
    method: "POST",
    token,
  });
}

export function cancelArBillingNote(token: string, id: string, reason?: string) {
  return apiFetch<ArBillingNoteApiResponse>(`/api/ar-billing-notes/${id}/cancel`, {
    method: "POST",
    token,
    body: { reason },
  });
}
