"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { useT } from "@/lib/i18n/useT";

import { ApiError } from "@/lib/api/client";
import { updateUnitConversion } from "@/lib/api/unit-conversions";
import { getAccessToken } from "@/lib/auth/token";
import type { UpdateUnitConversionRequest } from "@/types/unit-conversions";
import { unitConversionsQueryKey } from "./useUnitConversionsQuery";

type UpdateUnitConversionPayload = {
  id: string;
  body: UpdateUnitConversionRequest;
};

export function useUpdateUnitConversionMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const t = useT();

  return useMutation({
    mutationKey: ["master-data", "unit-conversions", "update"],
    mutationFn: ({ id, body }: UpdateUnitConversionPayload) =>
      updateUnitConversion(getAccessToken(), id, body),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({
        queryKey: unitConversionsQueryKey,
      });
      message.success(response.message || t("แก้ไขกฎแปลงหน่วยนับสำเร็จแล้ว"));
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError
          ? error.message
          : t("แก้ไขกฎแปลงหน่วยนับไม่สำเร็จ"),
      );
    },
  });
}
