import { apiFetch } from "./client";
import type {
  ApDocumentKind,
  ApDocumentListResponse,
  ApDocumentQueryParams,
  ApDocumentResponse,
  ApInvoiceOptionsResponse,
  ApPurchaseOrderOptionsResponse,
  SaveApDebitNoteBody,
  SaveApInvoiceBody,
} from "@/types/ap-documents";

/** ใบตั้งหนี้กับใบเพิ่มหนี้ใช้ endpoint แยก (สิทธิ์คนละหน้าจอ) แต่หน้าตาข้อมูลเหมือนกัน */
const BASE: Record<ApDocumentKind, string> = {
  invoice: "/api/ap-invoices",
  debitNote: "/api/ap-debit-notes",
};

function buildQuery(params?: Record<string, unknown>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      search.set(key, String(value).trim());
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export function getApDocuments(
  token: string,
  kind: ApDocumentKind,
  params?: ApDocumentQueryParams,
) {
  return apiFetch<ApDocumentListResponse>(`${BASE[kind]}${buildQuery(params)}`, { token });
}

export function getApDocument(token: string, kind: ApDocumentKind, id: string) {
  return apiFetch<ApDocumentResponse>(`${BASE[kind]}/${id}`, { token });
}

export function createApDocument(
  token: string,
  kind: ApDocumentKind,
  body: SaveApInvoiceBody | SaveApDebitNoteBody,
) {
  return apiFetch<ApDocumentResponse>(BASE[kind], {
    method: "POST",
    token,
    body,
  });
}

export function updateApDocument(
  token: string,
  kind: ApDocumentKind,
  id: string,
  body: SaveApInvoiceBody | SaveApDebitNoteBody,
) {
  return apiFetch<ApDocumentResponse>(`${BASE[kind]}/${id}`, {
    method: "PATCH",
    token,
    body,
  });
}

export function approveApDocument(token: string, kind: ApDocumentKind, id: string) {
  return apiFetch<ApDocumentResponse>(`${BASE[kind]}/${id}/approve`, {
    method: "POST",
    token,
  });
}

export function cancelApDocument(
  token: string,
  kind: ApDocumentKind,
  id: string,
  reason?: string,
) {
  return apiFetch<ApDocumentResponse>(`${BASE[kind]}/${id}/cancel`, {
    method: "POST",
    token,
    body: { reason: reason?.trim() || undefined },
  });
}

export function getApPurchaseOrderOptions(token: string, creditorId: string) {
  return apiFetch<ApPurchaseOrderOptionsResponse>(
    `${BASE.invoice}/purchase-order-options${buildQuery({ creditorId })}`,
    { token },
  );
}

export function getApInvoiceOptions(token: string, creditorId: string) {
  return apiFetch<ApInvoiceOptionsResponse>(
    `${BASE.debitNote}/invoice-options${buildQuery({ creditorId })}`,
    { token },
  );
}
