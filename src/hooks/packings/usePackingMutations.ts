"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import {
  cancelPacking,
  confirmPacking,
  createPackingFromPicking,
  updatePacking,
} from "@/lib/api/packings";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token";
import type {
  CreatePackingFromPickingBody,
  UpdatePackingBody,
} from "@/types/packings";
import { invalidateSalesOrderFlowQueries } from "@/hooks/sales-orders/invalidate-sales-order-flow";
import { pickingsQueryKey } from "@/hooks/pickings/usePickingsQuery";

import { packingsQueryKey } from "./usePackingsQuery";

function useInvalidate() {
  const qc = useQueryClient();
  return async () => {
    await qc.invalidateQueries({ queryKey: packingsQueryKey });
    await qc.invalidateQueries({ queryKey: pickingsQueryKey });
    await invalidateSalesOrderFlowQueries(qc);
  };
}

export function useCreatePackingFromPickingMutation() {
  const { message } = App.useApp();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({
      pickingId,
      body,
    }: {
      pickingId: string;
      body?: CreatePackingFromPickingBody;
    }) => createPackingFromPicking(getAccessToken(), pickingId, body),
    onSuccess: async (res) => {
      await invalidate();
      message.success(res.message || "เปิดใบบรรจุแล้ว");
    },
    onError: (e: Error) =>
      message.error(e instanceof ApiError ? e.message : "สร้างไม่สำเร็จ"),
  });
}

export function useUpdatePackingMutation() {
  const { message } = App.useApp();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdatePackingBody }) =>
      updatePacking(getAccessToken(), id, body),
    onSuccess: async (res) => {
      await invalidate();
      message.success(res.message || "บันทึกสำเร็จ");
    },
    onError: (e: Error) =>
      message.error(e instanceof ApiError ? e.message : "บันทึกไม่สำเร็จ"),
  });
}

export function useConfirmPackingMutation() {
  const { message } = App.useApp();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => confirmPacking(getAccessToken(), id),
    onSuccess: async (res) => {
      await invalidate();
      message.success(res.message || "ยืนยันใบบรรจุสำเร็จ");
    },
    onError: (e: Error) =>
      message.error(e instanceof ApiError ? e.message : "ยืนยันไม่สำเร็จ"),
  });
}

export function useCancelPackingMutation() {
  const { message } = App.useApp();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => cancelPacking(getAccessToken(), id),
    onSuccess: async (res) => {
      await invalidate();
      message.success(res.message || "ยกเลิกสำเร็จ");
    },
    onError: (e: Error) =>
      message.error(e instanceof ApiError ? e.message : "ยกเลิกไม่สำเร็จ"),
  });
}
