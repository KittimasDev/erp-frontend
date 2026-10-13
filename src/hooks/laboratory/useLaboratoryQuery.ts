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
  updateLabResult,
  getLabSample,
  getLabSampleCoa,
  getLabSampleQrCode,
  getLabSamples,
} from "@/lib/api/laboratory";
import {
  pendingCountQueryOptions,
  selectDataLength,
} from "@/lib/query/count-query";
import { getAccessToken } from "@/lib/auth/token";
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
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateLabSampleBody) =>
      createLabSample(getAccessToken(), body),
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: laboratoryQueryKey });
      message.success(`ลงทะเบียนตัวอย่าง ${res.data.sampleNo} แล้ว`);
      if (res.data.warning) message.warning(res.data.warning);
    },
    onError: (e) =>
      message.error(
        e instanceof ApiError ? e.message : "ลงทะเบียนตัวอย่างไม่สำเร็จ",
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
  const { message, refresh, fail } = useLabMutationHelpers();
  return useMutation({
    mutationFn: (results: AddLabResultLine[]) =>
      addLabResults(getAccessToken(), sampleId, results),
    onSuccess: () => {
      refresh();
      message.success("บันทึกผลตรวจแล้ว");
    },
    onError: (e) => fail(e, "บันทึกผลตรวจไม่สำเร็จ"),
  });
}

export function useUpdateLabResultMutation(sampleId: string) {
  const { message, refresh, fail } = useLabMutationHelpers();
  return useMutation({
    mutationFn: (vars: { resultId: string; body: UpdateLabResultBody }) =>
      updateLabResult(getAccessToken(), sampleId, vars.resultId, vars.body),
    onSuccess: () => {
      refresh();
      message.success("แก้ผลตรวจแล้ว");
    },
    onError: (e) => fail(e, "แก้ผลตรวจไม่สำเร็จ"),
  });
}

export function useDeleteLabResultMutation(sampleId: string) {
  const { message, refresh, fail } = useLabMutationHelpers();
  return useMutation({
    mutationFn: (resultId: string) =>
      deleteLabResult(getAccessToken(), sampleId, resultId),
    onSuccess: () => {
      refresh();
      message.success("ลบผลตรวจแล้ว");
    },
    onError: (e) => fail(e, "ลบผลตรวจไม่สำเร็จ"),
  });
}

/** อนุมัติ/ตีกลับ — error ของรหัสผ่านผิดแสดงที่ฟอร์มผ่าน onError ของผู้เรียก */
export function useReviewLabSampleMutation(sampleId: string) {
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
          ? "อนุมัติผลตรวจและออก COA แล้ว"
          : "ตีกลับผลตรวจแล้ว",
      );
    },
  });
}

export function useReissueLabCoaMutation(sampleId: string) {
  const { message, refresh, fail } = useLabMutationHelpers();
  return useMutation({
    mutationFn: (reason: string) =>
      reissueLabCoa(getAccessToken(), sampleId, reason),
    onSuccess: (res) => {
      refresh();
      message.success(`ออก COA เลขที่ ${res.data.coaNo} แล้ว`);
    },
    onError: (e) => fail(e, "ออก COA ใหม่ไม่สำเร็จ"),
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
