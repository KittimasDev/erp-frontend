"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { useT } from "@/lib/i18n/useT";

import { deleteRawTirePriceRule } from "@/lib/api/raw-tire-price-rules";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token";
import { rawTirePriceRulesQueryKey } from "./useRawTirePriceRulesQuery";

export function useDeleteRawTirePriceRuleMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const t = useT();

  return useMutation({
    mutationKey: ["master-data", "raw-tire-price-rules", "delete"],
    mutationFn: (id: string) => deleteRawTirePriceRule(getAccessToken(), id),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({
        queryKey: rawTirePriceRulesQueryKey,
      });
      message.success(response.message || t("ลบกฎราคาซื้อยางสำเร็จแล้ว"));
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError
          ? error.message
          : t("ลบกฎราคาซื้อยางไม่สำเร็จ"),
      );
    },
  });
}
