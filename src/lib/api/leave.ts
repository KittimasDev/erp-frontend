import { apiFetch } from "./client";
import type {
  CreateMyLeaveRequest,
  LeaveQueryParams,
  LeaveRequestApiResponse,
  LeaveRequestListApiResponse,
  LeaveSummaryApiResponse,
  LeaveSummaryParams,
} from "@/types/leave";

const BASE = "/api/hrm/leave-requests";

/* ---------- พนักงานยื่นเอง (หน้า /leave) ---------- */

export function getMyLeaveRequests(token: string, limit = 30) {
  return apiFetch<LeaveRequestListApiResponse>(`${BASE}/me?limit=${limit}`, {
    method: "GET",
    token,
  });
}

export function createMyLeaveRequest(
  token: string,
  body: CreateMyLeaveRequest,
) {
  return apiFetch<LeaveRequestApiResponse>(`${BASE}/me`, {
    method: "POST",
    token,
    body,
  });
}

export function cancelMyLeaveRequest(token: string, id: string) {
  return apiFetch<LeaveRequestApiResponse>(`${BASE}/me/${id}/cancel`, {
    method: "POST",
    token,
    body: {},
  });
}

/* ---------- ฝ่ายบุคคล (หน้า /hrm/leave-requests) ---------- */

export function getLeaveRequests(
  token: string,
  params: LeaveQueryParams = {},
) {
  const search = new URLSearchParams();
  if (params.status?.trim()) search.set("status", params.status.trim());
  if (params.leaveType?.trim()) search.set("leaveType", params.leaveType.trim());
  if (params.userId?.trim()) search.set("userId", params.userId.trim());
  if (params.q?.trim()) search.set("q", params.q.trim());
  if (params.dateFrom) search.set("dateFrom", params.dateFrom);
  if (params.dateTo) search.set("dateTo", params.dateTo);

  const query = search.toString();
  return apiFetch<LeaveRequestListApiResponse>(
    `${BASE}${query ? `?${query}` : ""}`,
    { method: "GET", token },
  );
}

export function getLeaveSummary(
  token: string,
  params: LeaveSummaryParams = {},
) {
  const search = new URLSearchParams();
  if (params.dateFrom) search.set("dateFrom", params.dateFrom);
  if (params.dateTo) search.set("dateTo", params.dateTo);

  const query = search.toString();
  return apiFetch<LeaveSummaryApiResponse>(
    `${BASE}/summary${query ? `?${query}` : ""}`,
    { method: "GET", token },
  );
}

export function approveLeaveRequest(
  token: string,
  id: string,
  remark?: string,
) {
  return apiFetch<LeaveRequestApiResponse>(`${BASE}/${id}/approve`, {
    method: "POST",
    token,
    body: remark ? { remark } : {},
  });
}

export function rejectLeaveRequest(token: string, id: string, remark?: string) {
  return apiFetch<LeaveRequestApiResponse>(`${BASE}/${id}/reject`, {
    method: "POST",
    token,
    body: remark ? { remark } : {},
  });
}
