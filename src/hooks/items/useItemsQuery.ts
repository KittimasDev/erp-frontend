"use client";

import { useQuery } from "@tanstack/react-query";

import { getItems } from "@/lib/api/items";
import { getAccessToken } from "@/lib/auth/token";
import type { ItemQueryParams } from "@/types/items";

export const itemsQueryKey = ["master-data", "items"] as const;

export function useItemsQuery(params?: ItemQueryParams) {
  return useQuery({
    queryKey: [...itemsQueryKey, params ?? {}],
    queryFn: () => getItems(getAccessToken(), params),
  });
}
