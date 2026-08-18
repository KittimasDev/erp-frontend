"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import {
  getRawTirePurchasePaymentPrintPreview,
  payRawTirePurchaseReceipt,
  uploadRawTirePurchasePaymentSlip,
} from "@/lib/api/raw-tire-purchase-receipts";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token";
import type { PayReceiptRequest } from "@/types/raw-tire-payment";
import { weighbridgeDashboardQueryKey } from "@/hooks/weighbridge-tickets/useWeighbridgeDashboardQuery";
import { weighbridgeTicketQueryKey } from "@/hooks/weighbridge-tickets/useWeighbridgeTicketQuery";
import { rawTirePurchaseReceiptQueryKey } from "@/hooks/raw-tire-purchase/useRawTirePurchaseReceiptQuery";
import { rawTirePaymentQueryKey } from "./useRawTirePaymentQuery";

function invalidatePayment(
  queryClient: ReturnType<typeof useQueryClient>,
  receiptId: string,
) {
  return Promise.all([
    queryClient.invalidateQueries({
      queryKey: [...rawTirePaymentQueryKey, receiptId],
    }),
    queryClient.invalidateQueries({
      queryKey: [...rawTirePurchaseReceiptQueryKey, receiptId],
    }),
    queryClient.invalidateQueries({
      queryKey: weighbridgeDashboardQueryKey,
    }),
    queryClient.invalidateQueries({
      queryKey: weighbridgeTicketQueryKey,
    }),
    queryClient.invalidateQueries({
      queryKey: ["warehouse", "stock-posting-requests"],
    }),
  ]);
}

export function usePayReceiptMutation(receiptId: string) {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: ["raw-tire-purchase", "receipts", receiptId, "pay"],
    mutationFn: (payload: PayReceiptRequest) =>
      payRawTirePurchaseReceipt(getAccessToken(), receiptId, payload),
    onSuccess: async (response) => {
      await invalidatePayment(queryClient, receiptId);
      message.success(
        response.message ||
          "บันทึกจ่ายเงินสำเร็จแล้ว — แจ้งคลังให้เลือกคลังและอนุมัติ",
      );
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : "บันทึกจ่ายเงินไม่สำเร็จ",
      );
    },
  });
}

export function useUploadPaymentSlipMutation(receiptId: string) {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: [
      "raw-tire-purchase",
      "receipts",
      receiptId,
      "payment",
      "slips",
      "upload",
    ],
    mutationFn: (payload: { file: File; description?: string }) =>
      uploadRawTirePurchasePaymentSlip(
        getAccessToken(),
        receiptId,
        payload.file,
        payload.description,
      ),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({
        queryKey: [...rawTirePaymentQueryKey, receiptId],
      });
      message.success(response.message || "อัปโหลดสลิปสำเร็จแล้ว");
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : "อัปโหลดสลิปไม่สำเร็จ",
      );
    },
  });
}

export function usePaymentPrintPreviewMutation(receiptId: string) {
  const { message } = App.useApp();

  return useMutation({
    mutationKey: [
      "raw-tire-purchase",
      "receipts",
      receiptId,
      "payment-print-preview",
    ],
    mutationFn: () =>
      getRawTirePurchasePaymentPrintPreview(getAccessToken(), receiptId),
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
        error instanceof ApiError
          ? error.message
          : "เปิดตัวอย่างพิมพ์ไม่สำเร็จ",
      );
    },
  });
}
