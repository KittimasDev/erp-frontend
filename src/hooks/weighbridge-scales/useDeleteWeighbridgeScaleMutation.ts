"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { deleteWeighbridgeScale } from "@/lib/api/weighbridge-scales";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token";
import { weighbridgeScalesQueryKey } from "./useWeighbridgeScalesQuery";

export function useDeleteWeighbridgeScaleMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: ["master-data", "weighbridge-scales", "delete"],
    mutationFn: (id: string) => deleteWeighbridgeScale(getAccessToken(), id),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({
        queryKey: weighbridgeScalesQueryKey,
      });
      message.success(response.message || "ลบเครื่องชั่งสำเร็จแล้ว");
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError
          ? error.message
          : "ลบเครื่องชั่งไม่สำเร็จ",
      );
    },
  });
}
