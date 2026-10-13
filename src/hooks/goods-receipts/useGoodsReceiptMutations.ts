"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import {
  cancelGoodsReceipt,
  confirmGoodsReceipt,
  createGoodsReceiptFromPo,
  updateGoodsReceipt,
} from "@/lib/api/goods-receipts";
import {
  confirmIncompatibleStorage,
  parseIncompatibleStorage,
} from "@/lib/chemicals/incompatible-storage";
import { getAccessToken } from "@/lib/auth/token";
import type {
  CreateGoodsReceiptFromPoBody,
  UpdateGoodsReceiptBody,
} from "@/types/goods-receipts";
import { goodsReceiptsQueryKey } from "./useGoodsReceiptsQuery";
import { purchaseOrdersQueryKey } from "../purchase-orders/usePurchaseOrdersQuery";
import { purchasePaymentsQueryKey } from "../purchase-payments/usePurchasePaymentsQuery";

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
  const { message, modal } = App.useApp();

  const mutation = useMutation({
    mutationFn: (vars: string | { id: string; acknowledge?: boolean }) => {
      const { id, acknowledge } =
        typeof vars === "string" ? { id: vars, acknowledge: false } : vars;
      return confirmGoodsReceipt(getAccessToken(), id, acknowledge);
    },
    onSuccess: (res) => {
      message.success(res.message || "Confirm ใบรับของสำเร็จ");
      void queryClient.invalidateQueries({ queryKey: goodsReceiptsQueryKey });
      void queryClient.invalidateQueries({ queryKey: purchaseOrdersQueryKey });
      void queryClient.invalidateQueries({ queryKey: purchasePaymentsQueryKey });
    },
    onError: (err: Error, vars) => {
      // สารเคมีที่เก็บตำแหน่งเดียวกันไม่ได้ → ให้ผู้ใช้รับทราบแล้วยิงซ้ำ (M9.3)
      const conflicts = parseIncompatibleStorage(err);
      if (conflicts) {
        const id = typeof vars === "string" ? vars : vars.id;
        confirmIncompatibleStorage(modal, conflicts, () =>
          mutation.mutate({ id, acknowledge: true }),
        );
        return;
      }
      message.error(err.message || "Confirm ใบรับของไม่สำเร็จ");
    },
  });
  return mutation;
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
