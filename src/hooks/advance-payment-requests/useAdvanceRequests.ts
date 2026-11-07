"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { ApiError } from "@/lib/api/client";
import * as api from "@/lib/api/advance-payment-requests";
import { useT } from "@/lib/i18n/useT";
import { getAccessToken } from "@/lib/auth/token";
import type {
  AdvanceRequestQuery,
  CreateAdvanceRequestBody,
  UpdateAdvanceRequestBody,
  UpdateAdvanceWhtBody,
} from "@/types/advance-payment-requests";

export const advanceRequestsKey = ["advance-payment-requests"] as const;

export const useAdvanceRequestsQuery = (params?: AdvanceRequestQuery) =>
  useQuery({
    queryKey: [...advanceRequestsKey, "list", params ?? {}],
    queryFn: () => api.getAdvanceRequests(getAccessToken(), params),
  });

export const useAdvanceRequestQuery = (id?: string) =>
  useQuery({
    queryKey: [...advanceRequestsKey, "detail", id],
    queryFn: () => api.getAdvanceRequest(getAccessToken(), id as string),
    enabled: Boolean(id),
  });

export const useEligiblePayablesQuery = (search: string, enabled = true) =>
  useQuery({
    queryKey: [...advanceRequestsKey, "eligible", search],
    queryFn: () => api.getEligiblePayables(getAccessToken(), search),
    enabled,
  });

function useHelpers() {
  const { message } = App.useApp();
  const t = useT();
  const queryClient = useQueryClient();
  const refresh = () => void queryClient.invalidateQueries({ queryKey: advanceRequestsKey });
  const fail = (e: unknown, fallback: string) =>
    message.error(e instanceof ApiError ? e.message : fallback);
  return { message, refresh, fail, t };
}

export function useCreateAdvanceRequestMutation() {
  const { message, refresh, fail, t } = useHelpers();
  return useMutation({
    mutationFn: (body: CreateAdvanceRequestBody) => api.createAdvanceRequest(getAccessToken(), body),
    onSuccess: (res) => {
      refresh();
      message.success(t("บันทึกร่าง {no} แล้ว", { no: res.data.requestNo }));
    },
    onError: (e) => fail(e, t("บันทึกร่างไม่สำเร็จ")),
  });
}

export function useUpdateAdvanceRequestMutation() {
  const { message, refresh, fail, t } = useHelpers();
  return useMutation({
    mutationFn: (v: { id: string; body: UpdateAdvanceRequestBody }) =>
      api.updateAdvanceRequest(getAccessToken(), v.id, v.body),
    onSuccess: () => {
      refresh();
      message.success(t("บันทึกร่างแล้ว"));
    },
    onError: (e) => fail(e, t("บันทึกร่างไม่สำเร็จ")),
  });
}

export function useUpdateAdvanceWhtMutation() {
  const { message, refresh, fail, t } = useHelpers();
  return useMutation({
    mutationFn: (v: { id: string; body: UpdateAdvanceWhtBody }) =>
      api.updateAdvanceRequestWht(getAccessToken(), v.id, v.body),
    onSuccess: (res) => {
      refresh();
      message.success(res.data.whtVerified ? t("บันทึกการตรวจ WHT แล้ว") : t("บันทึกข้อมูลภาษีแล้ว (ยังไม่ได้ติ๊กตรวจสอบ)"));
    },
    onError: (e) => fail(e, t("บันทึกข้อมูลภาษีไม่สำเร็จ")),
  });
}

export function useConfirmAdvanceRequestMutation() {
  const { message, refresh, fail, t } = useHelpers();
  return useMutation({
    mutationFn: (id: string) => api.confirmAdvanceRequest(getAccessToken(), id),
    onSuccess: () => {
      refresh();
      message.success(t("ยืนยันรายการแล้ว — รอสร้างใบสำคัญจ่าย"));
    },
    onError: (e) => fail(e, t("ยืนยันรายการไม่สำเร็จ")),
  });
}

export function useCancelAdvanceRequestMutation() {
  const { message, refresh, fail, t } = useHelpers();
  return useMutation({
    mutationFn: (v: { id: string; reason: string }) => api.cancelAdvanceRequest(getAccessToken(), v.id, v.reason),
    onSuccess: () => {
      refresh();
      message.success(t("ยกเลิกรายการแล้ว"));
    },
    onError: (e) => fail(e, t("ยกเลิกรายการไม่สำเร็จ")),
  });
}
