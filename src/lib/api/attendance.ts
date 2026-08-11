import { apiFetch } from "./client";
import type {
  AttendanceQueryParams,
  AttendanceRecordApiResponse,
  AttendanceRecordListApiResponse,
  AttendanceSummaryApiResponse,
  AttendanceSummaryParams,
  MyAttendanceStatusApiResponse,
} from "@/types/attendance";

/* ---------- พนักงานลงเวลาของตัวเอง (หน้า /attendance) ---------- */

export function getMyAttendanceToday(token: string) {
  return apiFetch<MyAttendanceStatusApiResponse>("/api/hrm/attendance/me/today", {
    method: "GET",
    token,
  });
}

export function selfCheckIn(token: string, remark?: string) {
  return apiFetch<AttendanceRecordApiResponse>(
    "/api/hrm/attendance/me/check-in",
    { method: "POST", token, body: remark ? { remark } : {} },
  );
}

export function selfCheckOut(token: string) {
  return apiFetch<AttendanceRecordApiResponse>(
    "/api/hrm/attendance/me/check-out",
    { method: "POST", token, body: {} },
  );
}

export function getMyAttendanceHistory(token: string, limit = 14) {
  return apiFetch<AttendanceRecordListApiResponse>(
    `/api/hrm/attendance/me/history?limit=${limit}`,
    { method: "GET", token },
  );
}

/* ---------- ฝ่ายบุคคล (หน้า /hrm/attendance) ---------- */

export function getAttendanceRecords(
  token: string,
  params: AttendanceQueryParams = {},
) {
  const search = new URLSearchParams();
  if (params.userId?.trim()) search.set("userId", params.userId.trim());
  if (params.dateFrom) search.set("dateFrom", params.dateFrom);
  if (params.dateTo) search.set("dateTo", params.dateTo);
  if (params.q?.trim()) search.set("q", params.q.trim());
  if (params.status?.trim()) search.set("status", params.status.trim());

  const query = search.toString();
  return apiFetch<AttendanceRecordListApiResponse>(
    `/api/hrm/attendance${query ? `?${query}` : ""}`,
    { method: "GET", token },
  );
}

export function getAttendanceSummary(
  token: string,
  params: AttendanceSummaryParams = {},
) {
  const search = new URLSearchParams();
  if (params.dateFrom) search.set("dateFrom", params.dateFrom);
  if (params.dateTo) search.set("dateTo", params.dateTo);

  const query = search.toString();
  return apiFetch<AttendanceSummaryApiResponse>(
    `/api/hrm/attendance/summary${query ? `?${query}` : ""}`,
    { method: "GET", token },
  );
}
