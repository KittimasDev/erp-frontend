"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { useT } from "@/lib/i18n/useT";
import {
  approveStockIssue,
  cancelStockIssue,
  createStockIssue,
  updateStockIssue,
} from "@/lib/api/stock-issues";
import { getAccessToken } from "@/lib/auth/token";
import type {
  CreateStockIssueBody,
  UpdateStockIssueBody,
} from "@/types/stock-issues";
import { stockIssuesQueryKey } from "./useStockIssuesQuery";
import { notificationsQueryKey } from "@/hooks/notifications/useNotificationsQueries";
import { inventoryQueryKey } from "@/hooks/inventory/useInventoryQueries";

export function useCreateStockIssueMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const t = useT();

  return useMutation({
    mutationFn: (body: CreateStockIssueBody) =>
      createStockIssue(getAccessToken(), body),
    onSuccess: (res) => {
      message.success(res.message || t("สร้างใบเบิกของสำเร็จ"));
      void queryClient.invalidateQueries({ queryKey: stockIssuesQueryKey });
    },
    onError: (err: Error) => {
      message.error(err.message || t("สร้างใบเบิกของไม่สำเร็จ"));
    },
  });
}

export function useUpdateStockIssueMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const t = useT();

  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateStockIssueBody }) =>
      updateStockIssue(getAccessToken(), id, body),
    onSuccess: (res) => {
      message.success(res.message || t("บันทึกใบเบิกของสำเร็จ"));
      void queryClient.invalidateQueries({ queryKey: stockIssuesQueryKey });
    },
    onError: (err: Error) => {
      message.error(err.message || t("บันทึกใบเบิกของไม่สำเร็จ"));
    },
  });
}

export function useCancelStockIssueMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const t = useT();

  return useMutation({
    mutationFn: (id: string) => cancelStockIssue(getAccessToken(), id),
    onSuccess: (res) => {
      message.success(res.message || t("ยกเลิกใบเบิกของแล้ว"));
      void queryClient.invalidateQueries({ queryKey: stockIssuesQueryKey });
    },
    onError: (err: Error) => {
      message.error(err.message || t("ยกเลิกใบเบิกของไม่สำเร็จ"));
    },
  });
}

export function useApproveStockIssueMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const t = useT();

  return useMutation({
    mutationFn: (id: string) => approveStockIssue(getAccessToken(), id),
    onSuccess: (res) => {
      message.success(res.message || t("อนุมัติและตัดสต๊อกสำเร็จ"));
      void queryClient.invalidateQueries({ queryKey: stockIssuesQueryKey });
      void queryClient.invalidateQueries({ queryKey: notificationsQueryKey });
      void queryClient.invalidateQueries({ queryKey: inventoryQueryKey });
    },
    onError: (err: Error) => {
      message.error(err.message || t("อนุมัติใบเบิกของไม่สำเร็จ"));
    },
  });
}
