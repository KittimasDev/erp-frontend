"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { canAccessBadgeScreen } from "@/hooks/badges/badge-access";
import { ApiError } from "@/lib/api/client";
import {
  addLabResults,
  createLabSample,
  deleteLabResult,
  getLabCoaHistory,
  reissueLabCoa,
  reviewLabSample,
  setLabSampleSpec,
  updateLabResult,
  getLabSample,
  importLabSamples,
  previewLabSampleImport,
  getLabSampleCoa,
  getLabSampleQrCode,
  getLabSamples,
} from "@/lib/api/laboratory";
import {
  pendingCountQueryOptions,
  selectDataLength,
} from "@/lib/query/count-query";
import { getAccessToken } from "@/lib/auth/token";
import { useT } from "@/lib/i18n/useT";
import type {
  AddLabResultLine,
  CreateLabSampleBody,
  LabCoaQueryParams,
  LabSampleQueryParams,
  ReviewLabSampleBody,
  UpdateLabResultBody,
} from "@/types/laboratory";

export const laboratoryQueryKey = ["laboratory-samples"] as const;

export function useLabSamplesQuery(params?: LabSampleQueryParams) {
  return useQuery({
    queryKey: [...laboratoryQueryKey, "list", params ?? {}],
    queryFn: () => getLabSamples(getAccessToken(), params),
  });
}

export function useCreateLabSampleMutation() {
  const t = useT();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateLabSampleBody) =>
      createLabSample(getAccessToken(), body),
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: laboratoryQueryKey });
      message.success(t("ลงทะเบียนตัวอย่าง {no} แล้ว", { no: res.data.sampleNo }));
      if (res.data.warning) message.warning(res.data.warning);
    },
    onError: (e) =>
      message.error(
        e instanceof ApiError ? e.message : t("ลงทะเบียนตัวอย่างไม่สำเร็จ"),
      ),
  });
}

function useLabMutationHelpers() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: laboratoryQueryKey });
    // ผล Lab อนุมัติ/ตีกลับเปลี่ยนสถานะ QC ของ Lot
    void queryClient.invalidateQueries({ queryKey: ["inventory"] });
  };
  const fail = (e: unknown, fallback: string) =>
    message.error(e instanceof ApiError ? e.message : fallback);
  return { message, refresh, fail };
}

export function useAddLabResultsMutation(sampleId: string) {
  const t = useT();
  const { message, refresh, fail } = useLabMutationHelpers();
  return useMutation({
    mutationFn: (results: AddLabResultLine[]) =>
      addLabResults(getAccessToken(), sampleId, results),
    onSuccess: () => {
      refresh();
      message.success(t("บันทึกผลตรวจแล้ว"));
    },
    onError: (e) => fail(e, t("บันทึกผลตรวจไม่สำเร็จ")),
  });
}

/**
 * บันทึกผลตรวจตาม Spec ครั้งเดียว: แถวใหม่ส่งเป็นชุดเดียว (1 transaction ที่ backend)
 * แถวที่แก้ค่าเดิมส่ง PATCH ต่อท้าย · สำเร็จ/ล้มเหลวรีเฟรชข้อมูลเสมอ
 */
export function useSaveLabResultsMutation(sampleId: string) {
  const t = useT();
  const { message, refresh, fail } = useLabMutationHelpers();
  return useMutation({
    mutationFn: async (vars: {
      adds: AddLabResultLine[];
      updates: Array<{ resultId: string; body: UpdateLabResultBody }>;
    }) => {
      const token = getAccessToken();
      if (vars.adds.length > 0) {
        await addLabResults(token, sampleId, vars.adds);
      }
      for (const u of vars.updates) {
        await updateLabResult(token, sampleId, u.resultId, u.body);
      }
    },
    onSuccess: () => {
      refresh();
      message.success(t("บันทึกผลตรวจแล้ว"));
    },
    onError: (e) => {
      refresh();
      fail(e, t("บันทึกผลตรวจไม่สำเร็จ"));
    },
  });
}

export function usePreviewLabSampleImportMutation() {
  return useMutation({
    mutationFn: (file: File) => previewLabSampleImport(getAccessToken(), file),
  });
}

export function useImportLabSamplesMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => importLabSamples(getAccessToken(), file),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: laboratoryQueryKey });
    },
  });
}

export function useSetLabSampleSpecMutation(sampleId: string) {
  const t = useT();
  const { message, refresh, fail } = useLabMutationHelpers();
  return useMutation({
    mutationFn: (specId: string) =>
      setLabSampleSpec(getAccessToken(), sampleId, specId),
    onSuccess: () => {
      refresh();
      message.success(t("เลือก Spec ให้ตัวอย่างแล้ว"));
    },
    onError: (e) => fail(e, t("เลือก Spec ไม่สำเร็จ")),
  });
}

export function useUpdateLabResultMutation(sampleId: string) {
  const t = useT();
  const { message, refresh, fail } = useLabMutationHelpers();
  return useMutation({
    mutationFn: (vars: { resultId: string; body: UpdateLabResultBody }) =>
      updateLabResult(getAccessToken(), sampleId, vars.resultId, vars.body),
    onSuccess: () => {
      refresh();
      message.success(t("แก้ผลตรวจแล้ว"));
    },
    onError: (e) => fail(e, t("แก้ผลตรวจไม่สำเร็จ")),
  });
}

export function useDeleteLabResultMutation(sampleId: string) {
  const t = useT();
  const { message, refresh, fail } = useLabMutationHelpers();
  return useMutation({
    mutationFn: (resultId: string) =>
      deleteLabResult(getAccessToken(), sampleId, resultId),
    onSuccess: () => {
      refresh();
      message.success(t("ลบผลตรวจแล้ว"));
    },
    onError: (e) => fail(e, t("ลบผลตรวจไม่สำเร็จ")),
  });
}

/** อนุมัติ/ตีกลับ — error ของรหัสผ่านผิดแสดงที่ฟอร์มผ่าน onError ของผู้เรียก */
export function useReviewLabSampleMutation(sampleId: string) {
  const t = useT();
  const { message, refresh } = useLabMutationHelpers();
  return useMutation({
    mutationFn: (vars: {
      action: "approve" | "reject";
      body: ReviewLabSampleBody;
    }) => reviewLabSample(getAccessToken(), sampleId, vars.action, vars.body),
    onSuccess: (_res, vars) => {
      refresh();
      message.success(
        vars.action === "approve"
          ? t("อนุมัติผลตรวจและออก COA แล้ว")
          : t("ตีกลับผลตรวจแล้ว"),
      );
    },
  });
}

export function useReissueLabCoaMutation(sampleId: string) {
  const t = useT();
  const { message, refresh, fail } = useLabMutationHelpers();
  return useMutation({
    mutationFn: (reason: string) =>
      reissueLabCoa(getAccessToken(), sampleId, reason),
    onSuccess: (res) => {
      refresh();
      message.success(t("ออก COA เลขที่ {no} แล้ว", { no: res.data.coaNo }));
    },
    onError: (e) => fail(e, t("ออก COA ใหม่ไม่สำเร็จ")),
  });
}

export function useLabCoaHistoryQuery(params?: LabCoaQueryParams) {
  return useQuery({
    queryKey: [...laboratoryQueryKey, "coa-history", params ?? {}],
    queryFn: () => getLabCoaHistory(getAccessToken(), params),
  });
}

export function useLabSampleQuery(id?: string) {
  return useQuery({
    queryKey: [...laboratoryQueryKey, "detail", id],
    queryFn: () => getLabSample(getAccessToken(), id as string),
    enabled: Boolean(id),
  });
}

export function useLabSampleCoaQuery(id?: string, enabled = false) {
  return useQuery({
    queryKey: [...laboratoryQueryKey, "coa", id],
    queryFn: () => getLabSampleCoa(getAccessToken(), id as string),
    enabled: Boolean(id) && enabled,
  });
}

export function useLabSampleQrCodeQuery(id?: string, enabled = false) {
  return useQuery({
    queryKey: [...laboratoryQueryKey, "qrcode", id],
    queryFn: () => getLabSampleQrCode(getAccessToken(), id as string),
    enabled: Boolean(id) && enabled,
  });
}

/**
 * คิวผลตรวจ LAB ที่รออนุมัติ สำหรับ badge (เมนู / หน้าแรก)
 *
 * `TESTING` = บันทึกผลตรวจแล้ว รอหัวหน้าแล็บอนุมัติก่อนออก COA
 *
 * endpoint นี้ยังไม่มี pagination จึงต้องดึงทั้งชุดมานับ (`selectDataLength`)
 * ปริมาณตัวอย่างต่อช่วงยังน้อยจึงรับได้ — ถ้าโตขึ้นให้เพิ่ม page/limit + total
 * ฝั่ง backend แล้วเปลี่ยนมาใช้ `selectListTotal` เหมือนโมดูลอื่น
 */
export const pendingLabReviewsCountQueryKey = [
  ...laboratoryQueryKey,
  "pending-review",
  "count",
] as const;

export function pendingLabReviewsCountOptions(ctx?: { enabled?: boolean }) {
  return pendingCountQueryOptions({
    queryKey: pendingLabReviewsCountQueryKey,
    queryFn: () => getLabSamples(getAccessToken(), { status: "TESTING" }),
    select: selectDataLength,
    canAccess: () => canAccessBadgeScreen("LAB_SAMPLES"),
    enabled: ctx?.enabled,
  });
}
