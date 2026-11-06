"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { useT } from "@/lib/i18n/useT";
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
  const t = useT();

  return useMutation({
    mutationFn: (body: CreateStockCountBody) =>
      createStockCount(getAccessToken(), body),
    onSuccess: (res) => {
      message.success(res.message || t("สร้างใบนับสต๊อกสำเร็จ"));
      void queryClient.invalidateQueries({ queryKey: stockCountsQueryKey });
    },
    onError: (err: Error) => {
      message.error(err.message || t("สร้างใบนับสต๊อกไม่สำเร็จ"));
    },
  });
}

export function useUpdateStockCountMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const t = useT();

  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateStockCountBody }) =>
      updateStockCount(getAccessToken(), id, body),
    onSuccess: (res) => {
      message.success(res.message || t("บันทึกใบนับสต๊อกสำเร็จ"));
      void queryClient.invalidateQueries({ queryKey: stockCountsQueryKey });
    },
    onError: (err: Error) => {
      message.error(err.message || t("บันทึกใบนับสต๊อกไม่สำเร็จ"));
    },
  });
}

export function useCancelStockCountMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const t = useT();

  return useMutation({
    mutationFn: (id: string) => cancelStockCount(getAccessToken(), id),
    onSuccess: (res) => {
      message.success(res.message || t("ยกเลิกใบนับสต๊อกแล้ว"));
      void queryClient.invalidateQueries({ queryKey: stockCountsQueryKey });
    },
    onError: (err: Error) => {
      message.error(err.message || t("ยกเลิกใบนับสต๊อกไม่สำเร็จ"));
    },
  });
}

export function useApproveStockCountMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const t = useT();

  return useMutation({
    mutationFn: (id: string) => approveStockCount(getAccessToken(), id),
    onSuccess: (res) => {
      message.success(res.message || t("อนุมัติและปรับปรุงสต๊อกสำเร็จ"));
      void queryClient.invalidateQueries({ queryKey: stockCountsQueryKey });
    },
    onError: (err: Error) => {
      message.error(err.message || t("อนุมัติใบนับสต๊อกไม่สำเร็จ"));
    },
  });
}
