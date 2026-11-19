"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";
import { useT } from "@/lib/i18n/useT";

import {
  acceptQuotation,
  approveQuotation,
  cancelQuotation,
  createQuotation,
  rejectQuotation,
  rejectQuotationApproval,
  returnQuotationToDraft,
  sendQuotation,
  submitQuotationForApproval,
  updateQuotation,
} from "@/lib/api/quotations";
import { isESignCancelled } from "@/lib/esign/esign-gate";
import { getAccessToken } from "@/lib/auth/token";
import type {
  CreateQuotationBody,
  UpdateQuotationBody,
} from "@/types/quotations";
import { quotationsQueryKey } from "./useQuotationsQuery";

function useInvalidateQuotations() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({
      queryKey: quotationsQueryKey,
      refetchType: "all",
    });
}

export function useCreateQuotationMutation() {
  const { message } = App.useApp();
  const t = useT();
  const invalidate = useInvalidateQuotations();
  return useMutation({
    mutationKey: [...quotationsQueryKey, "create"],
    mutationFn: (body: CreateQuotationBody) =>
      createQuotation(getAccessToken(), body),
    onSuccess: async () => {
      await invalidate();
      message.success(t("สร้างใบเสนอราคาสำเร็จ"));
    },
    onError: (error: Error) => {
      message.error(error.message || t("สร้างใบเสนอราคาไม่สำเร็จ"));
    },
  });
}

export function useUpdateQuotationMutation() {
  const { message } = App.useApp();
  const t = useT();
  const invalidate = useInvalidateQuotations();
  return useMutation({
    mutationKey: [...quotationsQueryKey, "update"],
    mutationFn: ({ id, body }: { id: string; body: UpdateQuotationBody }) =>
      updateQuotation(getAccessToken(), id, body),
    onSuccess: async () => {
      await invalidate();
      message.success(t("บันทึกใบเสนอราคาสำเร็จ"));
    },
    onError: (error: Error) => {
      message.error(error.message || t("บันทึกใบเสนอราคาไม่สำเร็จ"));
    },
  });
}

/** ส่งอนุมัติ (DRAFT → รออนุมัติ) */
export function useSubmitQuotationMutation() {
  const { message } = App.useApp();
  const t = useT();
  const queryClient = useQueryClient();
  const invalidate = useInvalidateQuotations();
  return useMutation({
    mutationKey: [...quotationsQueryKey, "submit"],
    mutationFn: (id: string) =>
      submitQuotationForApproval(getAccessToken(), id),
    onSuccess: async (res, id) => {
      queryClient.setQueryData([...quotationsQueryKey, "detail", id], res);
      await invalidate();
      message.success(res.message || t("ส่งอนุมัติใบเสนอราคาสำเร็จ"));
    },
    onError: (error: Error) => {
      message.error(error.message || t("ส่งอนุมัติไม่สำเร็จ"));
    },
  });
}

/** อนุมัติ / ไม่อนุมัติ / ส่งกลับ — ผู้ใช้ยกเลิกหน้ายืนยันตัวตน (E-Signature) ไม่ต้องแจ้ง error */
export function useQuotationApprovalDecisionMutation() {
  const { message } = App.useApp();
  const t = useT();
  const queryClient = useQueryClient();
  const invalidate = useInvalidateQuotations();
  return useMutation({
    mutationKey: [...quotationsQueryKey, "approval-decision"],
    mutationFn: ({
      id,
      action,
      reason,
    }: {
      id: string;
      action: "approve" | "reject" | "return";
      reason?: string;
    }) => {
      const token = getAccessToken();
      if (action === "approve") return approveQuotation(token, id);
      if (action === "reject") {
        return rejectQuotationApproval(token, id, { reason: reason ?? "" });
      }
      return returnQuotationToDraft(token, id, { reason: reason ?? "" });
    },
    onSuccess: async (res, vars) => {
      queryClient.setQueryData([...quotationsQueryKey, "detail", vars.id], res);
      await invalidate();
      message.success(res.message || t("บันทึกผลอนุมัติแล้ว"));
    },
    onError: (error: Error) => {
      if (isESignCancelled(error)) return;
      message.error(error.message || t("ดำเนินการอนุมัติไม่สำเร็จ"));
    },
  });
}

export function useSendQuotationMutation() {
  const { message } = App.useApp();
  const t = useT();
  const queryClient = useQueryClient();
  const invalidate = useInvalidateQuotations();
  return useMutation({
    mutationKey: [...quotationsQueryKey, "send"],
    mutationFn: (id: string) => sendQuotation(getAccessToken(), id),
    onSuccess: async (res, id) => {
      queryClient.setQueryData([...quotationsQueryKey, "detail", id], res);
      await invalidate();
      message.success(t("ส่งใบเสนอราคาสำเร็จ"));
    },
    onError: (error: Error) => {
      message.error(error.message || t("ส่งใบเสนอราคาไม่สำเร็จ"));
    },
  });
}

export function useAcceptQuotationMutation() {
  const { message } = App.useApp();
  const t = useT();
  const queryClient = useQueryClient();
  const invalidate = useInvalidateQuotations();
  return useMutation({
    mutationKey: [...quotationsQueryKey, "accept"],
    mutationFn: (id: string) => acceptQuotation(getAccessToken(), id),
    onSuccess: async (res, id) => {
      queryClient.setQueryData([...quotationsQueryKey, "detail", id], res);
      await invalidate();
      message.success(t("ยืนยันรับใบเสนอราคาสำเร็จ"));
    },
    onError: (error: Error) => {
      message.error(error.message || t("ยืนยันรับไม่สำเร็จ"));
    },
  });
}

export function useRejectQuotationMutation() {
  const { message } = App.useApp();
  const t = useT();
  const queryClient = useQueryClient();
  const invalidate = useInvalidateQuotations();
  return useMutation({
    mutationKey: [...quotationsQueryKey, "reject"],
    mutationFn: (id: string) => rejectQuotation(getAccessToken(), id),
    onSuccess: async (res, id) => {
      queryClient.setQueryData([...quotationsQueryKey, "detail", id], res);
      await invalidate();
      message.success(t("ปฏิเสธใบเสนอราคาสำเร็จ"));
    },
    onError: (error: Error) => {
      message.error(error.message || t("ปฏิเสธไม่สำเร็จ"));
    },
  });
}

export function useCancelQuotationMutation() {
  const { message } = App.useApp();
  const t = useT();
  const queryClient = useQueryClient();
  const invalidate = useInvalidateQuotations();
  return useMutation({
    mutationKey: [...quotationsQueryKey, "cancel"],
    mutationFn: (id: string) => cancelQuotation(getAccessToken(), id),
    onSuccess: async (res, id) => {
      queryClient.setQueryData([...quotationsQueryKey, "detail", id], res);
      await invalidate();
      message.success(t("ยกเลิกใบเสนอราคาสำเร็จ"));
    },
    onError: (error: Error) => {
      message.error(error.message || t("ยกเลิกไม่สำเร็จ"));
    },
  });
}
