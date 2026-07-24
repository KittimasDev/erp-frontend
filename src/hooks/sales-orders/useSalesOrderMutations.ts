"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import {
  cancelSalesOrder,
  confirmSalesOrder,
  confirmStockVerification,
  createSalesOrderFromQuotation,
} from "@/lib/api/sales-orders";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token";
import type { CreateSalesOrderFromQuotationBody } from "@/types/sales-orders";

import { salesOrdersQueryKey } from "./useSalesOrdersQuery";
import { quotationsQueryKey } from "@/hooks/quotations/useQuotationsQuery";

function useInvalidateSalesOrders() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: salesOrdersQueryKey });
}

export function useCreateSalesOrderFromQuotationMutation() {
  const { message } = App.useApp();
  const invalidate = useInvalidateSalesOrders();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [...salesOrdersQueryKey, "create-from-quotation"],
    mutationFn: ({
      quotationId,
      body,
    }: {
      quotationId: string;
      body?: CreateSalesOrderFromQuotationBody;
    }) => createSalesOrderFromQuotation(getAccessToken(), quotationId, body),
    onSuccess: async (res) => {
      await invalidate();
      await queryClient.invalidateQueries({ queryKey: quotationsQueryKey });
      message.success(res.message || "สร้างใบสั่งขายสำเร็จ");
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : "สร้างใบสั่งขายไม่สำเร็จ",
      );
    },
  });
}

export function useConfirmSalesOrderMutation() {
  const { message } = App.useApp();
  const invalidate = useInvalidateSalesOrders();

  return useMutation({
    mutationKey: [...salesOrdersQueryKey, "confirm"],
    mutationFn: (id: string) => confirmSalesOrder(getAccessToken(), id),
    onSuccess: async (res) => {
      await invalidate();
      message.success(res.message || "ยืนยันใบสั่งขายสำเร็จ");
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : "ยืนยันใบสั่งขายไม่สำเร็จ",
      );
    },
  });
}

export function useCancelSalesOrderMutation() {
  const { message } = App.useApp();
  const invalidate = useInvalidateSalesOrders();

  return useMutation({
    mutationKey: [...salesOrdersQueryKey, "cancel"],
    mutationFn: (id: string) => cancelSalesOrder(getAccessToken(), id),
    onSuccess: async (res) => {
      await invalidate();
      message.success(res.message || "ยกเลิกใบสั่งขายสำเร็จ");
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : "ยกเลิกใบสั่งขายไม่สำเร็จ",
      );
    },
  });
}

export function useConfirmStockVerificationMutation() {
  const { message } = App.useApp();
  const invalidate = useInvalidateSalesOrders();

  return useMutation({
    mutationKey: [...salesOrdersQueryKey, "confirm-stock-verification"],
    mutationFn: (id: string) => confirmStockVerification(getAccessToken(), id),
    onSuccess: async (res) => {
      await invalidate();
      message.success(res.message || "ยืนยันผลตรวจสอบสต๊อกสำเร็จ");
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError
          ? error.message
          : "ยืนยันผลตรวจสอบสต๊อกไม่สำเร็จ",
      );
    },
  });
}
