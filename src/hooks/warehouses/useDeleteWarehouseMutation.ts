"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { deleteWarehouse } from "@/lib/api/warehouses";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token";
import { warehousesQueryKey } from "./useWarehousesQuery";

export function useDeleteWarehouseMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: ["master-data", "warehouses", "delete"],
    mutationFn: (id: string) => deleteWarehouse(getAccessToken(), id),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: warehousesQueryKey });
      message.success(response.message || "ลบคลังสินค้าสำเร็จแล้ว");
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : "ลบคลังสินค้าไม่สำเร็จ",
      );
    },
  });
}
