"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { updateItemCategory } from "@/lib/api/item-categories";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token";
import type { UpdateItemCategoryRequest } from "@/types/item-categories";
import { itemCategoriesQueryKey } from "./useItemCategoriesQuery";

type UpdateItemCategoryPayload = {
  id: string;
  body: UpdateItemCategoryRequest;
};

export function useUpdateItemCategoryMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: ["master-data", "item-categories", "update"],
    mutationFn: ({ id, body }: UpdateItemCategoryPayload) =>
      updateItemCategory(getAccessToken(), id, body),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({
        queryKey: itemCategoriesQueryKey,
      });
      message.success(response.message || "แก้ไขหมวดหมู่สินค้าสำเร็จแล้ว");
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError
          ? error.message
          : "แก้ไขหมวดหมู่สินค้าไม่สำเร็จ",
      );
    },
  });
}
