"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { ApiError } from "@/lib/api/client";
import {
  cancelProductionRequest,
  createProductionRequest,
  updateProductionRequest,
} from "@/lib/api/production-requests";
import { getAccessToken } from "@/lib/auth/token";
import { tNow } from "@/lib/i18n/useT";
import type {
  CancelProductionRequestBody,
  CreateProductionRequestBody,
  UpdateProductionRequestBody,
} from "@/types/production-request";
import { productionRequestsQueryKey } from "./useProductionRequestQueries";

function useInvalidateProductionRequests() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: productionRequestsQueryKey });
}

export function useCreateProductionRequestMutation() {
  const invalidate = useInvalidateProductionRequests();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: [...productionRequestsQueryKey, "create"],
    mutationFn: (body: CreateProductionRequestBody) =>
      createProductionRequest(getAccessToken(), body),
    onSuccess: async (response) => {
      await invalidate();
      message.success(response.message || tNow("สร้างใบขอผลิตสำเร็จแล้ว"));
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : tNow("สร้างใบขอผลิตไม่สำเร็จ"),
      );
    },
  });
}

export function useUpdateProductionRequestMutation() {
  const invalidate = useInvalidateProductionRequests();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: [...productionRequestsQueryKey, "update"],
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: UpdateProductionRequestBody;
    }) => updateProductionRequest(getAccessToken(), id, body),
    onSuccess: async (response) => {
      await invalidate();
      message.success(response.message || tNow("แก้ไขใบขอผลิตสำเร็จแล้ว"));
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : tNow("แก้ไขใบขอผลิตไม่สำเร็จ"),
      );
    },
  });
}

export function useCancelProductionRequestMutation() {
  const invalidate = useInvalidateProductionRequests();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: [...productionRequestsQueryKey, "cancel"],
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: CancelProductionRequestBody;
    }) => cancelProductionRequest(getAccessToken(), id, body),
    onSuccess: async (response) => {
      await invalidate();
      message.success(response.message || tNow("ยกเลิกใบขอผลิตแล้ว"));
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : tNow("ยกเลิกไม่สำเร็จ"),
      );
    },
  });
}
