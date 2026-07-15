"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { createWarehouseLocation } from "@/lib/api/warehouse-locations";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token";
import type { CreateWarehouseLocationRequest } from "@/types/warehouse-locations";
import { warehouseLocationsQueryKey } from "./useWarehouseLocationsQuery";

export function useCreateWarehouseLocationMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: ["master-data", "warehouse-locations", "create"],
    mutationFn: (payload: CreateWarehouseLocationRequest) =>
      createWarehouseLocation(getAccessToken(), payload),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({
        queryKey: warehouseLocationsQueryKey,
      });
      message.success(response.message || "สร้างตำแหน่งจัดเก็บสำเร็จแล้ว");
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError
          ? error.message
          : "สร้างตำแหน่งจัดเก็บไม่สำเร็จ",
      );
    },
  });
}
