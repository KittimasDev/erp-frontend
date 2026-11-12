"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { useT } from "@/lib/i18n/useT";
import { ApiError } from "@/lib/api/client";
import {
  approvePurchaseRequest,
  cancelPurchaseRequest,
  createPurchaseRequest,
  rejectPurchaseRequest,
  returnPurchaseRequestToDraft,
  submitPurchaseRequest,
  updatePurchaseRequest,
} from "@/lib/api/purchase-requests";
import { getAccessToken } from "@/lib/auth/token";
import type {
  CreatePurchaseRequestBody,
  RejectPurchaseRequestBody,
  UpdatePurchaseRequestBody,
} from "@/types/purchase-requests";
import { purchaseRequestsQueryKey } from "./usePurchaseRequestsQuery";
import { purchaseOrdersQueryKey } from "@/hooks/purchase-orders/usePurchaseOrdersQuery";

export function useCreatePurchaseRequestMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const t = useT();

  return useMutation({
    mutationKey: [...purchaseRequestsQueryKey, "create"],
    mutationFn: (payload: CreatePurchaseRequestBody) =>
      createPurchaseRequest(getAccessToken(), payload),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: purchaseRequestsQueryKey });
      message.success(response.message || t("สร้างใบขอซื้อสำเร็จแล้ว"));
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : t("สร้างใบขอซื้อไม่สำเร็จ"),
      );
    },
  });
}

export function useUpdatePurchaseRequestMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const t = useT();

  return useMutation({
    mutationKey: [...purchaseRequestsQueryKey, "update"],
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: UpdatePurchaseRequestBody;
    }) => updatePurchaseRequest(getAccessToken(), id, body),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: purchaseRequestsQueryKey });
      message.success(response.message || t("แก้ไขใบขอซื้อสำเร็จแล้ว"));
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : t("แก้ไขใบขอซื้อไม่สำเร็จ"),
      );
    },
  });
}

export function useSubmitPurchaseRequestMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const t = useT();

  return useMutation({
    mutationKey: [...purchaseRequestsQueryKey, "submit"],
    mutationFn: (id: string) => submitPurchaseRequest(getAccessToken(), id),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: purchaseRequestsQueryKey });
      message.success(response.message || t("ส่งอนุมัติสำเร็จแล้ว"));
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : t("ส่งอนุมัติไม่สำเร็จ"),
      );
    },
  });
}

export function useApprovePurchaseRequestMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const t = useT();

  return useMutation({
    mutationKey: [...purchaseRequestsQueryKey, "approve"],
    mutationFn: (id: string) => approvePurchaseRequest(getAccessToken(), id),
    onSuccess: async (response) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: purchaseRequestsQueryKey }),
        queryClient.invalidateQueries({ queryKey: purchaseOrdersQueryKey }),
      ]);
      message.success(
        response.message ||
          t("อนุมัติแล้ว — ไปสร้างใบสั่งซื้อได้ที่เมนูใบสั่งซื้อ"),
      );
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : t("อนุมัติใบขอซื้อไม่สำเร็จ"),
      );
    },
  });
}

export function useRejectPurchaseRequestMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const t = useT();

  return useMutation({
    mutationKey: [...purchaseRequestsQueryKey, "reject"],
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body?: RejectPurchaseRequestBody;
    }) => rejectPurchaseRequest(getAccessToken(), id, body),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: purchaseRequestsQueryKey });
      message.success(response.message || t("ปฏิเสธใบขอซื้อแล้ว"));
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : t("ปฏิเสธใบขอซื้อไม่สำเร็จ"),
      );
    },
  });
}

/** ผู้อนุมัติส่งกลับให้ผู้ขอแก้ไข (รออนุมัติ → แก้ไข) */
export function useReturnPurchaseRequestToDraftMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const t = useT();

  return useMutation({
    mutationKey: [...purchaseRequestsQueryKey, "return-to-draft"],
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body?: RejectPurchaseRequestBody;
    }) => returnPurchaseRequestToDraft(getAccessToken(), id, body),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({
        queryKey: purchaseRequestsQueryKey,
      });
      message.success(response.message || t("ส่งกลับให้แก้ไขแล้ว"));
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : t("ส่งกลับแก้ไขไม่สำเร็จ"),
      );
    },
  });
}

export function useCancelPurchaseRequestMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const t = useT();

  return useMutation({
    mutationKey: [...purchaseRequestsQueryKey, "cancel"],
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      cancelPurchaseRequest(getAccessToken(), id, reason),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: purchaseRequestsQueryKey });
      message.success(response.message || t("ยกเลิกใบขอซื้อแล้ว"));
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : t("ยกเลิกใบขอซื้อไม่สำเร็จ"),
      );
    },
  });
}
