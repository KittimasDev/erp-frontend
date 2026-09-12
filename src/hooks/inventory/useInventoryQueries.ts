"use client";

import { useQuery } from "@tanstack/react-query";

import {
  getInventoryLots,
  getLowStockItems,
  getStockBalanceSummary,
  getStockBalances,
  getStockBalancesByItem,
  getStockBalanceReservations,
  getStockMovements,
} from "@/lib/api/inventory";
import { getAccessToken } from "@/lib/auth/token";
import type {
  InventoryLotQueryParams,
  LowStockQueryParams,
  StockBalanceQueryParams,
  StockMovementQueryParams,
} from "@/types/inventory";

export const inventoryQueryKey = ["inventory"] as const;

export function useStockBalancesQuery(
  params?: StockBalanceQueryParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [...inventoryQueryKey, "stock-balances", params ?? {}],
    queryFn: () => getStockBalances(getAccessToken(), params),
    enabled: options?.enabled ?? true,
  });
}

export function useStockBalancesByItemQuery(
  params?: StockBalanceQueryParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [...inventoryQueryKey, "stock-balances-by-item", params ?? {}],
    queryFn: () => getStockBalancesByItem(getAccessToken(), params),
    enabled: options?.enabled ?? true,
  });
}

export function useStockBalanceSummaryQuery(params?: StockBalanceQueryParams) {
  return useQuery({
    queryKey: [...inventoryQueryKey, "stock-balances-summary", params ?? {}],
    queryFn: () => getStockBalanceSummary(getAccessToken(), params),
  });
}

export function useStockBalanceReservationsQuery(
  params?: { itemId: string; warehouseId?: string; locationId?: string },
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [
      ...inventoryQueryKey,
      "stock-balance-reservations",
      params ?? {},
    ],
    queryFn: () => getStockBalanceReservations(getAccessToken(), params!),
    enabled: (options?.enabled ?? true) && Boolean(params?.itemId),
  });
}

export function useStockMovementsQuery(
  params?: StockMovementQueryParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [...inventoryQueryKey, "stock-movements", params ?? {}],
    queryFn: () => getStockMovements(getAccessToken(), params),
    enabled: options?.enabled ?? true,
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

export function useLowStockItemsQuery(params?: LowStockQueryParams) {
  return useQuery({
    queryKey: [...inventoryQueryKey, "low-stock", params ?? {}],
    queryFn: () => getLowStockItems(getAccessToken(), params),
  });
}
