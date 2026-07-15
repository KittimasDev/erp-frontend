"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { createTaxRate } from "@/lib/api/tax-rates";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token";
import type { CreateTaxRateRequest } from "@/types/tax-rates";
import { taxRatesQueryKey } from "./useTaxRatesQuery";

export function useCreateTaxRateMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: ["master-data", "tax-rates", "create"],
    mutationFn: (payload: CreateTaxRateRequest) =>
      createTaxRate(getAccessToken(), payload),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: taxRatesQueryKey });
      message.success(response.message || "สร้างอัตราภาษีสำเร็จแล้ว");
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError
          ? error.message
          : "สร้างอัตราภาษีไม่สำเร็จ",
      );
    },
  });
}
