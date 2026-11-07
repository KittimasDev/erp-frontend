"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { updateSellerType } from "@/lib/api/seller-types";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token";
import { useT } from "@/lib/i18n/useT";
import type { UpdateSellerTypeRequest } from "@/types/seller-types";
import { sellerTypesQueryKey } from "./useSellerTypesQuery";

type UpdateSellerTypePayload = {
  id: string;
  body: UpdateSellerTypeRequest;
};

export function useUpdateSellerTypeMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const t = useT();

  return useMutation({
    mutationKey: ["master-data", "seller-types", "update"],
    mutationFn: ({ id, body }: UpdateSellerTypePayload) =>
      updateSellerType(getAccessToken(), id, body),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: sellerTypesQueryKey });
      message.success(response.message || t("แก้ไขประเภทผู้ขายสำเร็จแล้ว"));
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError
          ? error.message
          : t("แก้ไขประเภทผู้ขายไม่สำเร็จ"),
      );
    },
  });
}
