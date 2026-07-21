"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import {
  approveStockCount,
  cancelStockCount,
  createStockCount,
  updateStockCount,
} from "@/lib/api/stock-counts";
import { getAccessToken } from "@/lib/auth/token";
import type { CreateStockCountBody, UpdateStockCountBody } from "@/types/stock-counts";
import { stockCountsQueryKey } from "./useStockCountsQuery";

export function useCreateStockCountMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: (body: CreateStockCountBody) =>
      createStockCount(getAccessToken(), body),
    onSuccess: (res) => {
      message.success(res.message || "สร้างใบนับสต๊อกสำเร็จ");
      void queryClient.invalidateQueries({ queryKey: stockCountsQueryKey });
    },
    onError: (err: Error) => {
      message.error(err.message || "สร้างใบนับสต๊อกไม่สำเร็จ");
    },
  });
}

export function useUpdateStockCountMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateStockCountBody }) =>
      updateStockCount(getAccessToken(), id, body),
    onSuccess: (res) => {
      message.success(res.message || "บันทึกใบนับสต๊อกสำเร็จ");
      void queryClient.invalidateQueries({ queryKey: stockCountsQueryKey });
    },
    onError: (err: Error) => {
      message.error(err.message || "บันทึกใบนับสต๊อกไม่สำเร็จ");
    },
  });
}

export function useCancelStockCountMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: (id: string) => cancelStockCount(getAccessToken(), id),
    onSuccess: (res) => {
      message.success(res.message || "ยกเลิกใบนับสต๊อกแล้ว");
      void queryClient.invalidateQueries({ queryKey: stockCountsQueryKey });
    },
    onError: (err: Error) => {
      message.error(err.message || "ยกเลิกใบนับสต๊อกไม่สำเร็จ");
    },
  });
}

export function useApproveStockCountMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: (id: string) => approveStockCount(getAccessToken(), id),
    onSuccess: (res) => {
      message.success(res.message || "อนุมัติและปรับปรุงสต๊อกสำเร็จ");
      void queryClient.invalidateQueries({ queryKey: stockCountsQueryKey });
    },
    onError: (err: Error) => {
      message.error(err.message || "อนุมัติใบนับสต๊อกไม่สำเร็จ");
    },
  });
}
