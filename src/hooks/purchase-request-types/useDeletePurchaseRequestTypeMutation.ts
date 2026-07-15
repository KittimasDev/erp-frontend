"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { deletePurchaseRequestType } from "@/lib/api/purchase-request-types";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token";
import { purchaseRequestTypesQueryKey } from "./usePurchaseRequestTypesQuery";

export function useDeletePurchaseRequestTypeMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: ["master-data", "purchase-request-types", "delete"],
    mutationFn: (id: string) =>
      deletePurchaseRequestType(getAccessToken(), id),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({
        queryKey: purchaseRequestTypesQueryKey,
      });
      message.success(response.message || "ลบประเภทใบขอซื้อสำเร็จแล้ว");
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError
          ? error.message
          : "ลบประเภทใบขอซื้อไม่สำเร็จ",
      );
    },
  });
}
