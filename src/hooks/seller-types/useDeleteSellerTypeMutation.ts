"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { deleteSellerType } from "@/lib/api/seller-types";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token";
import { useT } from "@/lib/i18n/useT";
import { sellerTypesQueryKey } from "./useSellerTypesQuery";

export function useDeleteSellerTypeMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const t = useT();

  return useMutation({
    mutationKey: ["master-data", "seller-types", "delete"],
    mutationFn: (id: string) => deleteSellerType(getAccessToken(), id),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: sellerTypesQueryKey });
      message.success(response.message || t("ลบประเภทผู้ขายสำเร็จแล้ว"));
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError
          ? error.message
          : t("ลบประเภทผู้ขายไม่สำเร็จ"),
      );
    },
  });
}
