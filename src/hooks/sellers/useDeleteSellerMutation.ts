"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { deleteSeller } from "@/lib/api/sellers";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token";
import { useT } from "@/lib/i18n/useT";
import { sellersQueryKey } from "./useSellersQuery";

export function useDeleteSellerMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const t = useT();

  return useMutation({
    mutationKey: ["master-data", "sellers", "delete"],
    mutationFn: (id: string) => deleteSeller(getAccessToken(), id),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: sellersQueryKey });
      message.success(response.message || t("ลบผู้ขายสำเร็จแล้ว"));
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : t("ลบผู้ขายไม่สำเร็จ"),
      );
    },
  });
}
