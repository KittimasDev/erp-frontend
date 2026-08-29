"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { ApiError } from "@/lib/api/client";
import { createUnitConversion } from "@/lib/api/unit-conversions";
import { getAccessToken } from "@/lib/auth/token";
import type { CreateUnitConversionRequest } from "@/types/unit-conversions";
import { unitConversionsQueryKey } from "./useUnitConversionsQuery";

export function useCreateUnitConversionMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: ["master-data", "unit-conversions", "create"],
    mutationFn: (payload: CreateUnitConversionRequest) =>
      createUnitConversion(getAccessToken(), payload),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({
        queryKey: unitConversionsQueryKey,
      });
      message.success(response.message || "สร้างกฎแปลงหน่วยนับสำเร็จแล้ว");
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError
          ? error.message
          : "สร้างกฎแปลงหน่วยนับไม่สำเร็จ",
      );
    },
  });
}
