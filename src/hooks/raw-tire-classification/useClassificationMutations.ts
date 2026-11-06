"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import {
  calculateRawTirePurchaseReceipt,
  cancelRawTirePurchaseReceipt,
  createRawTirePurchaseReceipt,
  submitRawTirePurchaseReceipt,
  updateRawTirePurchaseClassification,
} from "@/lib/api/raw-tire-purchase-receipts";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token";
import type { SaveClassificationRequest } from "@/types/raw-tire-classification";
import { ticketClassificationQueryKey } from "./useTicketClassificationQuery";
import { weighbridgeDashboardQueryKey } from "@/hooks/weighbridge-tickets/useWeighbridgeDashboardQuery";
import { useT } from "@/lib/i18n/useT";

function invalidateClassification(
  queryClient: ReturnType<typeof useQueryClient>,
  ticketId: string,
) {
  return Promise.all([
    queryClient.invalidateQueries({
      queryKey: [...ticketClassificationQueryKey, ticketId],
    }),
    queryClient.invalidateQueries({
      queryKey: weighbridgeDashboardQueryKey,
    }),
  ]);
}

export function useSaveClassificationMutation(ticketId: string, receiptId?: string) {
  const t = useT();
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: [
      "raw-tire-purchase",
      "receipts",
      receiptId ?? "new",
      "save",
    ],
    mutationFn: (payload: SaveClassificationRequest) => {
      const token = getAccessToken();
      if (receiptId) {
        return updateRawTirePurchaseClassification(token, receiptId, payload);
      }
      return createRawTirePurchaseReceipt(token, {
        ...payload,
        weighbridgeTicketId: ticketId,
      });
    },
    onSuccess: async (response) => {
      await invalidateClassification(queryClient, ticketId);
      message.success(response.message || t("บันทึกร่างสำเร็จแล้ว"));
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : t("บันทึกร่างไม่สำเร็จ"),
      );
    },
  });
}

export function useCalculateReceiptMutation(ticketId: string, receiptId?: string) {
  const t = useT();
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: ["raw-tire-purchase", "receipts", receiptId, "calculate"],
    mutationFn: () =>
      calculateRawTirePurchaseReceipt(getAccessToken(), receiptId!),
    onSuccess: async (response) => {
      await invalidateClassification(queryClient, ticketId);
      message.success(response.message || t("คำนวณใหม่สำเร็จแล้ว"));
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : t("คำนวณใหม่ไม่สำเร็จ"),
      );
    },
  });
}

export function useSubmitReceiptMutation(ticketId: string, receiptId?: string) {
  const t = useT();
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: ["raw-tire-purchase", "receipts", receiptId, "submit"],
    mutationFn: () =>
      submitRawTirePurchaseReceipt(getAccessToken(), receiptId!),
    onSuccess: async (response) => {
      await invalidateClassification(queryClient, ticketId);
      message.success(response.message || t("ส่งอนุมัติสำเร็จแล้ว"));
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : t("ส่งอนุมัติไม่สำเร็จ"),
      );
    },
  });
}

export function useCancelReceiptMutation(ticketId: string, receiptId?: string) {
  const t = useT();
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: ["raw-tire-purchase", "receipts", receiptId, "cancel"],
    mutationFn: (reason?: string) =>
      cancelRawTirePurchaseReceipt(getAccessToken(), receiptId!, {
        reason,
      }),
    onSuccess: async (response) => {
      await invalidateClassification(queryClient, ticketId);
      message.success(response.message || t("ยกเลิกใบรับซื้อสำเร็จแล้ว"));
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : t("ยกเลิกใบรับซื้อไม่สำเร็จ"),
      );
    },
  });
}
