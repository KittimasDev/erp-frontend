"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import {
  cancelDeliveryOrder,
  confirmDeliveryOrder,
  createDeliveryOrderFromPacking,
  deliverDeliveryOrder,
  updateDeliveryOrder,
} from "@/lib/api/delivery-orders";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token";
import type {
  CreateDeliveryOrderFromPackingBody,
  UpdateDeliveryOrderBody,
} from "@/types/delivery-orders";
import { invalidateSalesOrderFlowQueries } from "@/hooks/sales-orders/invalidate-sales-order-flow";
import { deliveryOrdersQueryKey } from "./useDeliveryOrdersQuery";

function useInvalidate() {
  const qc = useQueryClient();
  return async () => {
    await qc.invalidateQueries({ queryKey: deliveryOrdersQueryKey });
    await invalidateSalesOrderFlowQueries(qc);
  };
}

export function useCreateDeliveryOrderFromPackingMutation() {
  const { message } = App.useApp();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({
      packingId,
      body,
    }: {
      packingId: string;
      body?: CreateDeliveryOrderFromPackingBody;
    }) =>
      createDeliveryOrderFromPacking(getAccessToken(), packingId, body),
    onSuccess: async (res) => {
      await invalidate();
      message.success(res.message || "เปิดใบส่งแล้ว");
    },
    onError: (e: Error) =>
      message.error(e instanceof ApiError ? e.message : "สร้างไม่สำเร็จ"),
  });
}

export function useUpdateDeliveryOrderMutation() {
  const { message } = App.useApp();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateDeliveryOrderBody }) =>
      updateDeliveryOrder(getAccessToken(), id, body),
    onSuccess: async (res) => {
      await invalidate();
      message.success(res.message || "บันทึกสำเร็จ");
    },
    onError: (e: Error) =>
      message.error(e instanceof ApiError ? e.message : "บันทึกไม่สำเร็จ"),
  });
}

export function useConfirmDeliveryOrderMutation() {
  const { message } = App.useApp();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => confirmDeliveryOrder(getAccessToken(), id),
    onSuccess: async (res) => {
      await invalidate();
      message.success(res.message || "ยืนยันสำเร็จ");
    },
    onError: (e: Error) =>
      message.error(e instanceof ApiError ? e.message : "ยืนยันไม่สำเร็จ"),
  });
}

export function useDeliverDeliveryOrderMutation() {
  const { message } = App.useApp();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => deliverDeliveryOrder(getAccessToken(), id),
    onSuccess: async (res) => {
      await invalidate();
      message.success(res.message || "บันทึกส่งมอบสำเร็จ");
    },
    onError: (e: Error) =>
      message.error(e instanceof ApiError ? e.message : "ส่งมอบไม่สำเร็จ"),
  });
}

export function useCancelDeliveryOrderMutation() {
  const { message } = App.useApp();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => cancelDeliveryOrder(getAccessToken(), id),
    onSuccess: async (res) => {
      await invalidate();
      message.success(res.message || "ยกเลิกสำเร็จ");
    },
    onError: (e: Error) =>
      message.error(e instanceof ApiError ? e.message : "ยกเลิกไม่สำเร็จ"),
  });
}
