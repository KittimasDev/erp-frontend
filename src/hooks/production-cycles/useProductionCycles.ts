"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { ApiError } from "@/lib/api/client";
import * as api from "@/lib/api/production-cycles";
import { getAccessToken } from "@/lib/auth/token";
import type {
  ConfirmShiftRecordBody,
  CreateMachineDeviceBody,
  CreateMachineTagBody,
  CreateShiftRecordBody,
  UpdateMachineDeviceBody,
  UpdateMachineTagBody,
  UpdateProductionCycleBody,
  UpdateShiftRecordBody,
} from "@/types/production-cycle";

export const productionCyclesKey = ["production-cycles"] as const;
export const shiftRecordsKey = ["production-shift-records"] as const;
export const machineDevicesKey = ["machine-devices"] as const;

// ── queries
export const useProductionCyclesQuery = () =>
  useQuery({ queryKey: [...productionCyclesKey, "list"], queryFn: () => api.getProductionCycles(getAccessToken()) });

export const useProductionCycleSummaryQuery = (id?: string) =>
  useQuery({
    queryKey: [...productionCyclesKey, "summary", id],
    queryFn: () => api.getProductionCycleSummary(getAccessToken(), id as string),
    enabled: Boolean(id),
  });

export const useProductionOrderLookupsQuery = () =>
  useQuery({
    queryKey: ["production-orders", "lookups"],
    queryFn: () => api.getProductionOrderLookups(getAccessToken()),
    staleTime: 5 * 60 * 1000,
  });

export const useShiftRecordsQuery = (params: { productionOrderId?: string; cycleId?: string }, enabled = true) =>
  useQuery({
    queryKey: [...shiftRecordsKey, params],
    queryFn: () => api.getShiftRecords(getAccessToken(), params),
    enabled: enabled && Boolean(params.productionOrderId || params.cycleId),
  });

export const useMachineDevicesQuery = () =>
  useQuery({
    queryKey: [...machineDevicesKey, "list"],
    queryFn: () => api.getMachineDevices(getAccessToken()),
    // ค่าล่าสุดของแท็กเปลี่ยนเรื่อย ๆ — ดึงใหม่ทุก 30 วินาทีตอนเปิดหน้าอยู่
    refetchInterval: 30_000,
  });

export const useMachineTagReadingsQuery = (tagId?: string) =>
  useQuery({
    queryKey: [...machineDevicesKey, "readings", tagId],
    queryFn: () => api.getMachineTagReadings(getAccessToken(), tagId as string),
    enabled: Boolean(tagId),
  });

// ── mutations
function useHelpers(keys: ReadonlyArray<readonly string[]>) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const done = (text: string) => {
    for (const key of keys) void queryClient.invalidateQueries({ queryKey: key });
    message.success(text);
  };
  const fail = (e: unknown, fallback: string) =>
    message.error(e instanceof ApiError ? e.message : fallback);
  return { done, fail };
}

export function useUpdateProductionCycleMutation() {
  const { done, fail } = useHelpers([productionCyclesKey]);
  return useMutation({
    mutationFn: (v: { id: string; body: UpdateProductionCycleBody }) =>
      api.updateProductionCycle(getAccessToken(), v.id, v.body),
    onSuccess: () => done("แก้ไขรอบผลิตแล้ว"),
    onError: (e) => fail(e, "แก้ไขรอบผลิตไม่สำเร็จ"),
  });
}

export function useCloseProductionCycleMutation() {
  const { done, fail } = useHelpers([productionCyclesKey]);
  return useMutation({
    mutationFn: (v: { id: string; remark?: string }) => api.closeProductionCycle(getAccessToken(), v.id, v.remark),
    onSuccess: () => done("ปิดรอบผลิตแล้ว"),
    onError: (e) => fail(e, "ปิดรอบผลิตไม่สำเร็จ"),
  });
}

export function useCancelProductionCycleMutation() {
  const { done, fail } = useHelpers([productionCyclesKey]);
  return useMutation({
    mutationFn: (v: { id: string; reason: string }) => api.cancelProductionCycle(getAccessToken(), v.id, v.reason),
    onSuccess: () => done("ยกเลิกรอบผลิตแล้ว"),
    onError: (e) => fail(e, "ยกเลิกรอบผลิตไม่สำเร็จ"),
  });
}

export function useCreateShiftRecordMutation() {
  const { done, fail } = useHelpers([shiftRecordsKey, productionCyclesKey]);
  return useMutation({
    mutationFn: (body: CreateShiftRecordBody) => api.createShiftRecord(getAccessToken(), body),
    onSuccess: () => done("บันทึกการผลิตรายกะแล้ว"),
    onError: (e) => fail(e, "บันทึกการผลิตรายกะไม่สำเร็จ"),
  });
}

export function useUpdateShiftRecordMutation() {
  const { done, fail } = useHelpers([shiftRecordsKey, productionCyclesKey]);
  return useMutation({
    mutationFn: (v: { id: string; body: UpdateShiftRecordBody }) => api.updateShiftRecord(getAccessToken(), v.id, v.body),
    onSuccess: () => done("แก้บันทึกการผลิตรายกะแล้ว"),
    onError: (e) => fail(e, "แก้บันทึกไม่สำเร็จ"),
  });
}

export function useDeleteShiftRecordMutation() {
  const { done, fail } = useHelpers([shiftRecordsKey, productionCyclesKey]);
  return useMutation({
    mutationFn: (id: string) => api.deleteShiftRecord(getAccessToken(), id),
    onSuccess: () => done("ลบบันทึกการผลิตรายกะแล้ว"),
    onError: (e) => fail(e, "ลบบันทึกไม่สำเร็จ"),
  });
}

export function useConfirmShiftRecordMutation() {
  const { done, fail } = useHelpers([
    shiftRecordsKey,
    productionCyclesKey,
    ["production-orders"],
  ]);
  return useMutation({
    mutationFn: (v: { id: string; body: ConfirmShiftRecordBody }) =>
      api.confirmShiftRecord(getAccessToken(), v.id, v.body),
    onSuccess: () => done("ยืนยันบันทึกกะและตัดสต๊อกแล้ว"),
    onError: (e) => fail(e, "ยืนยันบันทึกกะไม่สำเร็จ"),
  });
}

export function useUnconfirmShiftRecordMutation() {
  const { done, fail } = useHelpers([shiftRecordsKey, productionCyclesKey]);
  return useMutation({
    mutationFn: (id: string) => api.unconfirmShiftRecord(getAccessToken(), id),
    onSuccess: () => done("ยกเลิกยืนยันและคืนสต๊อกแล้ว"),
    onError: (e) => fail(e, "ยกเลิกยืนยันไม่สำเร็จ"),
  });
}

export function useCreateMachineDeviceMutation() {
  const { done, fail } = useHelpers([machineDevicesKey]);
  return useMutation({
    mutationFn: (body: CreateMachineDeviceBody) => api.createMachineDevice(getAccessToken(), body),
    onSuccess: () => done("ลงทะเบียนอุปกรณ์แล้ว"),
    onError: (e) => fail(e, "ลงทะเบียนอุปกรณ์ไม่สำเร็จ"),
  });
}

export function useUpdateMachineDeviceMutation() {
  const { done, fail } = useHelpers([machineDevicesKey]);
  return useMutation({
    mutationFn: (v: { id: string; body: UpdateMachineDeviceBody }) => api.updateMachineDevice(getAccessToken(), v.id, v.body),
    onSuccess: () => done("บันทึกอุปกรณ์แล้ว"),
    onError: (e) => fail(e, "บันทึกอุปกรณ์ไม่สำเร็จ"),
  });
}

export function useRotateMachineKeyMutation() {
  const { fail } = useHelpers([machineDevicesKey]);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.rotateMachineDeviceKey(getAccessToken(), id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: machineDevicesKey }),
    onError: (e) => fail(e, "สร้าง API key ใหม่ไม่สำเร็จ"),
  });
}

export function useCreateMachineTagMutation() {
  const { done, fail } = useHelpers([machineDevicesKey]);
  return useMutation({
    mutationFn: (v: { deviceId: string; body: CreateMachineTagBody }) =>
      api.createMachineTag(getAccessToken(), v.deviceId, v.body),
    onSuccess: () => done("เพิ่มแท็กแล้ว"),
    onError: (e) => fail(e, "เพิ่มแท็กไม่สำเร็จ"),
  });
}

export function useUpdateMachineTagMutation() {
  const { done, fail } = useHelpers([machineDevicesKey]);
  return useMutation({
    mutationFn: (v: { tagId: string; body: UpdateMachineTagBody }) => api.updateMachineTag(getAccessToken(), v.tagId, v.body),
    onSuccess: () => done("บันทึกแท็กแล้ว"),
    onError: (e) => fail(e, "บันทึกแท็กไม่สำเร็จ"),
  });
}
