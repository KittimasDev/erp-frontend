import { apiFetch } from "./client";
import type {
  BulkCreateShiftSchedulesRequest,
  BulkShiftScheduleApiResponse,
  CreateShiftRequest,
  CreateShiftScheduleRequest,
  CreateWorkCalendarDayRequest,
  MyShiftScheduleApiResponse,
  ShiftApiResponse,
  ShiftAssignmentListApiResponse,
  ShiftAssignmentParams,
  ShiftCalendarApiResponse,
  ShiftCalendarParams,
  ShiftListApiResponse,
  ShiftAutoPlanApiResponse,
  ShiftAutoPlanApplyRequest,
  ShiftAutoPlanPositionOptionsApiResponse,
  ShiftAutoPlanPositionsParams,
  ShiftAutoPlanRequest,
  ShiftAutoPlanRoleOptionsApiResponse,
  ShiftPlanCycleApiResponse,
  UpdateShiftPlanCycleRequest,
  ShiftRosterApiResponse,
  ShiftScheduleApiResponse,
  UpdateShiftRequest,
  UpdateShiftScheduleRequest,
  WorkCalendarDayApiResponse,
} from "@/types/shifts";

type Envelope = { statusCode: number; message: string };

/* ---------- กะมาตรฐาน ---------- */

export function getShifts(token: string, includeInactive = false) {
  return apiFetch<ShiftListApiResponse>(
    `/api/hrm/shifts${includeInactive ? "?includeInactive=true" : ""}`,
    { method: "GET", token },
  );
}

export function createShift(token: string, body: CreateShiftRequest) {
  return apiFetch<ShiftApiResponse>("/api/hrm/shifts", {
    method: "POST",
    token,
    body,
  });
}

export function updateShift(
  token: string,
  id: string,
  body: UpdateShiftRequest,
) {
  return apiFetch<ShiftApiResponse>(`/api/hrm/shifts/${id}`, {
    method: "PATCH",
    token,
    body,
  });
}

/* ---------- ปฏิทินรอบกะ (ฝ่ายบุคคล) ---------- */

export function getShiftCalendar(token: string, params: ShiftCalendarParams) {
  const search = new URLSearchParams({
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
  });
  return apiFetch<ShiftCalendarApiResponse>(
    `/api/hrm/shift-schedules/calendar?${search.toString()}`,
    { method: "GET", token },
  );
}

export function getShiftAssignments(
  token: string,
  params: ShiftAssignmentParams,
) {
  const search = new URLSearchParams({
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
  });
  if (params.shiftId) search.set("shiftId", params.shiftId);
  if (params.userId) search.set("userId", params.userId);
  if (params.departmentId) search.set("departmentId", params.departmentId);
  if (params.q?.trim()) search.set("q", params.q.trim());

  return apiFetch<ShiftAssignmentListApiResponse>(
    `/api/hrm/shift-schedules/assignments?${search.toString()}`,
    { method: "GET", token },
  );
}

/** ตารางกริด คน × วัน — ใช้ query เดียวกับ assignments */
export function getShiftRoster(token: string, params: ShiftAssignmentParams) {
  const search = new URLSearchParams({
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
  });
  if (params.shiftId) search.set("shiftId", params.shiftId);
  if (params.userId) search.set("userId", params.userId);
  if (params.departmentId) search.set("departmentId", params.departmentId);
  if (params.q?.trim()) search.set("q", params.q.trim());

  return apiFetch<ShiftRosterApiResponse>(
    `/api/hrm/shift-schedules/roster?${search.toString()}`,
    { method: "GET", token },
  );
}

export function getShiftSchedule(token: string, id: string) {
  return apiFetch<ShiftScheduleApiResponse>(`/api/hrm/shift-schedules/${id}`, {
    method: "GET",
    token,
  });
}

export function createShiftSchedule(
  token: string,
  body: CreateShiftScheduleRequest,
) {
  return apiFetch<ShiftScheduleApiResponse>("/api/hrm/shift-schedules", {
    method: "POST",
    token,
    body,
  });
}

export function updateShiftSchedule(
  token: string,
  id: string,
  body: UpdateShiftScheduleRequest,
) {
  return apiFetch<ShiftScheduleApiResponse>(
    `/api/hrm/shift-schedules/${id}`,
    { method: "PATCH", token, body },
  );
}

export function deleteShiftSchedule(token: string, id: string) {
  return apiFetch<Envelope>(`/api/hrm/shift-schedules/${id}`, {
    method: "DELETE",
    token,
  });
}

export function setShiftScheduleMembers(
  token: string,
  id: string,
  userIds: string[],
) {
  return apiFetch<ShiftScheduleApiResponse>(
    `/api/hrm/shift-schedules/${id}/members`,
    { method: "PUT", token, body: { userIds } },
  );
}

export function removeShiftScheduleMember(
  token: string,
  id: string,
  userId: string,
) {
  return apiFetch<ShiftScheduleApiResponse>(
    `/api/hrm/shift-schedules/${id}/members/${userId}`,
    { method: "DELETE", token },
  );
}

export function bulkCreateShiftSchedules(
  token: string,
  body: BulkCreateShiftSchedulesRequest,
) {
  return apiFetch<BulkShiftScheduleApiResponse>(
    "/api/hrm/shift-schedules/bulk",
    { method: "POST", token, body },
  );
}

/* ---------- จัดตารางกะอัตโนมัติ (รายเดือน / ช่วงวันที่ / รอบ 45 วัน) ---------- */

/** รอบวางกะ: ปัจจุบัน / ก่อนหน้า / ถัดไป */
export function getShiftPlanCycle(token: string) {
  return apiFetch<ShiftPlanCycleApiResponse>(
    "/api/hrm/shift-schedules/cycle",
    { method: "GET", token },
  );
}

export function updateShiftPlanCycle(
  token: string,
  body: UpdateShiftPlanCycleRequest,
) {
  return apiFetch<ShiftPlanCycleApiResponse>(
    "/api/hrm/shift-schedules/cycle",
    { method: "PUT", token, body },
  );
}

/** บทบาททั้งหมด + จำนวนคน — ใช้เป็นตัวกรองก่อนจัดตาราง */
export function getShiftAutoPlanRoles(token: string) {
  return apiFetch<ShiftAutoPlanRoleOptionsApiResponse>(
    "/api/hrm/shift-schedules/auto-plan/roles",
    { method: "GET", token },
  );
}

/**
 * ตำแหน่งที่มีพนักงานอยู่จริง + จำนวนคน (users.position เป็น free-text)
 *
 * ส่ง roleIds ไปด้วยเมื่อกรองบทบาท ไม่งั้นจำนวนคนที่โชว์จะไม่ตรงกับที่จัดได้จริง
 */
export function getShiftAutoPlanPositions(
  token: string,
  params: ShiftAutoPlanPositionsParams = {},
) {
  const search = new URLSearchParams();
  if (params.roleIds?.length) {
    search.set("roleIds", params.roleIds.join(","));
  }
  if (params.includeEmployeesWithoutRole) {
    search.set("includeEmployeesWithoutRole", "true");
  }
  const query = search.toString();

  return apiFetch<ShiftAutoPlanPositionOptionsApiResponse>(
    `/api/hrm/shift-schedules/auto-plan/positions${query ? `?${query}` : ""}`,
    { method: "GET", token },
  );
}

/** คำนวณตารางให้ดูก่อน ไม่เขียนอะไรลงระบบ */
export function previewShiftAutoPlan(
  token: string,
  body: ShiftAutoPlanRequest,
) {
  return apiFetch<ShiftAutoPlanApiResponse>(
    "/api/hrm/shift-schedules/auto-plan/preview",
    { method: "POST", token, body },
  );
}

export function applyShiftAutoPlan(
  token: string,
  body: ShiftAutoPlanApplyRequest,
) {
  return apiFetch<ShiftAutoPlanApiResponse>(
    "/api/hrm/shift-schedules/auto-plan/apply",
    { method: "POST", token, body },
  );
}

/* ---------- วันหยุด / วันซ่อมเครื่อง ---------- */

export function markWorkCalendarHoliday(
  token: string,
  body: CreateWorkCalendarDayRequest,
) {
  return apiFetch<WorkCalendarDayApiResponse>(
    "/api/hrm/work-calendar/holidays",
    { method: "POST", token, body },
  );
}

export function removeWorkCalendarHoliday(token: string, id: string) {
  return apiFetch<Envelope>(`/api/hrm/work-calendar/holidays/${id}`, {
    method: "DELETE",
    token,
  });
}

/* ---------- กะของตัวเอง (หน้า /attendance) ---------- */

export function getMyShiftSchedule(token: string, days = 7) {
  return apiFetch<MyShiftScheduleApiResponse>(
    `/api/hrm/shifts/me/schedule?days=${days}`,
    { method: "GET", token },
  );
}
