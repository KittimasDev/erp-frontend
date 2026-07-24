"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import {
  cancelPicking,
  confirmPicking,
  createPickingFromSalesOrder,
  updatePicking,
} from "@/lib/api/pickings";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token";
import type {
  CreatePickingFromSalesOrderBody,
  UpdatePickingBody,
} from "@/types/pickings";
import { salesOrdersQueryKey } from "@/hooks/sales-orders/useSalesOrdersQuery";

import { pickingsQueryKey } from "./usePickingsQuery";

function useInvalidate() {
  const qc = useQueryClient();
  return async () => {
    await qc.invalidateQueries({ queryKey: pickingsQueryKey });
    await qc.invalidateQueries({ queryKey: salesOrdersQueryKey });
  };
}

export function useCreatePickingFromSalesOrderMutation() {
  const { message } = App.useApp();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({
      salesOrderId,
      body,
    }: {
      salesOrderId: string;
      body?: CreatePickingFromSalesOrderBody;
    }) =>
      createPickingFromSalesOrder(getAccessToken(), salesOrderId, body),
    onSuccess: async (res) => {
      await invalidate();
      message.success(res.message || "สร้างใบจ่ายสินค้าสำเร็จ");
    },
    onError: (e: Error) =>
      message.error(e instanceof ApiError ? e.message : "สร้างไม่สำเร็จ"),
  });
}

export function useUpdatePickingMutation() {
  const { message } = App.useApp();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdatePickingBody }) =>
      updatePicking(getAccessToken(), id, body),
    onSuccess: async (res) => {
      await invalidate();
      message.success(res.message || "บันทึกสำเร็จ");
    },
    onError: (e: Error) =>
      message.error(e instanceof ApiError ? e.message : "บันทึกไม่สำเร็จ"),
  });
}

export function useConfirmPickingMutation() {
  const { message } = App.useApp();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => confirmPicking(getAccessToken(), id),
    onSuccess: async (res) => {
      await invalidate();
      message.success(res.message || "ยืนยันและตัดสต๊อกสำเร็จ");
    },
    onError: (e: Error) =>
      message.error(e instanceof ApiError ? e.message : "ยืนยันไม่สำเร็จ"),
  });
}

export function useCancelPickingMutation() {
  const { message } = App.useApp();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => cancelPicking(getAccessToken(), id),
    onSuccess: async (res) => {
      await invalidate();
      message.success(res.message || "ยกเลิกสำเร็จ");
    },
    onError: (e: Error) =>
      message.error(e instanceof ApiError ? e.message : "ยกเลิกไม่สำเร็จ"),
  });
}
