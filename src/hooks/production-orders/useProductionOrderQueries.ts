"use client";

import { useQuery } from "@tanstack/react-query";

import {
  getProductionOrder,
  getProductionOrders,
  getProductionOrderSummary,
} from "@/lib/api/production-orders";
import { getAccessToken } from "@/lib/auth/token";
import type { QueryProductionOrdersParams } from "@/types/production-order";

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
