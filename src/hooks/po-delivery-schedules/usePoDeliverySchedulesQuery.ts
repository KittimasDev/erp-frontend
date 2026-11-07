"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { ApiError } from "@/lib/api/client";
import {
  cancelPoRoundReceiving,
  closePoRoundRemaining,
  getPoDeliverySchedules,
  reschedulePoDeliverySchedule,
} from "@/lib/api/po-delivery-schedules";
import { getAccessToken } from "@/lib/auth/token";
import { tNow } from "@/lib/i18n/useT";
import type {
  CancelPoReceivingBody,
  ReschedulePoDeliveryBody,
} from "@/types/po-delivery-schedules";

export const poDeliverySchedulesQueryKey = ["purchase-orders", "delivery-schedules"];

export function usePoDeliverySchedulesQuery(purchaseOrderId?: string) {
  return useQuery({
    queryKey: [...poDeliverySchedulesQueryKey, purchaseOrderId],
    enabled: Boolean(purchaseOrderId),
    queryFn: () => getPoDeliverySchedules(getAccessToken(), purchaseOrderId!),
  });
}

export function useReschedulePoDeliveryMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: (payload: { id: string; body: ReschedulePoDeliveryBody }) =>
      reschedulePoDeliverySchedule(getAccessToken(), payload.id, payload.body),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: poDeliverySchedulesQueryKey });
      await queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      await queryClient.invalidateQueries({ queryKey: ["goods-receipts"] });
      message.success(response.message || tNow("เลื่อนวันส่งแล้ว"));
    },
    onError: (error: Error) => {
      message.error(error instanceof ApiError ? error.message : tNow("เลื่อนวันส่งไม่สำเร็จ"));
    },
  });
}

export function useCancelPoReceivingMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: (payload: { id: string; body: CancelPoReceivingBody }) =>
      cancelPoRoundReceiving(getAccessToken(), payload.id, payload.body),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: poDeliverySchedulesQueryKey });
      await queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      await queryClient.invalidateQueries({ queryKey: ["goods-receipts"] });
      message.success(response.message || tNow("ยกเลิกการรับทั้งรอบแล้ว"));
    },
    onError: (error: Error) => {
      message.error(error instanceof ApiError ? error.message : tNow("ยกเลิกการรับไม่สำเร็จ"));
    },
  });
}

export function useClosePoRemainingMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: (payload: { id: string; body: CancelPoReceivingBody }) =>
      closePoRoundRemaining(getAccessToken(), payload.id, payload.body),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: poDeliverySchedulesQueryKey });
      await queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      await queryClient.invalidateQueries({ queryKey: ["goods-receipts"] });
      message.success(response.message || tNow("ยุติการรับสินค้าคงเหลือแล้ว"));
    },
    onError: (error: Error) => {
      message.error(error instanceof ApiError ? error.message : tNow("ยุติการรับไม่สำเร็จ"));
    },
  });
}
