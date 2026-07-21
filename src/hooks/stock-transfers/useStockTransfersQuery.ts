"use client";

import { useQuery } from "@tanstack/react-query";

import { getStockTransfer, getStockTransfers } from "@/lib/api/stock-transfers";
import { getAccessToken } from "@/lib/auth/token";
import type { StockTransferQueryParams } from "@/types/stock-transfers";

export const stockTransfersQueryKey = ["stock-transfers"] as const;

export function useStockTransfersQuery(params?: StockTransferQueryParams) {
  return useQuery({
    queryKey: [...stockTransfersQueryKey, "list", params ?? {}],
    queryFn: () => getStockTransfers(getAccessToken(), params),
  });
}

export function useStockTransferQuery(id?: string) {
  return useQuery({
    queryKey: [...stockTransfersQueryKey, "detail", id],
    queryFn: () => getStockTransfer(getAccessToken(), id as string),
    enabled: Boolean(id),
  });
}
