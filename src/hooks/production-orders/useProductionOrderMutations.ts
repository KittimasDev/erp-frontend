"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { ApiError } from "@/lib/api/client";
import {
  addProductionOrderLog,
  allocateProductionOrderOutput,
  bulkCreateProductionOrders,
  cancelProductionOrder,
  completeProductionOrder,
  consolidatedCreateProductionOrder,
  createProductionOrder,
  endProductionOrderDowntime,
  pauseProductionOrder,
  recordProductionOrderDowntime,
  resumeProductionOrder,
  startProductionOrder,
} from "@/lib/api/production-orders";
import { getAccessToken } from "@/lib/auth/token";
import type {
  AllocateProductionOrderOutputBody,
  BulkCreateProductionOrdersBody,
  CancelProductionOrderBody,
  CompleteProductionOrderBody,
  CreateProductionOrderBody,
  CreateProductionOrderLogBody,
  EndDowntimeBody,
  PauseProductionOrderBody,
  RecordDowntimeBody,
  ResumeProductionOrderBody,
  StartProductionOrderBody,
} from "@/types/production-order";
import { productionRequestsQueryKey } from "../production-requests/useProductionRequestQueries";
import {
  productionOutputPendingTicketsQueryKey,
  productionOutputStockRequestsQueryKey,
} from "../production-output/useProductionOutputQueries";
import { productionOrdersQueryKey } from "./useProductionOrderQueries";

function useInvalidateProductionOrders() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: productionOrdersQueryKey }),
      queryClient.invalidateQueries({ queryKey: productionRequestsQueryKey }),
      queryClient.invalidateQueries({
        queryKey: productionOutputStockRequestsQueryKey,
      }),
      queryClient.invalidateQueries({
        queryKey: productionOutputPendingTicketsQueryKey,
      }),
    ]);
}

export function useCreateProductionOrderMutation() {
  const invalidate = useInvalidateProductionOrders();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: [...productionOrdersQueryKey, "create"],
    mutationFn: (body: CreateProductionOrderBody) =>
      createProductionOrder(getAccessToken(), body),
    onSuccess: async (response) => {
      await invalidate();
      message.success(response.message || "สร้างใบสั่งผลิตสำเร็จแล้ว");
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : "สร้างใบสั่งผลิตไม่สำเร็จ",
      );
    },
  });
}

export function useConsolidatedCreateProductionOrderMutation() {
  const invalidate = useInvalidateProductionOrders();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: [...productionOrdersQueryKey, "consolidated-create"],
    mutationFn: (body: BulkCreateProductionOrdersBody) =>
      consolidatedCreateProductionOrder(getAccessToken(), body),
    onSuccess: async (response) => {
      await invalidate();
      message.success(response.message || "สร้างใบสั่งผลิตรวมสำเร็จแล้ว");
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError
          ? error.message
          : "สร้างใบสั่งผลิตรวมไม่สำเร็จ",
      );
    },
  });
}

export function useAllocateProductionOrderOutputMutation() {
  const invalidate = useInvalidateProductionOrders();
  const { message, notification } = App.useApp();

  return useMutation({
    mutationKey: [...productionOrdersQueryKey, "allocate-output"],
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: AllocateProductionOrderOutputBody;
    }) => allocateProductionOrderOutput(getAccessToken(), id, body),
    onSuccess: async (response) => {
      await invalidate();
      message.success(response.message || "จัดสรรผลผลิตสำเร็จแล้ว");
      const failed = response.data.reserveResults.filter((row) => !row.reserved);
      if (failed.length) {
        notification.warning({
          title: "จองสต๊อกบางใบสั่งขายไม่สำเร็จ",
          description: failed
            .map((row) => `${row.salesOrderNo ?? row.salesOrderId}: ${row.message ?? "ไม่สำเร็จ"}`)
            .join(" · "),
        });
      }
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : "จัดสรรผลผลิตไม่สำเร็จ",
      );
    },
  });
}

export function useBulkCreateProductionOrdersMutation() {
  const invalidate = useInvalidateProductionOrders();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: [...productionOrdersQueryKey, "bulk-create"],
    mutationFn: (body: BulkCreateProductionOrdersBody) =>
      bulkCreateProductionOrders(getAccessToken(), body),
    onSuccess: async (response) => {
      await invalidate();
      message.success(response.message || "สร้างใบสั่งผลิตหลายใบสำเร็จแล้ว");
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError
          ? error.message
          : "สร้างใบสั่งผลิตหลายใบไม่สำเร็จ",
      );
    },
  });
}

export function useCancelProductionOrderMutation() {
  const invalidate = useInvalidateProductionOrders();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: [...productionOrdersQueryKey, "cancel"],
    mutationFn: ({ id, body }: { id: string; body?: CancelProductionOrderBody }) =>
      cancelProductionOrder(getAccessToken(), id, body),
    onSuccess: async (response) => {
      await invalidate();
      message.success(response.message || "ยกเลิกใบสั่งผลิตแล้ว");
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : "ยกเลิกไม่สำเร็จ",
      );
    },
  });
}

export function useStartProductionOrderMutation() {
  const invalidate = useInvalidateProductionOrders();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: [...productionOrdersQueryKey, "start"],
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body?: StartProductionOrderBody;
    }) => startProductionOrder(getAccessToken(), id, body),
    onSuccess: async (response) => {
      await invalidate();
      message.success(response.message || "เริ่มผลิตสำเร็จแล้ว");
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : "เริ่มผลิตไม่สำเร็จ",
      );
    },
  });
}

export function useCompleteProductionOrderMutation() {
  const invalidate = useInvalidateProductionOrders();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: [...productionOrdersQueryKey, "complete"],
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: CompleteProductionOrderBody;
    }) => completeProductionOrder(getAccessToken(), id, body),
    onSuccess: async (response) => {
      await invalidate();
      message.success(response.message || "ยืนยันเสร็จสิ้นการผลิตสำเร็จแล้ว");
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : "ยืนยันเสร็จสิ้นไม่สำเร็จ",
      );
    },
  });
}

export function usePauseProductionOrderMutation() {
  const invalidate = useInvalidateProductionOrders();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: [...productionOrdersQueryKey, "pause"],
    mutationFn: ({ id, body }: { id: string; body: PauseProductionOrderBody }) =>
      pauseProductionOrder(getAccessToken(), id, body),
    onSuccess: async (response) => {
      await invalidate();
      message.success(response.message || "หยุดเดินเครื่องชั่วคราวแล้ว");
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : "หยุดเดินเครื่องไม่สำเร็จ",
      );
    },
  });
}

export function useResumeProductionOrderMutation() {
  const invalidate = useInvalidateProductionOrders();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: [...productionOrdersQueryKey, "resume"],
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body?: ResumeProductionOrderBody;
    }) => resumeProductionOrder(getAccessToken(), id, body),
    onSuccess: async (response) => {
      await invalidate();
      message.success(response.message || "กลับมาเดินเครื่องแล้ว");
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : "กลับมาเดินเครื่องไม่สำเร็จ",
      );
    },
  });
}

export function useRecordProductionOrderDowntimeMutation() {
  const invalidate = useInvalidateProductionOrders();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: [...productionOrdersQueryKey, "downtime", "start"],
    mutationFn: ({ id, body }: { id: string; body: RecordDowntimeBody }) =>
      recordProductionOrderDowntime(getAccessToken(), id, body),
    onSuccess: async (response) => {
      await invalidate();
      message.success(response.message || "บันทึก Downtime สำเร็จแล้ว");
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : "บันทึก Downtime ไม่สำเร็จ",
      );
    },
  });
}

export function useEndProductionOrderDowntimeMutation() {
  const invalidate = useInvalidateProductionOrders();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: [...productionOrdersQueryKey, "downtime", "end"],
    mutationFn: ({
      id,
      downtimeId,
      body,
    }: {
      id: string;
      downtimeId: string;
      body: EndDowntimeBody;
    }) => endProductionOrderDowntime(getAccessToken(), id, downtimeId, body),
    onSuccess: async (response) => {
      await invalidate();
      message.success(response.message || "ปิดรายการ Downtime สำเร็จแล้ว");
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : "ปิดรายการไม่สำเร็จ",
      );
    },
  });
}

export function useAddProductionOrderLogMutation() {
  const invalidate = useInvalidateProductionOrders();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: [...productionOrdersQueryKey, "log"],
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: CreateProductionOrderLogBody;
    }) => addProductionOrderLog(getAccessToken(), id, body),
    onSuccess: async (response) => {
      await invalidate();
      message.success(response.message || "บันทึกข้อมูลการผลิตสำเร็จแล้ว");
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : "บันทึกไม่สำเร็จ",
      );
    },
  });
}
