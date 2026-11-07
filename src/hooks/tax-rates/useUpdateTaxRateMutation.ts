"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { useT } from "@/lib/i18n/useT";

import { updateTaxRate } from "@/lib/api/tax-rates";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token";
import type { UpdateTaxRateRequest } from "@/types/tax-rates";
import { taxRatesQueryKey } from "./useTaxRatesQuery";

type UpdateTaxRatePayload = {
  id: string;
  body: UpdateTaxRateRequest;
};

export function useUpdateTaxRateMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const t = useT();

  return useMutation({
    mutationKey: ["master-data", "tax-rates", "update"],
    mutationFn: ({ id, body }: UpdateTaxRatePayload) =>
      updateTaxRate(getAccessToken(), id, body),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: taxRatesQueryKey });
      message.success(response.message || t("แก้ไขอัตราภาษีสำเร็จแล้ว"));
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError
          ? error.message
          : t("แก้ไขอัตราภาษีไม่สำเร็จ"),
      );
    },
  });
}
