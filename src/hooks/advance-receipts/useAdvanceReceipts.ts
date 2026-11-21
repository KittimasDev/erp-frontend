"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { ApiError } from "@/lib/api/client";
import {
  cancelAdvanceReceipt,
  confirmAdvanceReceipt,
  createAdvanceReceipt,
  getAdvanceReceipt,
  getAdvanceReceipts,
  getAdvanceReceiptSuggestion,
  searchAdvanceSalesOrders,
  updateAdvanceReceipt,
  type AdvanceReceiptQuery,
} from "@/lib/api/advance-receipts";
import type { AdvanceReceiptInput } from "@/types/advance-receipts";
import { getAccessToken } from "@/lib/auth/token";
import { useT } from "@/lib/i18n/useT";
import { arReceiptsQueryKey } from "@/hooks/ar-receipts/useArReceipts";

export const advanceReceiptsQueryKey = ["advance-receipts"] as const;

async function invalidateAdvanceAndSoFinance(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: advanceReceiptsQueryKey }),
    queryClient.invalidateQueries({ queryKey: arReceiptsQueryKey }),
  ]);
}

export function useAdvanceReceiptsQuery(params: AdvanceReceiptQuery) {
  return useQuery({
    queryKey: [...advanceReceiptsQueryKey, "list", params],
    queryFn: () => getAdvanceReceipts(getAccessToken(), params),
  });
}

export function useAdvanceReceiptQuery(id?: string) {
  return useQuery({
    queryKey: [...advanceReceiptsQueryKey, "detail", id],
    queryFn: () => getAdvanceReceipt(getAccessToken(), id!),
    enabled: Boolean(id),
  });
}

export function useAdvanceSalesOrderSearchQuery(keyword: string) {
  const text = keyword.trim();
  return useQuery({
    queryKey: [...advanceReceiptsQueryKey, "sales-orders", text],
    queryFn: () => searchAdvanceSalesOrders(getAccessToken(), text),
    enabled: text.length >= 2,
  });
}

export function useAdvanceReceiptSuggestionQuery(
  salesOrderId?: string,
  excludeAdvanceId?: string,
) {
  return useQuery({
    queryKey: [
      ...advanceReceiptsQueryKey,
      "suggestion",
      salesOrderId,
      excludeAdvanceId ?? "",
    ],
    queryFn: () =>
      getAdvanceReceiptSuggestion(
        getAccessToken(),
        salesOrderId!,
        excludeAdvanceId,
      ),
    enabled: Boolean(salesOrderId),
  });
}

export function useCreateAdvanceReceiptMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const t = useT();
  return useMutation({
    mutationFn: (body: AdvanceReceiptInput) => createAdvanceReceipt(getAccessToken(), body),
    onSuccess: async (res) => {
      await invalidateAdvanceAndSoFinance(queryClient);
      message.success(res.message || t("สร้างเอกสารรับเงินล่วงหน้าสำเร็จ"));
    },
    onError: (error: Error) => {
      message.error(error instanceof ApiError ? error.message : t("รับเงินล่วงหน้าไม่สำเร็จ"));
    },
  });
}

export function useUpdateAdvanceReceiptMutation(id: string) {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const t = useT();
  return useMutation({
    mutationFn: (body: AdvanceReceiptInput) => updateAdvanceReceipt(getAccessToken(), id, body),
    onSuccess: async (res) => {
      await invalidateAdvanceAndSoFinance(queryClient);
      message.success(res.message || t("บันทึกเอกสารรับเงินล่วงหน้าสำเร็จ"));
    },
    onError: (error: Error) => {
      message.error(error instanceof ApiError ? error.message : t("รับเงินล่วงหน้าไม่สำเร็จ"));
    },
  });
}

export function useConfirmAdvanceReceiptMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const t = useT();
  return useMutation({
    mutationFn: (id: string) => confirmAdvanceReceipt(getAccessToken(), id),
    onSuccess: async (res) => {
      await invalidateAdvanceAndSoFinance(queryClient);
      message.success(res.message || t("ยืนยันรับเงินสำเร็จ"));
    },
    onError: (error: Error) => {
      message.error(error instanceof ApiError ? error.message : t("ยืนยันรับเงินไม่สำเร็จ"));
    },
  });
}

export function useCancelAdvanceReceiptMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const t = useT();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      cancelAdvanceReceipt(getAccessToken(), id, reason),
    onSuccess: async (res) => {
      await invalidateAdvanceAndSoFinance(queryClient);
      message.success(res.message || t("ยกเลิกเอกสารรับเงินล่วงหน้าสำเร็จ"));
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : t("ยกเลิกเอกสารรับเงินล่วงหน้าไม่สำเร็จ"),
      );
    },
  });
}
