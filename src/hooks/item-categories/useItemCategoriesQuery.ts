"use client";

import { useQuery } from "@tanstack/react-query";

import { getItemCategories } from "@/lib/api/item-categories";
import { getAccessToken } from "@/lib/auth/token";
import type { ItemCategoryQueryParams } from "@/types/item-categories";

export const itemCategoriesQueryKey = [
  "master-data",
  "item-categories",
] as const;

export function useItemCategoriesQuery(params?: ItemCategoryQueryParams) {
  return useQuery({
    queryKey: [...itemCategoriesQueryKey, params ?? {}],
    queryFn: () => getItemCategories(getAccessToken(), params),
  });
}
