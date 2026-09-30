"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { createStockAdjustmentType } from "@/lib/api/stock-adjustment-types";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token";
import type { CreateStockAdjustmentTypeRequest } from "@/types/stock-adjustment-types";
import { stockAdjustmentTypesQueryKey } from "./useStockAdjustmentTypesQuery";

export function useCreateStockAdjustmentTypeMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: ["master-data", "stock-adjustment-types", "create"],
    mutationFn: (payload: CreateStockAdjustmentTypeRequest) =>
      createStockAdjustmentType(getAccessToken(), payload),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({
        queryKey: stockAdjustmentTypesQueryKey,
      });
      message.success(
        response.message || "สร้างประเภทใบปรับปรุงสต๊อกสำเร็จแล้ว",
      );
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError
          ? error.message
          : "สร้างประเภทใบปรับปรุงสต๊อกไม่สำเร็จ",
      );
    },
  });
}
