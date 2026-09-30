"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { updateStockAdjustmentType } from "@/lib/api/stock-adjustment-types";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token";
import type { UpdateStockAdjustmentTypeRequest } from "@/types/stock-adjustment-types";
import { stockAdjustmentTypesQueryKey } from "./useStockAdjustmentTypesQuery";

type UpdateStockAdjustmentTypePayload = {
  id: string;
  body: UpdateStockAdjustmentTypeRequest;
};

export function useUpdateStockAdjustmentTypeMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: ["master-data", "stock-adjustment-types", "update"],
    mutationFn: ({ id, body }: UpdateStockAdjustmentTypePayload) =>
      updateStockAdjustmentType(getAccessToken(), id, body),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({
        queryKey: stockAdjustmentTypesQueryKey,
      });
      message.success(
        response.message || "แก้ไขประเภทใบปรับปรุงสต๊อกสำเร็จแล้ว",
      );
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError
          ? error.message
          : "แก้ไขประเภทใบปรับปรุงสต๊อกไม่สำเร็จ",
      );
    },
  });
}
