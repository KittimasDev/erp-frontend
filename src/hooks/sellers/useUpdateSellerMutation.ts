"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { updateSeller } from "@/lib/api/sellers";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token";
import type { UpdateSellerRequest } from "@/types/sellers";
import { sellersQueryKey } from "./useSellersQuery";

type UpdateSellerPayload = {
  id: string;
  body: UpdateSellerRequest;
};

export function useUpdateSellerMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: ["master-data", "sellers", "update"],
    mutationFn: ({ id, body }: UpdateSellerPayload) =>
      updateSeller(getAccessToken(), id, body),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: sellersQueryKey });
      message.success(response.message || "แก้ไขผู้ขายสำเร็จแล้ว");
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : "แก้ไขผู้ขายไม่สำเร็จ",
      );
    },
  });
}
