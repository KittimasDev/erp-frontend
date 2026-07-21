"use client";

import { useQuery } from "@tanstack/react-query";

import { getStockCount, getStockCounts } from "@/lib/api/stock-counts";
import { getAccessToken } from "@/lib/auth/token";
import type { StockCountQueryParams } from "@/types/stock-counts";

export const stockCountsQueryKey = ["stock-counts"] as const;

export function useStockCountsQuery(params?: StockCountQueryParams) {
  return useQuery({
    queryKey: [...stockCountsQueryKey, "list", params ?? {}],
    queryFn: () => getStockCounts(getAccessToken(), params),
  });
}

export function useStockCountQuery(id?: string) {
  return useQuery({
    queryKey: [...stockCountsQueryKey, "detail", id],
    queryFn: () => getStockCount(getAccessToken(), id as string),
    enabled: Boolean(id),
  });
}
