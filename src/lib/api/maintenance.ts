import { apiFetch } from "./client";
import type {
  BreakdownBody,
  CompleteWorkOrderBody,
  CreateWorkOrderBody,
  DowntimeApiResponse,
  DowntimeSummaryApiResponse,
  EquipmentApiResponse,
  EquipmentBody,
  EquipmentListApiResponse,
  EquipmentQuery,
  MaintenanceHistoryApiResponse,
  PmCheckApiResponse,
  PmScheduleApiResponse,
  PmScheduleBody,
  PmScheduleListApiResponse,
  ShutdownDetailApiResponse,
  ShutdownItemBody,
  ShutdownPlanListApiResponse,
  WorkOrderApiResponse,
  WorkOrderListApiResponse,
  WorkOrderQuery,
} from "@/types/maintenance";

const BASE = "/api/maintenance";

function qs(params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v?.trim()) search.set(k, v.trim());
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

// ── Equipment ──
export const getEquipmentList = (token: string, q: EquipmentQuery = {}) =>
  apiFetch<EquipmentListApiResponse>(`${BASE}/equipment${qs(q)}`, { method: "GET", token });

export const createEquipment = (token: string, body: EquipmentBody) =>
  apiFetch<EquipmentApiResponse>(`${BASE}/equipment`, { method: "POST", token, body });

export const updateEquipment = (token: string, id: string, body: EquipmentBody) =>
  apiFetch<EquipmentApiResponse>(`${BASE}/equipment/${id}`, { method: "PATCH", token, body });

export const getEquipmentHistory = (token: string, id: string) =>
  apiFetch<MaintenanceHistoryApiResponse>(`${BASE}/equipment/${id}/history`, { method: "GET", token });

export const getDowntimeSummary = (token: string, from?: string, to?: string) =>
  apiFetch<DowntimeSummaryApiResponse>(`${BASE}/equipment/downtime-summary${qs({ from, to })}`, {
    method: "GET",
    token,
  });

export const recordDowntime = (
  token: string,
  equipmentId: string,
  body: { startAt: string; reason: string; category?: string; rootCauseCategory?: string },
) => apiFetch<DowntimeApiResponse>(`${BASE}/equipment/${equipmentId}/downtime`, { method: "POST", token, body });

export const endDowntime = (
  token: string,
  equipmentId: string,
  downtimeId: string,
  body: { endAt?: string; repairStartedAt?: string; rootCauseCategory?: string; rootCause?: string },
) =>
  apiFetch<DowntimeApiResponse>(`${BASE}/equipment/${equipmentId}/downtime/${downtimeId}/end`, {
    method: "PATCH",
    token,
    body,
  });

// ── PM ──
export const getPmSchedules = (token: string) =>
  apiFetch<PmScheduleListApiResponse>(`${BASE}/pm-schedules`, { method: "GET", token });

export const createPmSchedule = (token: string, body: PmScheduleBody) =>
  apiFetch<PmScheduleApiResponse>(`${BASE}/pm-schedules`, { method: "POST", token, body });

export const updatePmSchedule = (token: string, id: string, body: PmScheduleBody) =>
  apiFetch<PmScheduleApiResponse>(`${BASE}/pm-schedules/${id}`, { method: "PATCH", token, body });

export const generatePmWorkOrder = (token: string, id: string) =>
  apiFetch<WorkOrderApiResponse>(`${BASE}/pm-schedules/${id}/generate-work-order`, { method: "POST", token });

export const runPmCheck = (token: string) =>
  apiFetch<PmCheckApiResponse>(`${BASE}/pm-schedules/run-check`, { method: "POST", token });

// ── Work orders ──
export const getWorkOrders = (token: string, q: WorkOrderQuery = {}) =>
  apiFetch<WorkOrderListApiResponse>(`${BASE}/work-orders${qs(q)}`, { method: "GET", token });

export const createWorkOrder = (token: string, body: CreateWorkOrderBody) =>
  apiFetch<WorkOrderApiResponse>(`${BASE}/work-orders`, { method: "POST", token, body });

export const reportBreakdown = (token: string, body: BreakdownBody) =>
  apiFetch<WorkOrderApiResponse>(`${BASE}/work-orders/breakdown`, { method: "POST", token, body });

export const assignWorkOrder = (token: string, id: string, body: { assignedToId: string; assistantIds?: string[] }) =>
  apiFetch<WorkOrderApiResponse>(`${BASE}/work-orders/${id}/assign`, { method: "PATCH", token, body });

export const startWorkOrder = (token: string, id: string) =>
  apiFetch<WorkOrderApiResponse>(`${BASE}/work-orders/${id}/start`, { method: "POST", token });

export const completeWorkOrder = (token: string, id: string, body: CompleteWorkOrderBody) =>
  apiFetch<WorkOrderApiResponse>(`${BASE}/work-orders/${id}/complete`, { method: "POST", token, body });

export const cancelWorkOrder = (token: string, id: string) =>
  apiFetch<WorkOrderApiResponse>(`${BASE}/work-orders/${id}/cancel`, { method: "POST", token });

export const returnWorkOrderPart = (
  token: string,
  id: string,
  usageId: string,
  body: { quantity: number; remark?: string },
) => apiFetch<WorkOrderApiResponse>(`${BASE}/work-orders/${id}/parts/${usageId}/return`, { method: "POST", token, body });

// ── Shutdown ──
export const getShutdownPlans = (token: string) =>
  apiFetch<ShutdownPlanListApiResponse>(`${BASE}/shutdown-plans`, { method: "GET", token });

export const getShutdownPlan = (token: string, id: string) =>
  apiFetch<ShutdownDetailApiResponse>(`${BASE}/shutdown-plans/${id}`, { method: "GET", token });

export const addShutdownWorkOrders = (token: string, id: string, items: ShutdownItemBody[]) =>
  apiFetch<ShutdownDetailApiResponse>(`${BASE}/shutdown-plans/${id}/work-orders`, {
    method: "POST",
    token,
    body: { items },
  });
