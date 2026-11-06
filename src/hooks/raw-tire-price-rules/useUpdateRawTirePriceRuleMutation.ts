"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { useT } from "@/lib/i18n/useT";

import { updateRawTirePriceRule } from "@/lib/api/raw-tire-price-rules";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token";
import type { UpdateRawTirePriceRuleRequest } from "@/types/raw-tire-price-rules";
import { rawTirePriceRulesQueryKey } from "./useRawTirePriceRulesQuery";

type UpdateRawTirePriceRulePayload = {
  id: string;
  body: UpdateRawTirePriceRuleRequest;
};

export function useUpdateRawTirePriceRuleMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const t = useT();

  return useMutation({
    mutationKey: ["master-data", "raw-tire-price-rules", "update"],
    mutationFn: ({ id, body }: UpdateRawTirePriceRulePayload) =>
      updateRawTirePriceRule(getAccessToken(), id, body),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({
        queryKey: rawTirePriceRulesQueryKey,
      });
      message.success(response.message || t("แก้ไขกฎราคาซื้อยางสำเร็จแล้ว"));
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError
          ? error.message
          : t("แก้ไขกฎราคาซื้อยางไม่สำเร็จ"),
      );
    },
  });
}
