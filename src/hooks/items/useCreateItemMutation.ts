"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { useT } from "@/lib/i18n/useT";

import { createItem } from "@/lib/api/items";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token";
import type { CreateItemRequest } from "@/types/items";
import { itemsQueryKey } from "./useItemsQuery";

export function useCreateItemMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const t = useT();

  return useMutation({
    mutationKey: ["master-data", "items", "create"],
    mutationFn: (payload: CreateItemRequest) =>
      createItem(getAccessToken(), payload),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: itemsQueryKey });
      message.success(response.message || t("สร้างสินค้าสำเร็จแล้ว"));
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : t("สร้างสินค้าไม่สำเร็จ"),
      );
    },
  });
}
