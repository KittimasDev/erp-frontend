"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { useT } from "@/lib/i18n/useT";
import { createPurchaseRequestType } from "@/lib/api/purchase-request-types";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token";
import type { CreatePurchaseRequestTypeRequest } from "@/types/purchase-request-types";
import { purchaseRequestTypesQueryKey } from "./usePurchaseRequestTypesQuery";

export function useCreatePurchaseRequestTypeMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const t = useT();

  return useMutation({
    mutationKey: ["master-data", "purchase-request-types", "create"],
    mutationFn: (payload: CreatePurchaseRequestTypeRequest) =>
      createPurchaseRequestType(getAccessToken(), payload),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({
        queryKey: purchaseRequestTypesQueryKey,
      });
      message.success(
        response.message || t("สร้างประเภทใบขอซื้อสำเร็จแล้ว"),
      );
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError
          ? error.message
          : t("สร้างประเภทใบขอซื้อไม่สำเร็จ"),
      );
    },
  });
}
