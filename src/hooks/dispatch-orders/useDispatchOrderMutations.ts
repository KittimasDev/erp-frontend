"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import {
  cancelDispatchOrder,
  confirmPickingDispatchOrder,
  createDispatchOrder,
  dispatchDispatchOrder,
  packDispatchOrder,
} from "@/lib/api/dispatch-orders";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token";
import type {
  CreateDispatchOrderBody,
  DeliverDispatchOrderBody,
} from "@/types/dispatch-orders";

import { dispatchOrdersQueryKey } from "./useDispatchOrdersQuery";
import { salesOrdersQueryKey } from "@/hooks/sales-orders/useSalesOrdersQuery";

function useInvalidateDispatchOrders() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: dispatchOrdersQueryKey });
}

export function useCreateDispatchOrderMutation() {
  const { message } = App.useApp();
  const invalidate = useInvalidateDispatchOrders();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [...dispatchOrdersQueryKey, "create"],
    mutationFn: (body: CreateDispatchOrderBody) =>
      createDispatchOrder(getAccessToken(), body),
    onSuccess: async (res) => {
      await invalidate();
      await queryClient.invalidateQueries({ queryKey: salesOrdersQueryKey });
      message.success(res.message || "สร้างใบจ่ายสินค้าสำเร็จ");
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : "สร้างใบจ่ายสินค้าไม่สำเร็จ",
      );
    },
  });
}

export function useConfirmPickingDispatchOrderMutation() {
  const { message } = App.useApp();
  const invalidate = useInvalidateDispatchOrders();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [...dispatchOrdersQueryKey, "confirm-picking"],
    mutationFn: (id: string) => confirmPickingDispatchOrder(getAccessToken(), id),
    onSuccess: async (res) => {
      await invalidate();
      await queryClient.invalidateQueries({ queryKey: salesOrdersQueryKey });
      message.success(res.message || "ยืนยันการหยิบสินค้าสำเร็จ");
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : "ยืนยันการหยิบสินค้าไม่สำเร็จ",
      );
    },
  });
}

export function usePackDispatchOrderMutation() {
  const { message } = App.useApp();
  const invalidate = useInvalidateDispatchOrders();

  return useMutation({
    mutationKey: [...dispatchOrdersQueryKey, "pack"],
    mutationFn: (id: string) => packDispatchOrder(getAccessToken(), id),
    onSuccess: async (res) => {
      await invalidate();
      message.success(res.message || "ยืนยันแพ็คสินค้าสำเร็จ");
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : "แพ็คสินค้าไม่สำเร็จ",
      );
    },
  });
}

export function useCancelDispatchOrderMutation() {
  const { message } = App.useApp();
  const invalidate = useInvalidateDispatchOrders();

  return useMutation({
    mutationKey: [...dispatchOrdersQueryKey, "cancel"],
    mutationFn: (id: string) => cancelDispatchOrder(getAccessToken(), id),
    onSuccess: async (res) => {
      await invalidate();
      message.success(res.message || "ยกเลิกใบจ่ายสินค้าสำเร็จ");
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : "ยกเลิกใบจ่ายสินค้าไม่สำเร็จ",
      );
    },
  });
}

export function useDispatchDispatchOrderMutation() {
  const { message } = App.useApp();
  const invalidate = useInvalidateDispatchOrders();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [...dispatchOrdersQueryKey, "dispatch"],
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body?: DeliverDispatchOrderBody;
    }) => dispatchDispatchOrder(getAccessToken(), id, body),
    onSuccess: async (res) => {
      await invalidate();
      await queryClient.invalidateQueries({ queryKey: salesOrdersQueryKey });
      message.success(res.message || "ยืนยันจ่ายสินค้าออกสำเร็จ");
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : "จ่ายสินค้าออกไม่สำเร็จ",
      );
    },
  });
}
