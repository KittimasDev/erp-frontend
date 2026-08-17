"use client";

import { useQuery } from "@tanstack/react-query";

import {
  getEligibleSalesOrder,
  getEligibleSalesOrders,
  getProductionRequest,
  getProductionRequests,
} from "@/lib/api/production-requests";
import { getAccessToken } from "@/lib/auth/token";
import type { QueryProductionRequestsParams } from "@/types/production-request";

export const productionRequestsQueryKey = ["production-requests"] as const;

export function useProductionRequestsQuery(
  params?: QueryProductionRequestsParams,
) {
  return useQuery({
    queryKey: [...productionRequestsQueryKey, "list", params ?? {}],
    queryFn: () => getProductionRequests(getAccessToken(), params),
  });
}

export function useProductionRequestQuery(id?: string) {
  return useQuery({
    queryKey: [...productionRequestsQueryKey, "detail", id],
    queryFn: () => getProductionRequest(getAccessToken(), id as string),
    enabled: Boolean(id),
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
