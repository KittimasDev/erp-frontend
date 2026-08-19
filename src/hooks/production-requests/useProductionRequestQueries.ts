"use client";

import { useQuery } from "@tanstack/react-query";

import {
  getEligibleSalesOrder,
  getEligibleSalesOrders,
  getLinkedSalesOrders,
  getProductionRequest,
  getProductionRequestPlanningSummary,
  getProductionRequests,
} from "@/lib/api/production-requests";
import { getAccessToken } from "@/lib/auth/token";
import type {
  QueryLinkedSalesOrdersParams,
  QueryProductionRequestsParams,
} from "@/types/production-request";

export const productionRequestsQueryKey = ["production-requests"] as const;

export function useProductionRequestsQuery(
  params?: QueryProductionRequestsParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [...productionRequestsQueryKey, "list", params ?? {}],
    queryFn: () => getProductionRequests(getAccessToken(), params),
    enabled: options?.enabled ?? true,
  });
}

export function useProductionRequestQuery(id?: string) {
  return useQuery({
    queryKey: [...productionRequestsQueryKey, "detail", id],
    queryFn: () => getProductionRequest(getAccessToken(), id as string),
    enabled: Boolean(id),
  });
}

export function useProductionRequestPlanningSummaryQuery(
  params?: QueryProductionRequestsParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [...productionRequestsQueryKey, "planning-summary", params ?? {}],
    queryFn: () => getProductionRequestPlanningSummary(getAccessToken(), params),
    enabled: options?.enabled ?? true,
  });
}

export function useLinkedSalesOrdersQuery(
  params?: QueryLinkedSalesOrdersParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [...productionRequestsQueryKey, "linked-sales-orders", params ?? {}],
    queryFn: () => getLinkedSalesOrders(getAccessToken(), params),
    enabled: options?.enabled ?? true,
  });
}

export function useEligibleSalesOrdersQuery(params?: {
  q?: string;
  limit?: number;
}) {
  return useQuery({
    queryKey: [...productionRequestsQueryKey, "eligible-sos", params ?? {}],
    queryFn: () => getEligibleSalesOrders(getAccessToken(), params),
  });
}

export function useEligibleSalesOrderQuery(salesOrderId?: string) {
  return useQuery({
    queryKey: [...productionRequestsQueryKey, "eligible-so", salesOrderId],
    queryFn: () =>
      getEligibleSalesOrder(getAccessToken(), salesOrderId as string),
    enabled: Boolean(salesOrderId),
  });
}
