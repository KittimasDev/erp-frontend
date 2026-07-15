"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { createSellerType } from "@/lib/api/seller-types";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token";
import type { CreateSellerTypeRequest } from "@/types/seller-types";
import { sellerTypesQueryKey } from "./useSellerTypesQuery";

export function useCreateSellerTypeMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: ["master-data", "seller-types", "create"],
    mutationFn: (payload: CreateSellerTypeRequest) =>
      createSellerType(getAccessToken(), payload),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: sellerTypesQueryKey });
      message.success(response.message || "สร้างประเภทผู้ขายสำเร็จแล้ว");
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError
          ? error.message
          : "สร้างประเภทผู้ขายไม่สำเร็จ",
      );
    },
  });
}
