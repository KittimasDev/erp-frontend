"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import {
  activateWarehouse,
  deactivateWarehouse,
} from "@/lib/api/warehouses";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token";
import { warehousesQueryKey } from "./useWarehousesQuery";

export function useActivateWarehouseMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: ["warehouses", "activate"],
    mutationFn: (id: string) => activateWarehouse(getAccessToken(), id),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: warehousesQueryKey });
      message.success(response.message || "เปิดใช้งานคลังสินค้าสำเร็จแล้ว");
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError
          ? error.message
          : "เปิดใช้งานคลังสินค้าไม่สำเร็จ",
      );
    },
  });
}

export function useDeactivateWarehouseMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: ["warehouses", "deactivate"],
    mutationFn: (id: string) => deactivateWarehouse(getAccessToken(), id),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: warehousesQueryKey });
      message.success(response.message || "ปิดใช้งานคลังสินค้าสำเร็จแล้ว");
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError
          ? error.message
          : "ปิดใช้งานคลังสินค้าไม่สำเร็จ",
      );
    },
  });
}
