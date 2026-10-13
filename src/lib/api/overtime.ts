import { apiFetch } from "./client";
import type {
  CreateMyOvertimeRequest,
  OtSettings,
  OtSettingsApiResponse,
  OvertimeQueryParams,
  OvertimeRequestApiResponse,
  OvertimeRequestListApiResponse,
  OvertimeSummaryApiResponse,
  OvertimeSummaryParams,
} from "@/types/overtime";

const BASE = "/api/hrm/overtime-requests";

/* ---------- พนักงานขอเอง (หน้า /overtime) ---------- */

export function getMyOvertimeRequests(token: string, limit = 30) {
  return apiFetch<OvertimeRequestListApiResponse>(
    `${BASE}/me?limit=${limit}`,
    { method: "GET", token },
  );
}

export function createMyOvertimeRequest(
  token: string,
  body: CreateMyOvertimeRequest,
) {
  return apiFetch<OvertimeRequestApiResponse>(`${BASE}/me`, {
    method: "POST",
    token,
    body,
  });
}

export function cancelMyOvertimeRequest(token: string, id: string) {
  return apiFetch<OvertimeRequestApiResponse>(`${BASE}/me/${id}/cancel`, {
    method: "POST",
    token,
    body: {},
  });
}

/* ---------- ฝ่ายบุคคล (หน้า /hrm/overtime-requests) ---------- */

export function getOvertimeRequests(
  token: string,
  params: OvertimeQueryParams = {},
) {
  const search = new URLSearchParams();
  if (params.status?.trim()) search.set("status", params.status.trim());
  if (params.userId?.trim()) search.set("userId", params.userId.trim());
  if (params.q?.trim()) search.set("q", params.q.trim());
  if (params.dateFrom) search.set("dateFrom", params.dateFrom);
  if (params.dateTo) search.set("dateTo", params.dateTo);

  const query = search.toString();
  return apiFetch<OvertimeRequestListApiResponse>(
    `${BASE}${query ? `?${query}` : ""}`,
    { method: "GET", token },
  );
}

export function getOvertimeSummary(
  token: string,
  params: OvertimeSummaryParams = {},
) {
  const search = new URLSearchParams();
  if (params.dateFrom) search.set("dateFrom", params.dateFrom);
  if (params.dateTo) search.set("dateTo", params.dateTo);

  const query = search.toString();
  return apiFetch<OvertimeSummaryApiResponse>(
    `${BASE}/summary${query ? `?${query}` : ""}`,
    { method: "GET", token },
  );
}

/** dayType ไม่ส่ง = ตัดสินจากปฏิทิน · ระบุเองได้ (เช่น ทำงานวันหยุดประจำสัปดาห์ของคนนั้น) */
export function approveOvertimeRequest(
  token: string,
  id: string,
  remark?: string,
  dayType?: string,
) {
  return apiFetch<OvertimeRequestApiResponse>(`${BASE}/${id}/approve`, {
    method: "POST",
    token,
    body: { ...(remark ? { remark } : {}), ...(dayType ? { dayType } : {}) },
  });
}

export function getOtSettings(token: string) {
  return apiFetch<OtSettingsApiResponse>(`${BASE}/settings`, {
    method: "GET",
    token,
  });
}

export function updateOtSettings(token: string, body: OtSettings) {
  return apiFetch<OtSettingsApiResponse>(`${BASE}/settings`, {
    method: "PUT",
    token,
    body,
  });
}

export function rejectOvertimeRequest(
  token: string,
  id: string,
  remark?: string,
) {
  return apiFetch<OvertimeRequestApiResponse>(`${BASE}/${id}/reject`, {
    method: "POST",
    token,
    body: remark ? { remark } : {},
  });
}
