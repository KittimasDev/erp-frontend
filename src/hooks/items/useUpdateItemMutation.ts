"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { updateItem } from "@/lib/api/items";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token";
import type { UpdateItemRequest } from "@/types/items";
import { itemsQueryKey } from "./useItemsQuery";

type UpdateItemPayload = {
  id: string;
  body: UpdateItemRequest;
};

export function useUpdateItemMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: ["master-data", "items", "update"],
    mutationFn: ({ id, body }: UpdateItemPayload) =>
      updateItem(getAccessToken(), id, body),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: itemsQueryKey });
      message.success(response.message || "แก้ไขสินค้าสำเร็จแล้ว");
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : "แก้ไขสินค้าไม่สำเร็จ",
      );
    },
  });
}
