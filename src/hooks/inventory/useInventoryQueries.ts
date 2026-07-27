"use client";

import { useQuery } from "@tanstack/react-query";

import {
  getInventoryLots,
  getStockBalanceSummary,
  getStockBalances,
  getStockMovements,
} from "@/lib/api/inventory";
import { getAccessToken } from "@/lib/auth/token";
import type {
  InventoryLotQueryParams,
  StockBalanceQueryParams,
  StockMovementQueryParams,
} from "@/types/inventory";

export const inventoryQueryKey = ["inventory"] as const;

export function useStockBalancesQuery(params?: StockBalanceQueryParams) {
  return useQuery({
    queryKey: [...inventoryQueryKey, "stock-balances", params ?? {}],
    queryFn: () => getStockBalances(getAccessToken(), params),
  });
}

export function useStockBalanceSummaryQuery(params?: StockBalanceQueryParams) {
  return useQuery({
    queryKey: [...inventoryQueryKey, "stock-balances-summary", params ?? {}],
    queryFn: () => getStockBalanceSummary(getAccessToken(), params),
  });
}

export function useStockMovementsQuery(params?: StockMovementQueryParams) {
  return useQuery({
    queryKey: [...inventoryQueryKey, "stock-movements", params ?? {}],
    queryFn: () => getStockMovements(getAccessToken(), params),
  });
}

export function useInventoryLotsQuery(
  params?: InventoryLotQueryParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [...inventoryQueryKey, "lots", params ?? {}],
    queryFn: () => getInventoryLots(getAccessToken(), params),
    enabled: options?.enabled ?? true,
  });
}
