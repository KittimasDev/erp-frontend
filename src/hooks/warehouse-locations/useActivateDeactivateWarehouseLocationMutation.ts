"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import {
  activateWarehouseLocation,
  deactivateWarehouseLocation,
} from "@/lib/api/warehouse-locations";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token";
import { warehouseLocationsQueryKey } from "./useWarehouseLocationsQuery";

export function useActivateWarehouseLocationMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: ["warehouse-locations", "activate"],
    mutationFn: (id: string) =>
      activateWarehouseLocation(getAccessToken(), id),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({
        queryKey: warehouseLocationsQueryKey,
      });
      message.success(
        response.message || "เปิดใช้งานตำแหน่งจัดเก็บสำเร็จแล้ว",
      );
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError
          ? error.message
          : "เปิดใช้งานตำแหน่งจัดเก็บไม่สำเร็จ",
      );
    },
  });
}

export function useDeactivateWarehouseLocationMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: ["warehouse-locations", "deactivate"],
    mutationFn: (id: string) =>
      deactivateWarehouseLocation(getAccessToken(), id),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({
        queryKey: warehouseLocationsQueryKey,
      });
      message.success(
        response.message || "ปิดใช้งานตำแหน่งจัดเก็บสำเร็จแล้ว",
      );
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError
          ? error.message
          : "ปิดใช้งานตำแหน่งจัดเก็บไม่สำเร็จ",
      );
    },
  });
}
