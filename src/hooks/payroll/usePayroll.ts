"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { ApiError } from "@/lib/api/client";
import {
  approvePayrollRun,
  bankMissingFromError,
  bulkRecordPayrollPayments,
  cancelPayrollRun,
  checkFailureFromError,
  createPayrollRun,
  exportPayrollPayments,
  finalizePayrollRun,
  getPayrollChecks,
  getPayrollRun,
  getPayrollRuns,
  getPayrollSettings,
  getSalaryCertificateEmployees,
  getWithholdingCertificates,
  overlapFromError,
  payBaseIssuesFromError,
  recalculatePayrollRun,
  recordPayrollPayments,
  returnPayrollRunToDraft,
  sendBackPayrollRun,
  setPayrollAdjustments,
  setPayrollExclusions,
  submitPayrollRun,
  updatePayrollSettings,
} from "@/lib/api/payroll";
import { getAccessToken } from "@/lib/auth/token";
import { tNow } from "@/lib/i18n/useT";
import type {
  BulkPayrollPaymentsRequest,
  CreatePayrollRunRequest,
  PayrollAdjustmentInput,
  PayrollExclusionInput,
  PayrollPaymentInput,
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
      // error ที่ผู้เรียกแสดง modal รายละเอียดเอง (ไม่มีฐานค่าจ้าง/งวดซ้ำ/ตรวจก่อนส่งไม่ผ่าน/ไม่มีข้อมูลธนาคาร) — ไม่ต้องเด้งซ้ำ
      if (
        payBaseIssuesFromError(error) ||
        overlapFromError(error) ||
        checkFailureFromError(error) ||
        bankMissingFromError(error)
      ) {
        return;
      }
      message.error(error instanceof ApiError ? error.message : tNow(fallbackError));
    },
  });
}

/** ตั้ง "ไม่คำนวณค่าจ้างงวดนี้" แล้วคำนวณงวดเดิมใหม่ (modal แจ้งฐานค่าจ้างในงวดที่สร้างแล้ว) */
export function useExcludeAndRecalculateMutation() {
  return useRunMutation(
    async (v: { id: string; items: PayrollExclusionInput[] }) => {
      await setPayrollExclusions(getAccessToken(), v.id, v.items);
      return recalculatePayrollRun(getAccessToken(), v.id);
    },
    "คำนวณงวดใหม่ไม่สำเร็จ",
  );
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
    (v: { id: string; reason: string }) =>
      cancelPayrollRun(getAccessToken(), v.id, v.reason),
    "ยกเลิกงวดไม่สำเร็จ",
  );
}

/** ผลตรวจก่อนส่งอนุมัติ — ดึงใหม่ทุกครั้งที่เปิด (ไม่ใช้ cache) */
export function usePayrollChecksQuery(id: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: [...payrollQueryKey, "checks", id],
    queryFn: () => getPayrollChecks(getAccessToken(), id as string),
    enabled: Boolean(id) && enabled,
    gcTime: 0,
    staleTime: 0,
    retry: false,
  });
}

export function useSubmitPayrollMutation() {
  return useRunMutation(
    (v: { id: string; acknowledgeWarnings?: boolean; note?: string }) =>
      submitPayrollRun(getAccessToken(), v.id, { acknowledgeWarnings: v.acknowledgeWarnings, note: v.note }),
    "ส่งอนุมัติไม่สำเร็จ",
  );
}

export function useApprovePayrollMutation() {
  return useRunMutation((id: string) => approvePayrollRun(getAccessToken(), id), "อนุมัติงวดไม่สำเร็จ");
}

export function useSendBackPayrollMutation() {
  return useRunMutation(
    (v: { id: string; reason: string }) => sendBackPayrollRun(getAccessToken(), v.id, v.reason),
    "ส่งกลับแก้ไขไม่สำเร็จ",
  );
}

export function useReturnPayrollToDraftMutation() {
  return useRunMutation(
    (v: { id: string; reason: string }) => returnPayrollRunToDraft(getAccessToken(), v.id, v.reason),
    "ส่งกลับเป็นร่างไม่สำเร็จ",
  );
}

export function useExportPayrollPaymentsMutation() {
  return useRunMutation((id: string) => exportPayrollPayments(getAccessToken(), id), "ส่งออกรายการจ่ายไม่สำเร็จ");
}

export function useRecordPayrollPaymentsMutation() {
  return useRunMutation(
    (v: { id: string; items: PayrollPaymentInput[] }) => recordPayrollPayments(getAccessToken(), v.id, v.items),
    "บันทึกผลจ่ายไม่สำเร็จ",
  );
}

export function useBulkRecordPayrollPaymentsMutation() {
  return useRunMutation(
    (v: { id: string; body: BulkPayrollPaymentsRequest }) =>
      bulkRecordPayrollPayments(getAccessToken(), v.id, v.body),
    "บันทึกผลจ่ายไม่สำเร็จ",
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
      message.error(error instanceof ApiError ? error.message : tNow("บันทึกตั้งค่าไม่สำเร็จ"));
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
