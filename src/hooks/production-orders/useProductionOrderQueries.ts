"use client";

import { useQuery } from "@tanstack/react-query";

import {
  getProductionOrder,
  getProductionOrders,
  getProductionOrderSummary,
  getProductionOrderOutputTrend,
} from "@/lib/api/production-orders";
import { getAccessToken } from "@/lib/auth/token";
import type {
  ProductionOrderOutputTrendParams,
  QueryProductionOrdersParams,
} from "@/types/production-order";

export const productionOrdersQueryKey = ["production-orders"] as const;

export function useProductionOrdersQuery(
  params?: QueryProductionOrdersParams,
) {
  return useQuery({
    queryKey: [...productionOrdersQueryKey, "list", params ?? {}],
    queryFn: () => getProductionOrders(getAccessToken(), params),
  });
}

export function useProductionOrderQuery(id?: string) {
  return useQuery({
    queryKey: [...productionOrdersQueryKey, "detail", id],
    queryFn: () => getProductionOrder(getAccessToken(), id as string),
    enabled: Boolean(id),
  });
}

export function useProductionOrderSummaryQuery(id?: string) {
  return useQuery({
    queryKey: [...productionOrdersQueryKey, "summary", id],
    queryFn: () => getProductionOrderSummary(getAccessToken(), id as string),
    enabled: Boolean(id),
  });
}

export function useProductionOrderOutputTrendQuery(
  id?: string,
  params?: ProductionOrderOutputTrendParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [...productionOrdersQueryKey, "output-trend", id, params ?? {}],
    queryFn: () =>
      getProductionOrderOutputTrend(getAccessToken(), id as string, params),
    enabled: Boolean(id) && (options?.enabled ?? true),
  });
}
