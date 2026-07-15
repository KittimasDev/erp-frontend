"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { createWeighbridgeScale } from "@/lib/api/weighbridge-scales";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token";
import type { CreateWeighbridgeScaleRequest } from "@/types/weighbridge-scales";
import { weighbridgeScalesQueryKey } from "./useWeighbridgeScalesQuery";

export function useCreateWeighbridgeScaleMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: ["master-data", "weighbridge-scales", "create"],
    mutationFn: (payload: CreateWeighbridgeScaleRequest) =>
      createWeighbridgeScale(getAccessToken(), payload),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({
        queryKey: weighbridgeScalesQueryKey,
      });
      message.success(response.message || "สร้างเครื่องชั่งสำเร็จแล้ว");
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError
          ? error.message
          : "สร้างเครื่องชั่งไม่สำเร็จ",
      );
    },
  });
}
