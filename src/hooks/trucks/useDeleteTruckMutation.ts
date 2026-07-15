"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { deleteTruck } from "@/lib/api/trucks";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token";
import { trucksQueryKey } from "./useTrucksQuery";

export function useDeleteTruckMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: ["master-data", "trucks", "delete"],
    mutationFn: (id: string) => deleteTruck(getAccessToken(), id),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: trucksQueryKey });
      message.success(response.message || "ลบรถบรรทุกสำเร็จแล้ว");
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : "ลบรถบรรทุกไม่สำเร็จ",
      );
    },
  });
}
