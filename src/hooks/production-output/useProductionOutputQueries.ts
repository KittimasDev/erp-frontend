"use client";

import { useQuery } from "@tanstack/react-query";

import {
  getProductionOutputApproval,
  getProductionOutputApprovals,
  getProductionOutputStockRequest,
  getProductionOutputStockRequests,
} from "@/lib/api/production-output-stock-requests";
import { getProductionOutputPendingTickets } from "@/lib/api/production-output-pending-tickets";
import { getAccessToken } from "@/lib/auth/token";
import type { ProductionOutputPendingTicketQueryParams } from "@/types/production-output-pending-tickets";
import type { ProductionOutputStockRequestQueryParams } from "@/types/production-output-stock-request";

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
