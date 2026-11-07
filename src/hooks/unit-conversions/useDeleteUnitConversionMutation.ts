"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { useT } from "@/lib/i18n/useT";

import { ApiError } from "@/lib/api/client";
import { deleteUnitConversion } from "@/lib/api/unit-conversions";
import { getAccessToken } from "@/lib/auth/token";
import { unitConversionsQueryKey } from "./useUnitConversionsQuery";

export function useDeleteUnitConversionMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const t = useT();

  return useMutation({
    mutationKey: ["master-data", "unit-conversions", "delete"],
    mutationFn: (id: string) => deleteUnitConversion(getAccessToken(), id),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({
        queryKey: unitConversionsQueryKey,
      });
      message.success(response.message || t("ลบกฎแปลงหน่วยนับสำเร็จแล้ว"));
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError
          ? error.message
          : t("ลบกฎแปลงหน่วยนับไม่สำเร็จ"),
      );
    },
  });
}
