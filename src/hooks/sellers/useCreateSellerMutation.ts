"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { createSeller } from "@/lib/api/sellers";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token";
import { useT } from "@/lib/i18n/useT";
import type { CreateSellerRequest } from "@/types/sellers";
import { sellersQueryKey } from "./useSellersQuery";

export function useCreateSellerMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const t = useT();

  return useMutation({
    mutationKey: ["master-data", "sellers", "create"],
    mutationFn: (payload: CreateSellerRequest) =>
      createSeller(getAccessToken(), payload),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: sellersQueryKey });
      message.success(response.message || t("สร้างผู้ขายสำเร็จแล้ว"));
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : t("สร้างผู้ขายไม่สำเร็จ"),
      );
    },
  });
}
