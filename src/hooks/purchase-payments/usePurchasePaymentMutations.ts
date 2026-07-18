"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { ApiError } from "@/lib/api/client";
import {
  cancelPurchasePayment,
  confirmPurchasePayment,
  createPurchasePaymentFromPo,
} from "@/lib/api/purchase-payments";
import { getAccessToken } from "@/lib/auth/token";
import type {
  ConfirmSupplierPaymentBody,
  CreateSupplierPaymentFromPoBody,
} from "@/types/purchase-payments";
import { purchaseOrdersQueryKey } from "../purchase-orders/usePurchaseOrdersQuery";
import { purchasePaymentsQueryKey } from "./usePurchasePaymentsQuery";

export function useCreatePurchasePaymentFromPoMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: ({
      purchaseOrderId,
      body,
    }: {
      purchaseOrderId: string;
      body: CreateSupplierPaymentFromPoBody;
    }) => createPurchasePaymentFromPo(getAccessToken(), purchaseOrderId, body),
    onSuccess: async (res) => {
      await queryClient.invalidateQueries({
        queryKey: purchasePaymentsQueryKey,
      });
      await queryClient.invalidateQueries({ queryKey: purchaseOrdersQueryKey });
      message.success(res.message || "สร้างใบสำคัญจ่ายสำเร็จ");
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError
          ? error.message
          : "สร้างใบสำคัญจ่ายไม่สำเร็จ",
      );
    },
  });
}

export function useConfirmPurchasePaymentMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body?: ConfirmSupplierPaymentBody;
    }) => confirmPurchasePayment(getAccessToken(), id, body),
    onSuccess: async (res) => {
      await queryClient.invalidateQueries({
        queryKey: purchasePaymentsQueryKey,
      });
      await queryClient.invalidateQueries({ queryKey: purchaseOrdersQueryKey });
      message.success(res.message || "จ่ายเงินสำเร็จ");
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : "จ่ายเงินไม่สำเร็จ",
      );
    },
  });
}

export function useCancelPurchasePaymentMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: (id: string) => cancelPurchasePayment(getAccessToken(), id),
    onSuccess: async (res) => {
      await queryClient.invalidateQueries({
        queryKey: purchasePaymentsQueryKey,
      });
      message.success(res.message || "ยกเลิกใบสำคัญจ่ายแล้ว");
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError
          ? error.message
          : "ยกเลิกใบสำคัญจ่ายไม่สำเร็จ",
      );
    },
  });
}
