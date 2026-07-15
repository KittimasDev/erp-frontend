"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { createTruck } from "@/lib/api/trucks";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token";
import type { CreateTruckRequest } from "@/types/trucks";
import { trucksQueryKey } from "./useTrucksQuery";

export function useCreateTruckMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: ["master-data", "trucks", "create"],
    mutationFn: (payload: CreateTruckRequest) =>
      createTruck(getAccessToken(), payload),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: trucksQueryKey });
      message.success(response.message || "สร้างรถบรรทุกสำเร็จแล้ว");
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError
          ? error.message
          : "สร้างรถบรรทุกไม่สำเร็จ",
      );
    },
  });
}
