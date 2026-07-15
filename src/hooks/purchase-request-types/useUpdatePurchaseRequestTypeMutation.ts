"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { updatePurchaseRequestType } from "@/lib/api/purchase-request-types";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token";
import type { UpdatePurchaseRequestTypeRequest } from "@/types/purchase-request-types";
import { purchaseRequestTypesQueryKey } from "./usePurchaseRequestTypesQuery";

type UpdatePurchaseRequestTypePayload = {
  id: string;
  body: UpdatePurchaseRequestTypeRequest;
};

export function useUpdatePurchaseRequestTypeMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: ["master-data", "purchase-request-types", "update"],
    mutationFn: ({ id, body }: UpdatePurchaseRequestTypePayload) =>
      updatePurchaseRequestType(getAccessToken(), id, body),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({
        queryKey: purchaseRequestTypesQueryKey,
      });
      message.success(
        response.message || "แก้ไขประเภทใบขอซื้อสำเร็จแล้ว",
      );
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError
          ? error.message
          : "แก้ไขประเภทใบขอซื้อไม่สำเร็จ",
      );
    },
  });
}
