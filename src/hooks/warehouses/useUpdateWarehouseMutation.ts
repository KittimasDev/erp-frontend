"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { updateWarehouse } from "@/lib/api/warehouses";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token";
import type { UpdateWarehouseRequest } from "@/types/warehouses";
import { warehousesQueryKey } from "./useWarehousesQuery";

type UpdateWarehousePayload = {
  id: string;
  body: UpdateWarehouseRequest;
};

export function useUpdateWarehouseMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: ["master-data", "warehouses", "update"],
    mutationFn: ({ id, body }: UpdateWarehousePayload) =>
      updateWarehouse(getAccessToken(), id, body),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: warehousesQueryKey });
      message.success(response.message || "แก้ไขคลังสินค้าสำเร็จแล้ว");
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError
          ? error.message
          : "แก้ไขคลังสินค้าไม่สำเร็จ",
      );
    },
  });
}
