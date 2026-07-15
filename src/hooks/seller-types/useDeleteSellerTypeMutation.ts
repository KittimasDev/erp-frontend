"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { deleteSellerType } from "@/lib/api/seller-types";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token";
import { sellerTypesQueryKey } from "./useSellerTypesQuery";

export function useDeleteSellerTypeMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: ["master-data", "seller-types", "delete"],
    mutationFn: (id: string) => deleteSellerType(getAccessToken(), id),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: sellerTypesQueryKey });
      message.success(response.message || "ลบประเภทผู้ขายสำเร็จแล้ว");
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError
          ? error.message
          : "ลบประเภทผู้ขายไม่สำเร็จ",
      );
    },
  });
}
