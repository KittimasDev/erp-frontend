"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { ApiError } from "@/lib/api/client";
import {
  cancelPurchaseOrder,
  confirmPurchaseOrder,
  createPurchaseOrderFromPr,
  updatePurchaseOrder,
} from "@/lib/api/purchase-orders";
import { getAccessToken } from "@/lib/auth/token";
import type {
  CreatePurchaseOrderFromPrBody,
  UpdatePurchaseOrderBody,
} from "@/types/purchase-orders";
import { purchaseOrdersQueryKey } from "./usePurchaseOrdersQuery";

export function useCreatePurchaseOrderFromPrMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: [...purchaseOrdersQueryKey, "create-from-pr"],
    mutationFn: ({
      purchaseRequestId,
      body,
    }: {
      purchaseRequestId: string;
      body: CreatePurchaseOrderFromPrBody;
    }) =>
      createPurchaseOrderFromPr(getAccessToken(), purchaseRequestId, body),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: purchaseOrdersQueryKey });
      message.success(response.message || "สร้างใบสั่งซื้อสำเร็จแล้ว");
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : "สร้างใบสั่งซื้อไม่สำเร็จ",
      );
    },
  });
}

export function useUpdatePurchaseOrderMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: [...purchaseOrdersQueryKey, "update"],
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: UpdatePurchaseOrderBody;
    }) => updatePurchaseOrder(getAccessToken(), id, body),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: purchaseOrdersQueryKey });
      message.success(response.message || "แก้ไขใบสั่งซื้อสำเร็จแล้ว");
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : "แก้ไขใบสั่งซื้อไม่สำเร็จ",
      );
    },
  });
}

export function useConfirmPurchaseOrderMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: [...purchaseOrdersQueryKey, "confirm"],
    mutationFn: (id: string) => confirmPurchaseOrder(getAccessToken(), id),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: purchaseOrdersQueryKey });
      message.success(response.message || "Confirm ใบสั่งซื้อสำเร็จแล้ว");
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : "Confirm ไม่สำเร็จ",
      );
    },
  });
}

export function useCancelPurchaseOrderMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: [...purchaseOrdersQueryKey, "cancel"],
    mutationFn: (id: string) => cancelPurchaseOrder(getAccessToken(), id),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: purchaseOrdersQueryKey });
      message.success(response.message || "ยกเลิกใบสั่งซื้อแล้ว");
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : "ยกเลิกไม่สำเร็จ",
      );
    },
  });
}
