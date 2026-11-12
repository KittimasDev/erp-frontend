"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { useT } from "@/lib/i18n/useT";
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
  const t = useT();

  return useMutation({
    mutationFn: ({
      purchaseOrderId,
      body,
    }: {
      purchaseOrderId: string;
      body: CreateGoodsReceiptFromPoBody;
    }) => createGoodsReceiptFromPo(getAccessToken(), purchaseOrderId, body),
    onSuccess: (res, vars) => {
      message.success(res.message || t("สร้างใบรับของสำเร็จ"));
      void queryClient.invalidateQueries({ queryKey: goodsReceiptsQueryKey });
      void queryClient.invalidateQueries({
        queryKey: [...goodsReceiptsQueryKey, "by-po", vars.purchaseOrderId],
      });
      void queryClient.invalidateQueries({ queryKey: purchaseOrdersQueryKey });
    },
    onError: (err: Error) => {
      message.error(err.message || t("สร้างใบรับของไม่สำเร็จ"));
    },
  });
}

export function useUpdateGoodsReceiptMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const t = useT();

  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: UpdateGoodsReceiptBody;
    }) => updateGoodsReceipt(getAccessToken(), id, body),
    onSuccess: (res) => {
      message.success(res.message || t("บันทึกใบรับของสำเร็จ"));
      void queryClient.invalidateQueries({ queryKey: goodsReceiptsQueryKey });
    },
    onError: (err: Error) => {
      message.error(err.message || t("บันทึกใบรับของไม่สำเร็จ"));
    },
  });
}

export function useConfirmGoodsReceiptMutation() {
  const queryClient = useQueryClient();
  const { message, modal } = App.useApp();
  const t = useT();

  const mutation = useMutation({
    mutationFn: (vars: string | { id: string; acknowledge?: boolean }) => {
      const { id, acknowledge } =
        typeof vars === "string" ? { id: vars, acknowledge: false } : vars;
      return confirmGoodsReceipt(getAccessToken(), id, acknowledge);
    },
    onSuccess: (res) => {
      message.success(res.message || t("Confirm ใบรับของสำเร็จ"));
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
      message.error(err.message || t("Confirm ใบรับของไม่สำเร็จ"));
    },
  });
  return mutation;
}

export function useCancelGoodsReceiptMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const t = useT();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      cancelGoodsReceipt(getAccessToken(), id, reason),
    onSuccess: (res) => {
      message.success(res.message || t("ยกเลิกใบรับของแล้ว"));
      void queryClient.invalidateQueries({ queryKey: goodsReceiptsQueryKey });
    },
    onError: (err: Error) => {
      message.error(err.message || t("ยกเลิกใบรับของไม่สำเร็จ"));
    },
  });
}
