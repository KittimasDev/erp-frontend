"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { useT } from "@/lib/i18n/useT";

import { createRawTirePriceRule } from "@/lib/api/raw-tire-price-rules";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token";
import type { CreateRawTirePriceRuleRequest } from "@/types/raw-tire-price-rules";
import { rawTirePriceRulesQueryKey } from "./useRawTirePriceRulesQuery";

export function useCreateRawTirePriceRuleMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const t = useT();

  return useMutation({
    mutationKey: ["master-data", "raw-tire-price-rules", "create"],
    mutationFn: (payload: CreateRawTirePriceRuleRequest) =>
      createRawTirePriceRule(getAccessToken(), payload),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({
        queryKey: rawTirePriceRulesQueryKey,
      });
      message.success(response.message || t("สร้างกฎราคาซื้อยางสำเร็จแล้ว"));
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError
          ? error.message
          : t("สร้างกฎราคาซื้อยางไม่สำเร็จ"),
      );
    },
  });
}
