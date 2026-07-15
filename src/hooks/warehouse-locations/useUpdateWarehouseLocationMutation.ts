"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { updateWarehouseLocation } from "@/lib/api/warehouse-locations";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token";
import type { UpdateWarehouseLocationRequest } from "@/types/warehouse-locations";
import { warehouseLocationsQueryKey } from "./useWarehouseLocationsQuery";

type UpdateWarehouseLocationPayload = {
  id: string;
  body: UpdateWarehouseLocationRequest;
};

export function useUpdateWarehouseLocationMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: ["master-data", "warehouse-locations", "update"],
    mutationFn: ({ id, body }: UpdateWarehouseLocationPayload) =>
      updateWarehouseLocation(getAccessToken(), id, body),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({
        queryKey: warehouseLocationsQueryKey,
      });
      message.success(response.message || "แก้ไขตำแหน่งจัดเก็บสำเร็จแล้ว");
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError
          ? error.message
          : "แก้ไขตำแหน่งจัดเก็บไม่สำเร็จ",
      );
    },
  });
}
