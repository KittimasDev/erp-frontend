"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { useT } from "@/lib/i18n/useT";

import { deleteItemCategory } from "@/lib/api/item-categories";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token";
import { itemCategoriesQueryKey } from "./useItemCategoriesQuery";

export function useDeleteItemCategoryMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const t = useT();

  return useMutation({
    mutationKey: ["master-data", "item-categories", "delete"],
    mutationFn: (id: string) => deleteItemCategory(getAccessToken(), id),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({
        queryKey: itemCategoriesQueryKey,
      });
      message.success(response.message || t("ลบหมวดหมู่สินค้าสำเร็จแล้ว"));
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError
          ? error.message
          : t("ลบหมวดหมู่สินค้าไม่สำเร็จ"),
      );
    },
  });
}
