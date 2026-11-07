"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { useT } from "@/lib/i18n/useT";

import { deleteStockAdjustmentType } from "@/lib/api/stock-adjustment-types";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token";
import { stockAdjustmentTypesQueryKey } from "./useStockAdjustmentTypesQuery";

export function useDeleteStockAdjustmentTypeMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const t = useT();

  return useMutation({
    mutationKey: ["master-data", "stock-adjustment-types", "delete"],
    mutationFn: (id: string) =>
      deleteStockAdjustmentType(getAccessToken(), id),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({
        queryKey: stockAdjustmentTypesQueryKey,
      });
      message.success(
        response.message || t("ลบประเภทใบปรับปรุงสต๊อกสำเร็จแล้ว"),
      );
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError
          ? error.message
          : t("ลบประเภทใบปรับปรุงสต๊อกไม่สำเร็จ"),
      );
    },
  });
}
