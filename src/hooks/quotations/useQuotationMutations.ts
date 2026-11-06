"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";
import { useT } from "@/lib/i18n/useT";

import {
  acceptQuotation,
  cancelQuotation,
  createQuotation,
  rejectQuotation,
  sendQuotation,
  updateQuotation,
} from "@/lib/api/quotations";
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
