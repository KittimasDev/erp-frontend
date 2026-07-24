"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

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
    queryClient.invalidateQueries({ queryKey: quotationsQueryKey });
}

export function useCreateQuotationMutation() {
  const { message } = App.useApp();
  const invalidate = useInvalidateQuotations();
  return useMutation({
    mutationKey: [...quotationsQueryKey, "create"],
    mutationFn: (body: CreateQuotationBody) =>
      createQuotation(getAccessToken(), body),
    onSuccess: async () => {
      await invalidate();
      message.success("สร้างใบเสนอราคาสำเร็จ");
    },
    onError: (error: Error) => {
      message.error(error.message || "สร้างใบเสนอราคาไม่สำเร็จ");
    },
  });
}

export function useUpdateQuotationMutation() {
  const { message } = App.useApp();
  const invalidate = useInvalidateQuotations();
  return useMutation({
    mutationKey: [...quotationsQueryKey, "update"],
    mutationFn: ({ id, body }: { id: string; body: UpdateQuotationBody }) =>
      updateQuotation(getAccessToken(), id, body),
    onSuccess: async () => {
      await invalidate();
      message.success("บันทึกใบเสนอราคาสำเร็จ");
    },
    onError: (error: Error) => {
      message.error(error.message || "บันทึกใบเสนอราคาไม่สำเร็จ");
    },
  });
}

export function useSendQuotationMutation() {
  const { message } = App.useApp();
  const invalidate = useInvalidateQuotations();
  return useMutation({
    mutationKey: [...quotationsQueryKey, "send"],
    mutationFn: (id: string) => sendQuotation(getAccessToken(), id),
    onSuccess: async () => {
      await invalidate();
      message.success("ส่งใบเสนอราคาสำเร็จ");
    },
    onError: (error: Error) => {
      message.error(error.message || "ส่งใบเสนอราคาไม่สำเร็จ");
    },
  });
}

export function useAcceptQuotationMutation() {
  const { message } = App.useApp();
  const invalidate = useInvalidateQuotations();
  return useMutation({
    mutationKey: [...quotationsQueryKey, "accept"],
    mutationFn: (id: string) => acceptQuotation(getAccessToken(), id),
    onSuccess: async () => {
      await invalidate();
      message.success("ยืนยันรับใบเสนอราคาสำเร็จ");
    },
    onError: (error: Error) => {
      message.error(error.message || "ยืนยันรับไม่สำเร็จ");
    },
  });
}

export function useRejectQuotationMutation() {
  const { message } = App.useApp();
  const invalidate = useInvalidateQuotations();
  return useMutation({
    mutationKey: [...quotationsQueryKey, "reject"],
    mutationFn: (id: string) => rejectQuotation(getAccessToken(), id),
    onSuccess: async () => {
      await invalidate();
      message.success("ปฏิเสธใบเสนอราคาสำเร็จ");
    },
    onError: (error: Error) => {
      message.error(error.message || "ปฏิเสธไม่สำเร็จ");
    },
  });
}

export function useCancelQuotationMutation() {
  const { message } = App.useApp();
  const invalidate = useInvalidateQuotations();
  return useMutation({
    mutationKey: [...quotationsQueryKey, "cancel"],
    mutationFn: (id: string) => cancelQuotation(getAccessToken(), id),
    onSuccess: async () => {
      await invalidate();
      message.success("ยกเลิกใบเสนอราคาสำเร็จ");
    },
    onError: (error: Error) => {
      message.error(error.message || "ยกเลิกไม่สำเร็จ");
    },
  });
}
