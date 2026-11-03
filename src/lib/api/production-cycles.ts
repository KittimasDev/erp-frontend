import { apiFetch } from "./client";
import type {
  ConfirmShiftRecordBody,
  CreateMachineDeviceBody,
  CreateMachineTagBody,
  CreateShiftRecordBody,
  MachineDevice,
  MachineForecast,
  MachineDeviceWithKey,
  MachineReading,
  MachineTag,
  ProductionCycle,
  ProductionCycleSummary,
  ProductionOrderLookups,
  ShiftRecord,
  UpdateMachineDeviceBody,
  UpdateMachineTagBody,
  UpdateProductionCycleBody,
  UpdateShiftRecordBody,
} from "@/types/production-cycle";

type Res<T> = { message: string; data: T };

const CYCLES = "/api/production/cycles";
const RECORDS = "/api/production/shift-records";

export function getMachineSummary(token: string, productionOrderId: string) {
  return apiFetch<{ message: string; data: MachineForecast[] }>(
    `${RECORDS}/machine-summary?productionOrderId=${encodeURIComponent(productionOrderId)}`,
    { token },
  );
}
const DEVICES = "/api/production/machine-devices";

// ── รอบผลิต
export const getProductionCycles = (token: string, status?: string) =>
  apiFetch<Res<ProductionCycle[]>>(`${CYCLES}${status ? `?status=${status}` : ""}`, { token });
export const getProductionCycle = (token: string, id: string) =>
  apiFetch<Res<ProductionCycle>>(`${CYCLES}/${id}`, { token });
export const getProductionCycleSummary = (token: string, id: string) =>
  apiFetch<Res<ProductionCycleSummary>>(`${CYCLES}/${id}/summary`, { token });
export const updateProductionCycle = (token: string, id: string, body: UpdateProductionCycleBody) =>
  apiFetch<Res<ProductionCycle>>(`${CYCLES}/${id}`, { method: "PATCH", token, body });
export const closeProductionCycle = (token: string, id: string, remark?: string) =>
  apiFetch<Res<ProductionCycle>>(`${CYCLES}/${id}/close`, { method: "POST", token, body: { remark } });
export const cancelProductionCycle = (token: string, id: string, reason: string) =>
  apiFetch<Res<ProductionCycle>>(`${CYCLES}/${id}/cancel`, { method: "POST", token, body: { reason } });

// ── บันทึกรายกะ + lookups (พนักงาน/กะ)
export const getProductionOrderLookups = (token: string) =>
  apiFetch<Res<ProductionOrderLookups>>("/api/production/production-orders/lookups", { token });
export const getShiftRecords = (
  token: string,
  params: { productionOrderId?: string; cycleId?: string },
) => {
  const search = new URLSearchParams();
  if (params.productionOrderId) search.set("productionOrderId", params.productionOrderId);
  if (params.cycleId) search.set("cycleId", params.cycleId);
  const qs = search.toString();
  return apiFetch<Res<ShiftRecord[]>>(`${RECORDS}${qs ? `?${qs}` : ""}`, { token });
};
export const createShiftRecord = (token: string, body: CreateShiftRecordBody) =>
  apiFetch<Res<ShiftRecord>>(RECORDS, { method: "POST", token, body });
export const updateShiftRecord = (token: string, id: string, body: UpdateShiftRecordBody) =>
  apiFetch<Res<ShiftRecord>>(`${RECORDS}/${id}`, { method: "PATCH", token, body });
export const deleteShiftRecord = (token: string, id: string) =>
  apiFetch<{ message: string }>(`${RECORDS}/${id}`, { method: "DELETE", token });
export const confirmShiftRecord = (
  token: string,
  id: string,
  body: ConfirmShiftRecordBody,
) =>
  apiFetch<Res<ShiftRecord>>(`${RECORDS}/${id}/confirm`, {
    method: "POST",
    token,
    body,
  });
export const unconfirmShiftRecord = (token: string, id: string) =>
  apiFetch<Res<ShiftRecord>>(`${RECORDS}/${id}/unconfirm`, {
    method: "POST",
    token,
  });

// ── Machine Integration
export const getMachineDevices = (token: string) => apiFetch<Res<MachineDevice[]>>(DEVICES, { token });
export const createMachineDevice = (token: string, body: CreateMachineDeviceBody) =>
  apiFetch<Res<MachineDeviceWithKey>>(DEVICES, { method: "POST", token, body });
export const updateMachineDevice = (token: string, id: string, body: UpdateMachineDeviceBody) =>
  apiFetch<Res<MachineDevice>>(`${DEVICES}/${id}`, { method: "PATCH", token, body });
export const rotateMachineDeviceKey = (token: string, id: string) =>
  apiFetch<Res<MachineDeviceWithKey>>(`${DEVICES}/${id}/rotate-key`, { method: "POST", token });
export const createMachineTag = (token: string, deviceId: string, body: CreateMachineTagBody) =>
  apiFetch<Res<MachineTag>>(`${DEVICES}/${deviceId}/tags`, { method: "POST", token, body });
export const updateMachineTag = (token: string, tagId: string, body: UpdateMachineTagBody) =>
  apiFetch<Res<MachineTag>>(`${DEVICES}/tags/${tagId}`, { method: "PATCH", token, body });
export const getMachineTagReadings = (token: string, tagId: string, limit = 100) =>
  apiFetch<Res<MachineReading[]>>(`${DEVICES}/tags/${tagId}/readings?limit=${limit}`, { token });
