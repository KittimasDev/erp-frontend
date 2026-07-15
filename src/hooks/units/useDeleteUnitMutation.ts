"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { deleteUnit } from "@/lib/api/units";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token";
import { unitsQueryKey } from "./useUnitsQuery";

export function useDeleteUnitMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: ["master-data", "units", "delete"],
    mutationFn: (id: string) => deleteUnit(getAccessToken(), id),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: unitsQueryKey });
      message.success(response.message || "ลบหน่วยนับสำเร็จแล้ว");
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : "ลบหน่วยนับไม่สำเร็จ",
      );
    },
  });
}
