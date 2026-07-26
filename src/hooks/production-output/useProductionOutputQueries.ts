"use client";

import { useQuery } from "@tanstack/react-query";

import {
  getProductionOutputApproval,
  getProductionOutputApprovals,
  getAvailableMaterialIssues,
  getProductionOutputReadyOrders,
  getProductionOutputStockRequest,
  getProductionOutputStockRequests,
} from "@/lib/api/production-output-stock-requests";
import { getProductionOutputPendingTickets } from "@/lib/api/production-output-pending-tickets";
import { getAccessToken } from "@/lib/auth/token";
import type { ProductionOutputPendingTicketQueryParams } from "@/types/production-output-pending-tickets";
import type {
  ProductionOutputStockRequestQueryParams,
  QueryProductionOutputReadyOrdersParams,
} from "@/types/production-output-stock-request";

export const productionOutputStockRequestsQueryKey = [
  "production-output",
  "stock-requests",
] as const;

export const productionOutputPendingTicketsQueryKey = [
  "production-output",
  "pending-tickets",
] as const;

export function useProductionOutputPendingTicketsQuery(
  params?: ProductionOutputPendingTicketQueryParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [...productionOutputPendingTicketsQueryKey, params ?? {}],
    queryFn: () =>
      getProductionOutputPendingTickets(getAccessToken(), params),
    enabled: options?.enabled ?? true,
  });
}

export function useProductionOutputStockRequestsQuery(
  params?: ProductionOutputStockRequestQueryParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [...productionOutputStockRequestsQueryKey, "list", params ?? {}],
    queryFn: () =>
      getProductionOutputStockRequests(getAccessToken(), params),
    enabled: options?.enabled ?? true,
  });
}

export function useProductionOutputStockRequestQuery(id?: string) {
  return useQuery({
    queryKey: [...productionOutputStockRequestsQueryKey, "detail", id],
    queryFn: () =>
      getProductionOutputStockRequest(getAccessToken(), id as string),
    enabled: Boolean(id),
  });
}

export function useProductionOutputApprovalsQuery() {
  return useQuery({
    queryKey: [...productionOutputStockRequestsQueryKey, "approvals"],
    queryFn: () => getProductionOutputApprovals(getAccessToken()),
  });
}

export function useProductionOutputApprovalQuery(id?: string) {
  return useQuery({
    queryKey: [...productionOutputStockRequestsQueryKey, "approval", id],
    queryFn: () =>
      getProductionOutputApproval(getAccessToken(), id as string),
    enabled: Boolean(id),
  });
}

export function useProductionOutputReadyOrdersQuery(
  params?: QueryProductionOutputReadyOrdersParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [
      ...productionOutputStockRequestsQueryKey,
      "ready-production-orders",
      params ?? {},
    ],
    queryFn: () => getProductionOutputReadyOrders(getAccessToken(), params),
    enabled: options?.enabled ?? true,
  });
}

export function useAvailableMaterialIssuesQuery(
  params?: { productionOrderId?: string },
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [
      ...productionOutputStockRequestsQueryKey,
      "available-material-issues",
      params ?? {},
    ],
    queryFn: () => getAvailableMaterialIssues(getAccessToken(), params),
    enabled: options?.enabled ?? true,
  });
}
