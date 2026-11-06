"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { ApiError } from "@/lib/api/client";
import {
  cancelPayrollRun,
  createPayrollRun,
  finalizePayrollRun,
  getPayrollRun,
  getPayrollRuns,
  getPayrollSettings,
  getSalaryCertificateEmployees,
  getWithholdingCertificates,
  recalculatePayrollRun,
  setPayrollAdjustments,
  updatePayrollSettings,
} from "@/lib/api/payroll";
import { getAccessToken } from "@/lib/auth/token";
import type {
  CreatePayrollRunRequest,
  PayrollAdjustmentInput,
  PayrollSettings,
} from "@/types/payroll";

export const payrollQueryKey = ["payroll-runs"] as const;
const settingsKey = ["payroll-settings"] as const;

export function usePayrollRunsQuery() {
  return useQuery({
    queryKey: payrollQueryKey,
    queryFn: () => getPayrollRuns(getAccessToken()),
  });
}

export function usePayrollRunQuery(id?: string) {
  return useQuery({
    queryKey: [...payrollQueryKey, "detail", id],
    queryFn: () => getPayrollRun(getAccessToken(), id as string),
    enabled: Boolean(id),
  });
}

export function usePayrollSettingsQuery(enabled = true) {
  return useQuery({
    queryKey: settingsKey,
    queryFn: () => getPayrollSettings(getAccessToken()),
    enabled,
  });
}

function useRunMutation<TVars, TRes extends { message: string }>(
  fn: (vars: TVars) => Promise<TRes>,
  fallbackError: string,
) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (res) => {
      message.success(res.message);
      void queryClient.invalidateQueries({ queryKey: payrollQueryKey });
    },
    onError: (error: Error) => {
      message.error(error instanceof ApiError ? error.message : fallbackError);
    },
  });
}

export function useCreatePayrollRunMutation() {
  return useRunMutation(
    (body: CreatePayrollRunRequest) => createPayrollRun(getAccessToken(), body),
    "สร้างงวดเงินเดือนไม่สำเร็จ",
  );
}

export function useRecalculatePayrollMutation() {
  return useRunMutation(
    (id: string) => recalculatePayrollRun(getAccessToken(), id),
    "คำนวณงวดใหม่ไม่สำเร็จ",
  );
}

export function useSetPayrollAdjustmentsMutation() {
  return useRunMutation(
    (v: { id: string; userId: string; items: PayrollAdjustmentInput[] }) =>
      setPayrollAdjustments(getAccessToken(), v.id, v.userId, v.items),
    "บันทึกรายการปรับไม่สำเร็จ",
  );
}

export function useFinalizePayrollMutation() {
  return useRunMutation(
    (id: string) => finalizePayrollRun(getAccessToken(), id),
    "ปิดงวดไม่สำเร็จ",
  );
}

export function useCancelPayrollMutation() {
  return useRunMutation(
    (v: { id: string; reason?: string }) =>
      cancelPayrollRun(getAccessToken(), v.id, v.reason),
    "ยกเลิกงวดไม่สำเร็จ",
  );
}

export function useUpdatePayrollSettingsMutation() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: PayrollSettings) =>
      updatePayrollSettings(getAccessToken(), body),
    onSuccess: (res) => {
      message.success(res.message);
      void queryClient.invalidateQueries({ queryKey: settingsKey });
    },
    onError: (error: Error) => {
      message.error(error instanceof ApiError ? error.message : "บันทึกตั้งค่าไม่สำเร็จ");
    },
  });
}

export function useSalaryCertificateEmployeesQuery(enabled = true) {
  return useQuery({
    queryKey: [...payrollQueryKey, "salary-certificates"],
    queryFn: () => getSalaryCertificateEmployees(getAccessToken()),
    enabled,
  });
}

export function useWithholdingCertificatesQuery(year: number, enabled = true) {
  return useQuery({
    queryKey: [...payrollQueryKey, "withholding", year],
    queryFn: () => getWithholdingCertificates(getAccessToken(), year),
    enabled,
  });
}
