"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import {
  cancelRawTirePurchaseReceipt,
  confirmRawTirePurchaseReceipt,
  getRawTirePurchaseReceiptPrintPreview,
  recalculateRawTirePurchaseReceiptTotals,
} from "@/lib/api/raw-tire-purchase-receipts";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token";
import type { CancelReceiptRequest } from "@/types/raw-tire-purchase-receipt";
import { weighbridgeDashboardQueryKey } from "@/hooks/weighbridge-tickets/useWeighbridgeDashboardQuery";
import { weighbridgeTicketQueryKey } from "@/hooks/weighbridge-tickets/useWeighbridgeTicketQuery";
import { ticketClassificationQueryKey } from "@/hooks/raw-tire-classification/useTicketClassificationQuery";
import { rawTirePurchaseReceiptQueryKey } from "./useRawTirePurchaseReceiptQuery";

function invalidateReceipt(
  queryClient: ReturnType<typeof useQueryClient>,
  receiptId: string,
  ticketId?: string,
) {
  const tasks = [
    queryClient.invalidateQueries({
      queryKey: [...rawTirePurchaseReceiptQueryKey, receiptId],
    }),
    queryClient.invalidateQueries({
      queryKey: weighbridgeDashboardQueryKey,
    }),
  ];

  if (ticketId) {
    tasks.push(
      queryClient.invalidateQueries({
        queryKey: [...ticketClassificationQueryKey, ticketId],
      }),
      queryClient.invalidateQueries({
        queryKey: [...weighbridgeTicketQueryKey, ticketId],
      }),
    );
  } else {
    tasks.push(
      queryClient.invalidateQueries({
        queryKey: weighbridgeTicketQueryKey,
      }),
    );
  }

  return Promise.all(tasks);
}

export function useConfirmReceiptMutation(receiptId: string, ticketId?: string) {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: ["raw-tire-purchase", "receipts", receiptId, "confirm"],
    mutationFn: () =>
      confirmRawTirePurchaseReceipt(getAccessToken(), receiptId),
    onSuccess: async (response) => {
      await invalidateReceipt(
        queryClient,
        receiptId,
        ticketId ?? response.data.weighbridgeTicketId,
      );
      message.success(response.message || "ยืนยันใบรับซื้อสำเร็จแล้ว");
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : "ยืนยันใบรับซื้อไม่สำเร็จ",
      );
    },
  });
}

export function useCancelReceiptDetailMutation(
  receiptId: string,
  ticketId?: string,
) {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: ["raw-tire-purchase", "receipts", receiptId, "cancel"],
    mutationFn: (payload?: CancelReceiptRequest) =>
      cancelRawTirePurchaseReceipt(getAccessToken(), receiptId, payload),
    onSuccess: async (response) => {
      await invalidateReceipt(
        queryClient,
        receiptId,
        ticketId ?? response.data.weighbridgeTicketId,
      );
      message.success(response.message || "ยกเลิกใบรับซื้อสำเร็จแล้ว");
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : "ยกเลิกใบรับซื้อไม่สำเร็จ",
      );
    },
  });
}

export function useRecalculateReceiptTotalsMutation(receiptId: string) {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: ["raw-tire-purchase", "receipts", receiptId, "recalculate"],
    mutationFn: () =>
      recalculateRawTirePurchaseReceiptTotals(getAccessToken(), receiptId),
    onSuccess: async (response) => {
      await invalidateReceipt(queryClient, receiptId);
      message.success(response.message || "คำนวณยอดรวมใหม่สำเร็จแล้ว");
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : "คำนวณยอดรวมใหม่ไม่สำเร็จ",
      );
    },
  });
}

export function usePrintPreviewMutation(receiptId: string) {
  const { message } = App.useApp();

  return useMutation({
    mutationKey: ["raw-tire-purchase", "receipts", receiptId, "print-preview"],
    mutationFn: () =>
      getRawTirePurchaseReceiptPrintPreview(getAccessToken(), receiptId),
    onSuccess: (response) => {
      const win = window.open("", "_blank", "noopener,noreferrer");
      if (!win) {
        message.warning("ไม่สามารถเปิดหน้าต่างพิมพ์ได้ กรุณาอนุญาต popup");
        return;
      }
      win.document.write(response.data.previewHtml);
      win.document.close();
      message.success(response.message || "เปิดตัวอย่างพิมพ์แล้ว");
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : "เปิดตัวอย่างพิมพ์ไม่สำเร็จ",
      );
    },
  });
}
