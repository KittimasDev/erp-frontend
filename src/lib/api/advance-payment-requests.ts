import { apiFetch } from "./client";
import type {
  AdvanceRequest,
  AdvanceRequestList,
  AdvanceRequestQuery,
  CreateAdvanceRequestBody,
  EligiblePayable,
  UpdateAdvanceRequestBody,
  UpdateAdvanceWhtBody,
} from "@/types/advance-payment-requests";

type Res<T> = { message: string; data: T };
const BASE = "/api/advance-payment-requests";

function qs(params?: Record<string, unknown>) {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params ?? {})) {
    if (v !== undefined && v !== null && String(v).trim() !== "") s.set(k, String(v).trim());
  }
  const t = s.toString();
  return t ? `?${t}` : "";
}

export const getAdvanceRequests = (token: string, params?: AdvanceRequestQuery) =>
  apiFetch<Res<AdvanceRequestList>>(`${BASE}${qs(params)}`, { token });
export const getAdvanceRequest = (token: string, id: string) =>
  apiFetch<Res<AdvanceRequest>>(`${BASE}/${id}`, { token });
export const getEligiblePayables = (token: string, search?: string) =>
  apiFetch<Res<EligiblePayable[]>>(`${BASE}/eligible-payables${qs({ search })}`, { token });
export const createAdvanceRequest = (token: string, body: CreateAdvanceRequestBody) =>
  apiFetch<Res<AdvanceRequest>>(BASE, { method: "POST", token, body });
export const updateAdvanceRequest = (token: string, id: string, body: UpdateAdvanceRequestBody) =>
  apiFetch<Res<AdvanceRequest>>(`${BASE}/${id}`, { method: "PATCH", token, body });
export const updateAdvanceRequestWht = (token: string, id: string, body: UpdateAdvanceWhtBody) =>
  apiFetch<Res<AdvanceRequest>>(`${BASE}/${id}/wht`, { method: "PATCH", token, body });
export const confirmAdvanceRequest = (token: string, id: string) =>
  apiFetch<Res<AdvanceRequest>>(`${BASE}/${id}/confirm`, { method: "POST", token });
export const cancelAdvanceRequest = (token: string, id: string, reason: string) =>
  apiFetch<Res<AdvanceRequest>>(`${BASE}/${id}/cancel`, { method: "POST", token, body: { reason } });
