"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { useT } from "@/lib/i18n/useT";
import {
  approveStockTransfer,
  cancelStockTransfer,
  createStockTransfer,
  updateStockTransfer,
} from "@/lib/api/stock-transfers";
import {
  confirmIncompatibleStorage,
  parseIncompatibleStorage,
} from "@/lib/chemicals/incompatible-storage";
import { getAccessToken } from "@/lib/auth/token";
import type {
  CreateStockTransferBody,
  UpdateStockTransferBody,
} from "@/types/stock-transfers";
import { stockTransfersQueryKey } from "./useStockTransfersQuery";

export function useCreateStockTransferMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const t = useT();

  return useMutation({
    mutationFn: (body: CreateStockTransferBody) =>
      createStockTransfer(getAccessToken(), body),
    onSuccess: (res) => {
      message.success(res.message || t("สร้างใบโอนย้ายสินค้าสำเร็จ"));
      void queryClient.invalidateQueries({ queryKey: stockTransfersQueryKey });
    },
    onError: (err: Error) => {
      message.error(err.message || t("สร้างใบโอนย้ายสินค้าไม่สำเร็จ"));
    },
  });
}

export function useUpdateStockTransferMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const t = useT();

  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: UpdateStockTransferBody;
    }) => updateStockTransfer(getAccessToken(), id, body),
    onSuccess: (res) => {
      message.success(res.message || t("บันทึกใบโอนย้ายสินค้าสำเร็จ"));
      void queryClient.invalidateQueries({ queryKey: stockTransfersQueryKey });
    },
    onError: (err: Error) => {
      message.error(err.message || t("บันทึกใบโอนย้ายสินค้าไม่สำเร็จ"));
    },
  });
}

export function useCancelStockTransferMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const t = useT();

  return useMutation({
    mutationFn: (id: string) => cancelStockTransfer(getAccessToken(), id),
    onSuccess: (res) => {
      message.success(res.message || t("ยกเลิกใบโอนย้ายสินค้าแล้ว"));
      void queryClient.invalidateQueries({ queryKey: stockTransfersQueryKey });
    },
    onError: (err: Error) => {
      message.error(err.message || t("ยกเลิกใบโอนย้ายสินค้าไม่สำเร็จ"));
    },
  });
}

export function useApproveStockTransferMutation() {
  const queryClient = useQueryClient();
  const { message, modal } = App.useApp();
  const t = useT();

  const mutation = useMutation({
    mutationFn: (vars: string | { id: string; acknowledge?: boolean }) => {
      const { id, acknowledge } =
        typeof vars === "string" ? { id: vars, acknowledge: false } : vars;
      return approveStockTransfer(getAccessToken(), id, acknowledge);
    },
    onSuccess: (res) => {
      message.success(res.message || t("อนุมัติและโอนย้ายสต๊อกสำเร็จ"));
      void queryClient.invalidateQueries({ queryKey: stockTransfersQueryKey });
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
      message.error(err.message || t("อนุมัติใบโอนย้ายสินค้าไม่สำเร็จ"));
    },
  });
  return mutation;
}
