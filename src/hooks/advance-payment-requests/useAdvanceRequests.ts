"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { ApiError } from "@/lib/api/client";
import * as api from "@/lib/api/advance-payment-requests";
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
  const queryClient = useQueryClient();
  const refresh = () => void queryClient.invalidateQueries({ queryKey: advanceRequestsKey });
  const fail = (e: unknown, fallback: string) =>
    message.error(e instanceof ApiError ? e.message : fallback);
  return { message, refresh, fail };
}

export function useCreateAdvanceRequestMutation() {
  const { message, refresh, fail } = useHelpers();
  return useMutation({
    mutationFn: (body: CreateAdvanceRequestBody) => api.createAdvanceRequest(getAccessToken(), body),
    onSuccess: (res) => {
      refresh();
      message.success(`บันทึกร่าง ${res.data.requestNo} แล้ว`);
    },
    onError: (e) => fail(e, "บันทึกร่างไม่สำเร็จ"),
  });
}

export function useUpdateAdvanceRequestMutation() {
  const { message, refresh, fail } = useHelpers();
  return useMutation({
    mutationFn: (v: { id: string; body: UpdateAdvanceRequestBody }) =>
      api.updateAdvanceRequest(getAccessToken(), v.id, v.body),
    onSuccess: () => {
      refresh();
      message.success("บันทึกร่างแล้ว");
    },
    onError: (e) => fail(e, "บันทึกร่างไม่สำเร็จ"),
  });
}

export function useUpdateAdvanceWhtMutation() {
  const { message, refresh, fail } = useHelpers();
  return useMutation({
    mutationFn: (v: { id: string; body: UpdateAdvanceWhtBody }) =>
      api.updateAdvanceRequestWht(getAccessToken(), v.id, v.body),
    onSuccess: (res) => {
      refresh();
      message.success(res.data.whtVerified ? "บันทึกการตรวจ WHT แล้ว" : "บันทึกข้อมูลภาษีแล้ว (ยังไม่ได้ติ๊กตรวจสอบ)");
    },
    onError: (e) => fail(e, "บันทึกข้อมูลภาษีไม่สำเร็จ"),
  });
}

export function useConfirmAdvanceRequestMutation() {
  const { message, refresh, fail } = useHelpers();
  return useMutation({
    mutationFn: (id: string) => api.confirmAdvanceRequest(getAccessToken(), id),
    onSuccess: () => {
      refresh();
      message.success("ยืนยันรายการแล้ว — รอสร้างใบสำคัญจ่าย");
    },
    onError: (e) => fail(e, "ยืนยันรายการไม่สำเร็จ"),
  });
}

export function useCancelAdvanceRequestMutation() {
  const { message, refresh, fail } = useHelpers();
  return useMutation({
    mutationFn: (v: { id: string; reason: string }) => api.cancelAdvanceRequest(getAccessToken(), v.id, v.reason),
    onSuccess: () => {
      refresh();
      message.success("ยกเลิกรายการแล้ว");
    },
    onError: (e) => fail(e, "ยกเลิกรายการไม่สำเร็จ"),
  });
}
