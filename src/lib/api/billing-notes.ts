import type {
  BillingCreateInfo,
  BillingNoteDetail,
  BillingNoteList,
  BillingNoteListItem,
  BillingNoteQuery,
  PendingBillingApList,
  PendingBillingApQuery,
  SaveBillingNoteBody,
} from "@/types/billing-notes";

import { apiFetch } from "./client";

const BASE = "/api/billing-notes";

type Res<T> = { message: string; data: T };

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

/** ตารางรอวางบิล — AP ที่อนุมัติแล้วและมียอดพร้อมวางบิล */
export function getPendingBillingAps(token: string, params?: PendingBillingApQuery) {
  return apiFetch<Res<PendingBillingApList>>(`${BASE}/pending-aps${buildQuery(params)}`, { token });
}

/** ตารางใบวางบิลที่สร้างแล้ว */
export function getBillingNotes(token: string, params?: BillingNoteQuery) {
  return apiFetch<Res<BillingNoteList>>(`${BASE}/created${buildQuery(params)}`, { token });
}

/** ข้อมูลส่งออกตามตัวกรองปัจจุบัน (ไม่แบ่งหน้า) */
export function getBillingNotesExport(token: string, params?: Omit<BillingNoteQuery, "page" | "limit">) {
  return apiFetch<Res<BillingNoteListItem[]>>(`${BASE}/created/export${buildQuery(params)}`, { token });
}

/** ข้อมูลตั้งต้นหน้าสร้างใบวางบิลจาก AP ที่เลือก */
export function getBillingCreateInfo(token: string, apIds: string[]) {
  return apiFetch<Res<BillingCreateInfo>>(`${BASE}/create-info${buildQuery({ apIds: apIds.join(",") })}`, { token });
}

export function getBillingNoteDetail(token: string, id: string) {
  return apiFetch<Res<BillingNoteDetail>>(`${BASE}/${id}`, { token });
}

export function createBillingNote(token: string, body: SaveBillingNoteBody) {
  return apiFetch<Res<BillingNoteDetail>>(BASE, { method: "POST", token, body });
}

export function updateBillingNote(token: string, id: string, body: SaveBillingNoteBody) {
  return apiFetch<Res<BillingNoteDetail>>(`${BASE}/${id}`, { method: "PUT", token, body });
}

export function confirmBillingNote(token: string, id: string) {
  return apiFetch<Res<BillingNoteDetail>>(`${BASE}/${id}/confirm`, { method: "POST", token });
}

export function cancelBillingNote(token: string, id: string, reason?: string) {
  return apiFetch<Res<BillingNoteDetail>>(`${BASE}/${id}/cancel`, { method: "POST", token, body: { reason } });
}

export function issueBillingNotePv(token: string, id: string, body: { amount: number; desiredPayDate?: string }) {
  return apiFetch<Res<BillingNoteDetail>>(`${BASE}/${id}/issue-pv`, { method: "POST", token, body });
}
