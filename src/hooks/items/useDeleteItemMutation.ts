"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { deleteItem } from "@/lib/api/items";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token";
import { itemsQueryKey } from "./useItemsQuery";

export function useDeleteItemMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: ["master-data", "items", "delete"],
    mutationFn: (id: string) => deleteItem(getAccessToken(), id),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: itemsQueryKey });
      message.success(response.message || "ลบสินค้าสำเร็จแล้ว");
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : "ลบสินค้าไม่สำเร็จ",
      );
    },
  });
}
