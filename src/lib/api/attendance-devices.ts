import { apiFetch } from "./client";
import type {
  AttendanceDeviceApiResponse,
  AttendanceDeviceEventListApiResponse,
  AttendanceDeviceListApiResponse,
  AttendanceDeviceWithKeyApiResponse,
  CreateAttendanceDeviceRequest,
  UpdateAttendanceDeviceRequest,
} from "@/types/attendance-devices";

const BASE = "/api/hrm/attendance-devices";

export function getAttendanceDevices(token: string) {
  return apiFetch<AttendanceDeviceListApiResponse>(BASE, { method: "GET", token });
}

export function createAttendanceDevice(token: string, body: CreateAttendanceDeviceRequest) {
  return apiFetch<AttendanceDeviceWithKeyApiResponse>(BASE, { method: "POST", token, body });
}

export function updateAttendanceDevice(
  token: string,
  id: string,
  body: UpdateAttendanceDeviceRequest,
) {
  return apiFetch<AttendanceDeviceApiResponse>(`${BASE}/${id}`, {
    method: "PATCH",
    token,
    body,
  });
}

export function rotateAttendanceDeviceKey(token: string, id: string) {
  return apiFetch<AttendanceDeviceWithKeyApiResponse>(`${BASE}/${id}/rotate-key`, {
    method: "POST",
    token,
  });
}

export function getAttendanceDeviceEvents(token: string, status?: string) {
  const search = status ? `?status=${encodeURIComponent(status)}` : "";
  return apiFetch<AttendanceDeviceEventListApiResponse>(`${BASE}/events${search}`, {
    method: "GET",
    token,
  });
}
