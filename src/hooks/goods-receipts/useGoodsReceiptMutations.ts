"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import {
  cancelGoodsReceipt,
  confirmGoodsReceipt,
  createGoodsReceiptFromPo,
  updateGoodsReceipt,
} from "@/lib/api/goods-receipts";
import { getAccessToken } from "@/lib/auth/token";
import type {
  CreateGoodsReceiptFromPoBody,
  UpdateGoodsReceiptBody,
} from "@/types/goods-receipts";
import { goodsReceiptsQueryKey } from "./useGoodsReceiptsQuery";
import { purchaseOrdersQueryKey } from "../purchase-orders/usePurchaseOrdersQuery";

export function useCreateGoodsReceiptFromPoMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: ({
      purchaseOrderId,
      body,
    }: {
      purchaseOrderId: string;
      body: CreateGoodsReceiptFromPoBody;
    }) => createGoodsReceiptFromPo(getAccessToken(), purchaseOrderId, body),
    onSuccess: (res, vars) => {
      message.success(res.message || "สร้างใบรับของสำเร็จ");
      void queryClient.invalidateQueries({ queryKey: goodsReceiptsQueryKey });
      void queryClient.invalidateQueries({
        queryKey: [...goodsReceiptsQueryKey, "by-po", vars.purchaseOrderId],
      });
      void queryClient.invalidateQueries({ queryKey: purchaseOrdersQueryKey });
    },
    onError: (err: Error) => {
      message.error(err.message || "สร้างใบรับของไม่สำเร็จ");
    },
  });
}

export function useUpdateGoodsReceiptMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: UpdateGoodsReceiptBody;
    }) => updateGoodsReceipt(getAccessToken(), id, body),
    onSuccess: (res) => {
      message.success(res.message || "บันทึกใบรับของสำเร็จ");
      void queryClient.invalidateQueries({ queryKey: goodsReceiptsQueryKey });
    },
    onError: (err: Error) => {
      message.error(err.message || "บันทึกใบรับของไม่สำเร็จ");
    },
  });
}

export function useConfirmGoodsReceiptMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: (id: string) => confirmGoodsReceipt(getAccessToken(), id),
    onSuccess: (res) => {
      message.success(res.message || "Confirm ใบรับของสำเร็จ");
      void queryClient.invalidateQueries({ queryKey: goodsReceiptsQueryKey });
      void queryClient.invalidateQueries({ queryKey: purchaseOrdersQueryKey });
    },
    onError: (err: Error) => {
      message.error(err.message || "Confirm ใบรับของไม่สำเร็จ");
    },
  });
}

export function useCancelGoodsReceiptMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: (id: string) => cancelGoodsReceipt(getAccessToken(), id),
    onSuccess: (res) => {
      message.success(res.message || "ยกเลิกใบรับของแล้ว");
      void queryClient.invalidateQueries({ queryKey: goodsReceiptsQueryKey });
    },
    onError: (err: Error) => {
      message.error(err.message || "ยกเลิกใบรับของไม่สำเร็จ");
    },
  });
}
