"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import {
  completeWeighAndReceipt,
  createPurchaseReceiptFromTicket,
  saveClassificationPlan,
  weighInWeighbridgeTicket,
  weighOutWeighbridgeTicket,
} from "@/lib/api/weighbridge-tickets";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token";
import type {
  CompleteWeighAndReceiptRequest,
  SaveClassificationPlanRequest,
  WeighTicketRequest,
} from "@/types/weighbridge-tickets";
import { weighbridgeTicketQueryKey } from "./useWeighbridgeTicketQuery";
import { weighbridgeDashboardQueryKey } from "./useWeighbridgeDashboardQuery";
import { ticketClassificationQueryKey } from "@/hooks/raw-tire-classification/useTicketClassificationQuery";
import { rawTirePurchaseReceiptQueryKey } from "@/hooks/raw-tire-purchase/useRawTirePurchaseReceiptQuery";

function invalidateAfterWeigh(
  queryClient: ReturnType<typeof useQueryClient>,
  ticketId: string,
) {
  return Promise.all([
    queryClient.invalidateQueries({
      queryKey: [...weighbridgeTicketQueryKey, ticketId],
    }),
    queryClient.invalidateQueries({
      queryKey: weighbridgeDashboardQueryKey,
    }),
    queryClient.invalidateQueries({
      queryKey: [...ticketClassificationQueryKey, ticketId],
    }),
    queryClient.invalidateQueries({
      queryKey: rawTirePurchaseReceiptQueryKey,
    }),
  ]);
}

export function useSaveClassificationPlanMutation(ticketId: string) {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: ["weighbridge", "tickets", ticketId, "classification-plan"],
    mutationFn: (payload: SaveClassificationPlanRequest) =>
      saveClassificationPlan(getAccessToken(), ticketId, payload),
    onSuccess: async (response) => {
      await invalidateAfterWeigh(queryClient, ticketId);
      message.success(response.message || "บันทึกแผนคัดแยกสำเร็จแล้ว");
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError
          ? error.message
          : "บันทึกแผนคัดแยกไม่สำเร็จ",
      );
    },
  });
}

export function useCompleteWeighAndReceiptMutation(ticketId: string) {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: [
      "weighbridge",
      "tickets",
      ticketId,
      "complete-weigh-and-receipt",
    ],
    mutationFn: (payload: CompleteWeighAndReceiptRequest) =>
      completeWeighAndReceipt(getAccessToken(), ticketId, payload),
    onSuccess: async (response) => {
      await invalidateAfterWeigh(queryClient, ticketId);
      message.success(
        response.message || "บันทึกน้ำหนักและยืนยันใบรับซื้อสำเร็จแล้ว",
      );
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError
          ? error.message
          : "บันทึกน้ำหนักและยืนยันใบรับซื้อไม่สำเร็จ",
      );
    },
  });
}

export function useWeighInMutation(ticketId: string) {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: ["weighbridge", "tickets", ticketId, "weigh-in"],
    mutationFn: (payload: WeighTicketRequest) =>
      weighInWeighbridgeTicket(getAccessToken(), ticketId, payload),
    onSuccess: async (response) => {
      await invalidateAfterWeigh(queryClient, ticketId);
      message.success(response.message || "บันทึกชั่งเข้าสำเร็จแล้ว");
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : "บันทึกชั่งเข้าไม่สำเร็จ",
      );
    },
  });
}

export function useWeighOutMutation(ticketId: string) {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: ["weighbridge", "tickets", ticketId, "weigh-out"],
    mutationFn: (payload: WeighTicketRequest) =>
      weighOutWeighbridgeTicket(getAccessToken(), ticketId, payload),
    onSuccess: async (response) => {
      await invalidateAfterWeigh(queryClient, ticketId);
      message.success(response.message || "บันทึกชั่งออกสำเร็จแล้ว");
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : "บันทึกชั่งออกไม่สำเร็จ",
      );
    },
  });
}

export function useCreatePurchaseReceiptFromTicketMutation(ticketId: string) {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: [
      "weighbridge",
      "tickets",
      ticketId,
      "create-purchase-receipt",
    ],
    mutationFn: (payload?: {
      tireClassificationId?: string;
      remark?: string;
    }) =>
      createPurchaseReceiptFromTicket(getAccessToken(), ticketId, payload),
    onSuccess: async (response) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: [...weighbridgeTicketQueryKey, ticketId],
        }),
        queryClient.invalidateQueries({
          queryKey: weighbridgeDashboardQueryKey,
        }),
      ]);
      message.success(response.message || "สร้างใบรับซื้อยางสำเร็จแล้ว");
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError
          ? error.message
          : "สร้างใบรับซื้อยางไม่สำเร็จ",
      );
    },
  });
}
