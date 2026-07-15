"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { deleteTaxRate } from "@/lib/api/tax-rates";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token";
import { taxRatesQueryKey } from "./useTaxRatesQuery";

export function useDeleteTaxRateMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: ["master-data", "tax-rates", "delete"],
    mutationFn: (id: string) => deleteTaxRate(getAccessToken(), id),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: taxRatesQueryKey });
      message.success(response.message || "ลบอัตราภาษีสำเร็จแล้ว");
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : "ลบอัตราภาษีไม่สำเร็จ",
      );
    },
  });
}
