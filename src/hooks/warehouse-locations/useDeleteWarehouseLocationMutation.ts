"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { deleteWarehouseLocation } from "@/lib/api/warehouse-locations";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token";
import { warehouseLocationsQueryKey } from "./useWarehouseLocationsQuery";

export function useDeleteWarehouseLocationMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: ["master-data", "warehouse-locations", "delete"],
    mutationFn: (id: string) => deleteWarehouseLocation(getAccessToken(), id),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({
        queryKey: warehouseLocationsQueryKey,
      });
      message.success(response.message || "ลบตำแหน่งจัดเก็บสำเร็จแล้ว");
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError
          ? error.message
          : "ลบตำแหน่งจัดเก็บไม่สำเร็จ",
      );
    },
  });
}
