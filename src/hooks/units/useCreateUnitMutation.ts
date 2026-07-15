"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { createUnit } from "@/lib/api/units";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token";
import type { CreateUnitRequest } from "@/types/units";
import { unitsQueryKey } from "./useUnitsQuery";

export function useCreateUnitMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: ["master-data", "units", "create"],
    mutationFn: (payload: CreateUnitRequest) =>
      createUnit(getAccessToken(), payload),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: unitsQueryKey });
      message.success(response.message || "สร้างหน่วยนับสำเร็จแล้ว");
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError
          ? error.message
          : "สร้างหน่วยนับไม่สำเร็จ",
      );
    },
  });
}
