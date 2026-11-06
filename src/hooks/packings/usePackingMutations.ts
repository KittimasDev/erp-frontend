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
import { useT } from "@/lib/i18n/useT";

function useInvalidate() {
  const qc = useQueryClient();
  return async () => {
    await qc.invalidateQueries({ queryKey: packingsQueryKey });
    await qc.invalidateQueries({ queryKey: pickingsQueryKey });
    await invalidateSalesOrderFlowQueries(qc);
  };
}

export function useCreatePackingFromPickingMutation() {
  const t = useT();
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
      message.success(res.message || t("เปิดใบบรรจุแล้ว"));
    },
    onError: (e: Error) =>
      message.error(e instanceof ApiError ? e.message : t("สร้างไม่สำเร็จ")),
  });
}

export function useUpdatePackingMutation() {
  const t = useT();
  const { message } = App.useApp();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdatePackingBody }) =>
      updatePacking(getAccessToken(), id, body),
    onSuccess: async (res) => {
      await invalidate();
      message.success(res.message || t("บันทึกสำเร็จ"));
    },
    onError: (e: Error) =>
      message.error(e instanceof ApiError ? e.message : t("บันทึกไม่สำเร็จ")),
  });
}

export function useConfirmPackingMutation() {
  const t = useT();
  const { message } = App.useApp();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => confirmPacking(getAccessToken(), id),
    onSuccess: async (res) => {
      await invalidate();
      message.success(res.message || t("ยืนยันใบบรรจุสำเร็จ"));
    },
    onError: (e: Error) =>
      message.error(e instanceof ApiError ? e.message : t("ยืนยันไม่สำเร็จ")),
  });
}

export function useCancelPackingMutation() {
  const t = useT();
  const { message } = App.useApp();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => cancelPacking(getAccessToken(), id),
    onSuccess: async (res) => {
      await invalidate();
      message.success(res.message || t("ยกเลิกสำเร็จ"));
    },
    onError: (e: Error) =>
      message.error(e instanceof ApiError ? e.message : t("ยกเลิกไม่สำเร็จ")),
  });
}
