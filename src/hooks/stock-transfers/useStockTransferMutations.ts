"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import {
  approveStockTransfer,
  cancelStockTransfer,
  createStockTransfer,
  updateStockTransfer,
} from "@/lib/api/stock-transfers";
import { getAccessToken } from "@/lib/auth/token";
import type {
  CreateStockTransferBody,
  UpdateStockTransferBody,
} from "@/types/stock-transfers";
import { stockTransfersQueryKey } from "./useStockTransfersQuery";

export function useCreateStockTransferMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: (body: CreateStockTransferBody) =>
      createStockTransfer(getAccessToken(), body),
    onSuccess: (res) => {
      message.success(res.message || "สร้างใบโอนย้ายสินค้าสำเร็จ");
      void queryClient.invalidateQueries({ queryKey: stockTransfersQueryKey });
    },
    onError: (err: Error) => {
      message.error(err.message || "สร้างใบโอนย้ายสินค้าไม่สำเร็จ");
    },
  });
}

export function useUpdateStockTransferMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: UpdateStockTransferBody;
    }) => updateStockTransfer(getAccessToken(), id, body),
    onSuccess: (res) => {
      message.success(res.message || "บันทึกใบโอนย้ายสินค้าสำเร็จ");
      void queryClient.invalidateQueries({ queryKey: stockTransfersQueryKey });
    },
    onError: (err: Error) => {
      message.error(err.message || "บันทึกใบโอนย้ายสินค้าไม่สำเร็จ");
    },
  });
}

export function useCancelStockTransferMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: (id: string) => cancelStockTransfer(getAccessToken(), id),
    onSuccess: (res) => {
      message.success(res.message || "ยกเลิกใบโอนย้ายสินค้าแล้ว");
      void queryClient.invalidateQueries({ queryKey: stockTransfersQueryKey });
    },
    onError: (err: Error) => {
      message.error(err.message || "ยกเลิกใบโอนย้ายสินค้าไม่สำเร็จ");
    },
  });
}

export function useApproveStockTransferMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: (id: string) => approveStockTransfer(getAccessToken(), id),
    onSuccess: (res) => {
      message.success(res.message || "อนุมัติและโอนย้ายสต๊อกสำเร็จ");
      void queryClient.invalidateQueries({ queryKey: stockTransfersQueryKey });
    },
    onError: (err: Error) => {
      message.error(err.message || "อนุมัติใบโอนย้ายสินค้าไม่สำเร็จ");
    },
  });
}
