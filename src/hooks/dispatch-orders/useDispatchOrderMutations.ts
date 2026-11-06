"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import {
  cancelDispatchOrder,
  confirmPickingDispatchOrder,
  createDispatchOrder,
  dispatchDispatchOrder,
  packDispatchOrder,
} from "@/lib/api/dispatch-orders";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token";
import type {
  CreateDispatchOrderBody,
  DeliverDispatchOrderBody,
} from "@/types/dispatch-orders";

import { dispatchOrdersQueryKey } from "./useDispatchOrdersQuery";
import { invalidateSalesOrderFlowQueries } from "@/hooks/sales-orders/invalidate-sales-order-flow";
import { useT } from "@/lib/i18n/useT";

function useInvalidateDispatchOrders() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: dispatchOrdersQueryKey });
}

export function useCreateDispatchOrderMutation() {
  const t = useT();
  const { message } = App.useApp();
  const invalidate = useInvalidateDispatchOrders();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [...dispatchOrdersQueryKey, "create"],
    mutationFn: (body: CreateDispatchOrderBody) =>
      createDispatchOrder(getAccessToken(), body),
    onSuccess: async (res) => {
      await invalidate();
      await invalidateSalesOrderFlowQueries(queryClient);
      message.success(res.message || t("สร้างใบจ่ายสินค้าสำเร็จ"));
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : t("สร้างใบจ่ายสินค้าไม่สำเร็จ"),
      );
    },
  });
}

export function useConfirmPickingDispatchOrderMutation() {
  const t = useT();
  const { message } = App.useApp();
  const invalidate = useInvalidateDispatchOrders();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [...dispatchOrdersQueryKey, "confirm-picking"],
    mutationFn: (id: string) => confirmPickingDispatchOrder(getAccessToken(), id),
    onSuccess: async (res) => {
      await invalidate();
      await invalidateSalesOrderFlowQueries(queryClient);
      message.success(res.message || t("ยืนยันการหยิบสินค้าสำเร็จ"));
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : t("ยืนยันการหยิบสินค้าไม่สำเร็จ"),
      );
    },
  });
}

export function usePackDispatchOrderMutation() {
  const t = useT();
  const { message } = App.useApp();
  const invalidate = useInvalidateDispatchOrders();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [...dispatchOrdersQueryKey, "pack"],
    mutationFn: (id: string) => packDispatchOrder(getAccessToken(), id),
    onSuccess: async (res) => {
      await invalidate();
      await invalidateSalesOrderFlowQueries(queryClient);
      message.success(res.message || t("ยืนยันแพ็คสินค้าสำเร็จ"));
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : t("แพ็คสินค้าไม่สำเร็จ"),
      );
    },
  });
}

export function useCancelDispatchOrderMutation() {
  const t = useT();
  const { message } = App.useApp();
  const invalidate = useInvalidateDispatchOrders();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [...dispatchOrdersQueryKey, "cancel"],
    mutationFn: (id: string) => cancelDispatchOrder(getAccessToken(), id),
    onSuccess: async (res) => {
      await invalidate();
      await invalidateSalesOrderFlowQueries(queryClient);
      message.success(res.message || t("ยกเลิกใบจ่ายสินค้าสำเร็จ"));
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : t("ยกเลิกใบจ่ายสินค้าไม่สำเร็จ"),
      );
    },
  });
}

export function useDispatchDispatchOrderMutation() {
  const t = useT();
  const { message } = App.useApp();
  const invalidate = useInvalidateDispatchOrders();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [...dispatchOrdersQueryKey, "dispatch"],
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body?: DeliverDispatchOrderBody;
    }) => dispatchDispatchOrder(getAccessToken(), id, body),
    onSuccess: async (res) => {
      await invalidate();
      await invalidateSalesOrderFlowQueries(queryClient);
      message.success(res.message || t("ยืนยันจ่ายสินค้าออกสำเร็จ"));
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : t("จ่ายสินค้าออกไม่สำเร็จ"),
      );
    },
  });
}
