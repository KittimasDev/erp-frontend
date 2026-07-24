"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { ApiError } from "@/lib/api/client";
import {
  cancelSalesInvoice,
  confirmSalesInvoice,
  createSalesInvoiceFromDelivery,
  receiveSalesInvoicePayment,
  updateSalesInvoice,
} from "@/lib/api/sales-invoices";
import { getAccessToken } from "@/lib/auth/token";
import type {
  CreateSalesInvoiceFromDeliveryBody,
  ReceiveSalesInvoicePaymentBody,
  UpdateSalesInvoiceBody,
} from "@/types/sales-invoices";
import { deliveryOrdersQueryKey } from "../delivery-orders/useDeliveryOrdersQuery";
import { salesInvoicesQueryKey } from "./useSalesInvoicesQuery";

export function useCreateSalesInvoiceFromDeliveryMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: ({
      deliveryOrderId,
      body,
    }: {
      deliveryOrderId: string;
      body: CreateSalesInvoiceFromDeliveryBody;
    }) =>
      createSalesInvoiceFromDelivery(getAccessToken(), deliveryOrderId, body),
    onSuccess: async (res) => {
      await queryClient.invalidateQueries({ queryKey: salesInvoicesQueryKey });
      await queryClient.invalidateQueries({ queryKey: deliveryOrdersQueryKey });
      message.success(res.message || "สร้างใบแจ้งหนี้สำเร็จ");
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError
          ? error.message
          : "สร้างใบแจ้งหนี้ไม่สำเร็จ",
      );
    },
  });
}

export function useUpdateSalesInvoiceMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateSalesInvoiceBody }) =>
      updateSalesInvoice(getAccessToken(), id, body),
    onSuccess: async (res) => {
      await queryClient.invalidateQueries({ queryKey: salesInvoicesQueryKey });
      message.success(res.message || "บันทึกใบแจ้งหนี้สำเร็จ");
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError
          ? error.message
          : "บันทึกใบแจ้งหนี้ไม่สำเร็จ",
      );
    },
  });
}

export function useConfirmSalesInvoiceMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: (id: string) => confirmSalesInvoice(getAccessToken(), id),
    onSuccess: async (res) => {
      await queryClient.invalidateQueries({ queryKey: salesInvoicesQueryKey });
      message.success(res.message || "ยืนยันใบแจ้งหนี้สำเร็จ");
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError
          ? error.message
          : "ยืนยันใบแจ้งหนี้ไม่สำเร็จ",
      );
    },
  });
}

export function useReceiveSalesInvoicePaymentMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: ReceiveSalesInvoicePaymentBody;
    }) => receiveSalesInvoicePayment(getAccessToken(), id, body),
    onSuccess: async (res) => {
      await queryClient.invalidateQueries({ queryKey: salesInvoicesQueryKey });
      message.success(res.message || "รับชำระเงินสำเร็จ");
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : "รับชำระเงินไม่สำเร็จ",
      );
    },
  });
}

export function useCancelSalesInvoiceMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: (id: string) => cancelSalesInvoice(getAccessToken(), id),
    onSuccess: async (res) => {
      await queryClient.invalidateQueries({ queryKey: salesInvoicesQueryKey });
      await queryClient.invalidateQueries({ queryKey: deliveryOrdersQueryKey });
      message.success(res.message || "ยกเลิกใบแจ้งหนี้แล้ว");
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError
          ? error.message
          : "ยกเลิกใบแจ้งหนี้ไม่สำเร็จ",
      );
    },
  });
}
