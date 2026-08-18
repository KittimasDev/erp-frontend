"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import {
  approveStockPostingRequest,
  createStockPostingRequest,
  rejectStockPostingRequest,
} from "@/lib/api/stock-posting-requests";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token";
import type {
  ApproveStockPostingRequestBody,
  CreateStockPostingRequestBody,
  RejectStockPostingRequestBody,
} from "@/types/stock-posting-request";
import { stockPostingRequestsQueryKey } from "./useStockPostingQueries";

export function useCreateStockPostingRequestMutation(receiptId: string) {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: ["stock-posting-requests", "create", receiptId],
    mutationFn: (body: CreateStockPostingRequestBody) =>
      createStockPostingRequest(getAccessToken(), receiptId, body),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({
        queryKey: stockPostingRequestsQueryKey,
      });
      message.success(response.message || "ส่งคำขอรับเข้าคลังสำเร็จแล้ว");
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError
          ? error.message
          : "ส่งคำขอรับเข้าคลังไม่สำเร็จ",
      );
    },
  });
}

export function useApproveStockPostingRequestMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: ["stock-posting-requests", "approve"],
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body?: ApproveStockPostingRequestBody;
    }) => approveStockPostingRequest(getAccessToken(), id, body),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({
        queryKey: stockPostingRequestsQueryKey,
      });
      message.success(response.message || "อนุมัติรับเข้าคลังสำเร็จแล้ว");
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : "อนุมัติไม่สำเร็จ",
      );
    },
  });
}

export function useRejectStockPostingRequestMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: ["stock-posting-requests", "reject"],
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: RejectStockPostingRequestBody;
    }) => rejectStockPostingRequest(getAccessToken(), id, body),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({
        queryKey: stockPostingRequestsQueryKey,
      });
      message.success(response.message || "ไม่อนุมัติคำขอแล้ว");
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : "ไม่อนุมัติไม่สำเร็จ",
      );
    },
  });
}
