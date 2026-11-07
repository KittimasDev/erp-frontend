"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { useT } from "@/lib/i18n/useT";

import {
  approveProductionOutputStockRequest,
  cancelProductionOutputStockRequest,
  createProductionOutputStockRequestBatch,
  createProductionOutputStockRequestFromOrder,
  rejectProductionOutputStockRequest,
} from "@/lib/api/production-output-stock-requests";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token";
import type {
  CreateProductionOutputStockRequestBatchBody,
  CreateProductionOutputStockRequestBody,
  CreateProductionOutputStockRequestFromOrderBody,
  RejectProductionOutputStockRequestBody,
} from "@/types/production-output-stock-request";
import { productionOutputPendingTicketsQueryKey } from "./useProductionOutputQueries";
import { productionOutputStockRequestsQueryKey } from "./useProductionOutputQueries";

export function useCreateProductionOutputStockRequestMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const t = useT();

  return useMutation({
    mutationKey: ["production-output", "stock-requests", "create"],
    mutationFn: async (
      input:
        | CreateProductionOutputStockRequestBody
        | CreateProductionOutputStockRequestBatchBody
        | CreateProductionOutputStockRequestBody[],
    ) => {
      const body: CreateProductionOutputStockRequestBatchBody = Array.isArray(
        input,
      )
        ? { items: input }
        : "items" in input
          ? input
          : { items: [input] };
      const response = await createProductionOutputStockRequestBatch(
        getAccessToken(),
        body,
      );
      return {
        count: response.data.length,
        message:
          response.message ||
          (response.data.length > 1
            ? t("สร้างคำขอรับผลผลิต {n} รายการสำเร็จแล้ว", { n: response.data.length })
            : t("สร้างคำขอรับผลผลิตเข้าคลังสำเร็จแล้ว")),
        data: response.data,
      };
    },
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({
        queryKey: productionOutputStockRequestsQueryKey,
      });
      await queryClient.invalidateQueries({
        queryKey: productionOutputPendingTicketsQueryKey,
      });
      message.success(response.message);
    },
    onError: (error) => {
      message.error(
        error instanceof ApiError
          ? error.message
          : t("สร้างคำขอรับผลผลิตไม่สำเร็จ"),
      );
    },
  });
}

export function useCreateProductionOutputStockRequestFromOrderMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const t = useT();

  return useMutation({
    mutationKey: ["production-output", "stock-requests", "from-order"],
    mutationFn: ({
      productionOrderId,
      body,
    }: {
      productionOrderId: string;
      body: CreateProductionOutputStockRequestFromOrderBody;
    }) =>
      createProductionOutputStockRequestFromOrder(
        getAccessToken(),
        productionOrderId,
        body,
      ),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({
        queryKey: productionOutputStockRequestsQueryKey,
      });
      await queryClient.invalidateQueries({
        queryKey: ["production-orders"],
      });
      const count = response.data.length;
      message.success(
        response.message ||
          (count > 1
            ? t("สร้างคำขอรับผลผลิต {n} รายการสำเร็จแล้ว", { n: count })
            : t("สร้างคำขอรับผลผลิตเข้าคลังสำเร็จแล้ว")),
      );
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError
          ? error.message
          : t("สร้างคำขอรับผลผลิตไม่สำเร็จ"),
      );
    },
  });
}

export function useCancelProductionOutputStockRequestMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const t = useT();

  return useMutation({
    mutationKey: ["production-output", "stock-requests", "cancel"],
    mutationFn: (id: string) =>
      cancelProductionOutputStockRequest(getAccessToken(), id),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({
        queryKey: productionOutputStockRequestsQueryKey,
      });
      message.success(response.message || t("ยกเลิกคำขอแล้ว"));
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : t("ยกเลิกคำขอไม่สำเร็จ"),
      );
    },
  });
}

export function useApproveProductionOutputStockRequestMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const t = useT();

  return useMutation({
    mutationKey: ["production-output", "stock-requests", "approve"],
    mutationFn: (id: string) =>
      approveProductionOutputStockRequest(getAccessToken(), id),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({
        queryKey: productionOutputStockRequestsQueryKey,
      });
      message.success(
        response.message || t("อนุมัติและรับผลผลิตเข้าคลังสำเร็จแล้ว"),
      );
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : t("อนุมัติไม่สำเร็จ"),
      );
    },
  });
}

export function useRejectProductionOutputStockRequestMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const t = useT();

  return useMutation({
    mutationKey: ["production-output", "stock-requests", "reject"],
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: RejectProductionOutputStockRequestBody;
    }) => rejectProductionOutputStockRequest(getAccessToken(), id, body),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({
        queryKey: productionOutputStockRequestsQueryKey,
      });
      message.success(response.message || t("ไม่อนุมัติคำขอแล้ว"));
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : t("ไม่อนุมัติไม่สำเร็จ"),
      );
    },
  });
}
