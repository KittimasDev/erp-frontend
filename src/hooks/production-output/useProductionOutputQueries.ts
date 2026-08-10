"use client";

import { useQuery } from "@tanstack/react-query";

import { PRODUCTION_OUTPUT_ENABLED } from "@/config/feature-flags";
import {
  getProductionOutputApproval,
  getProductionOutputApprovals,
  getAvailableMaterialIssues,
  getProductionOutputReadyOrders,
  getProductionOutputStockRequest,
  getProductionOutputStockRequests,
} from "@/lib/api/production-output-stock-requests";
import { getProductionOutputPendingTickets } from "@/lib/api/production-output-pending-tickets";
import { getAccessToken, hasAccessToken } from "@/lib/auth/token";
import type { ProductionOutputPendingTicketQueryParams } from "@/types/production-output-pending-tickets";
import {
  ProductionOutputRequestStatus,
  type ProductionOutputStockRequestQueryParams,
  type QueryProductionOutputReadyOrdersParams,
} from "@/types/production-output-stock-request";

export const productionOutputStockRequestsQueryKey = [
  "production-output",
  "stock-requests",
] as const;

export const pendingProductionOutputStockRequestsCountQueryKey = [
  ...productionOutputStockRequestsQueryKey,
  "pending-approval-count",
] as const;

const COUNT_POLL_MS = 30_000;

function countPollInterval(query: { state: { status: string } }): number | false {
  if (query.state.status === "error") {
    return false;
  }
  return COUNT_POLL_MS;
}

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

/** จำนวนคำขอรับผลผลิตรออนุมัติ สำหรับ badge (เมนู / หน้าแรก) */
export function usePendingProductionOutputStockRequestsCountQuery(options?: {
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: pendingProductionOutputStockRequestsCountQueryKey,
    queryFn: () =>
      getProductionOutputStockRequests(getAccessToken(), {
        status: ProductionOutputRequestStatus.PENDING_APPROVAL,
      }),
    enabled:
      (options?.enabled ?? true) &&
      hasAccessToken() &&
      PRODUCTION_OUTPUT_ENABLED,
    refetchInterval: countPollInterval,
    refetchOnMount: true,
    refetchOnWindowFocus: (query) => query.state.status !== "error",
    retry: 1,
    select: (res) => res?.data?.length ?? 0,
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
