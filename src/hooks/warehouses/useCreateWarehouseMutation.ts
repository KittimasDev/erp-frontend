"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { createWarehouse } from "@/lib/api/warehouses";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token";
import type { CreateWarehouseRequest } from "@/types/warehouses";
import { warehousesQueryKey } from "./useWarehousesQuery";

export function useCreateWarehouseMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: ["master-data", "warehouses", "create"],
    mutationFn: (payload: CreateWarehouseRequest) =>
      createWarehouse(getAccessToken(), payload),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: warehousesQueryKey });
      message.success(response.message || "สร้างคลังสินค้าสำเร็จแล้ว");
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError
          ? error.message
          : "สร้างคลังสินค้าไม่สำเร็จ",
      );
    },
  });
}
