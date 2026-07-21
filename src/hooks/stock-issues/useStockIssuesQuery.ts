"use client";

import { useQuery } from "@tanstack/react-query";

import { getStockIssue, getStockIssues } from "@/lib/api/stock-issues";
import { getAccessToken } from "@/lib/auth/token";
import type { StockIssueQueryParams } from "@/types/stock-issues";

export const stockIssuesQueryKey = ["stock-issues"] as const;

export function useStockIssuesQuery(params?: StockIssueQueryParams) {
  return useQuery({
    queryKey: [...stockIssuesQueryKey, "list", params ?? {}],
    queryFn: () => getStockIssues(getAccessToken(), params),
  });
}

export function useStockIssueQuery(id?: string) {
  return useQuery({
    queryKey: [...stockIssuesQueryKey, "detail", id],
    queryFn: () => getStockIssue(getAccessToken(), id as string),
    enabled: Boolean(id),
  });
}
