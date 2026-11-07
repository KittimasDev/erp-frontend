"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { useT } from "@/lib/i18n/useT";

import { createItemCategory } from "@/lib/api/item-categories";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token";
import type { CreateItemCategoryRequest } from "@/types/item-categories";
import { itemCategoriesQueryKey } from "./useItemCategoriesQuery";

export function useCreateItemCategoryMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const t = useT();

  return useMutation({
    mutationKey: ["master-data", "item-categories", "create"],
    mutationFn: (payload: CreateItemCategoryRequest) =>
      createItemCategory(getAccessToken(), payload),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({
        queryKey: itemCategoriesQueryKey,
      });
      message.success(response.message || t("สร้างหมวดหมู่สินค้าสำเร็จแล้ว"));
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError
          ? error.message
          : t("สร้างหมวดหมู่สินค้าไม่สำเร็จ"),
      );
    },
  });
}
