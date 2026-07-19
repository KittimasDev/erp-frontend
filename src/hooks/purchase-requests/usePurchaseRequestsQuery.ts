"use client";

import { useQuery } from "@tanstack/react-query";

import {
  getPendingPurchaseRequestApprovals,
  getPurchaseOrdersPendingFromPr,
  getPurchaseRequest,
  getPurchaseRequests,
} from "@/lib/api/purchase-requests";
import { getAccessToken } from "@/lib/auth/token";
import type { PurchaseRequestQueryParams } from "@/types/purchase-requests";

export const purchaseRequestsQueryKey = ["purchase-requests"] as const;

export function usePurchaseRequestsQuery(params?: PurchaseRequestQueryParams) {
  return useQuery({
    queryKey: [...purchaseRequestsQueryKey, "list", params ?? {}],
    queryFn: () => getPurchaseRequests(getAccessToken(), params),
  });
}

export function usePendingPurchaseRequestApprovalsQuery(
  params?: PurchaseRequestQueryParams,
) {
  return useQuery({
    queryKey: [...purchaseRequestsQueryKey, "approvals-pending", params ?? {}],
    queryFn: () =>
      getPendingPurchaseRequestApprovals(getAccessToken(), params),
  });
}

export function usePurchaseOrdersPendingFromPrQuery(
  params?: PurchaseRequestQueryParams,
) {
  return useQuery({
    queryKey: [...purchaseRequestsQueryKey, "pending-from-pr", params ?? {}],
    queryFn: () => getPurchaseOrdersPendingFromPr(getAccessToken(), params),
  });
}

export function usePurchaseRequestQuery(id?: string) {
  return useQuery({
    queryKey: [...purchaseRequestsQueryKey, "detail", id],
    queryFn: () => getPurchaseRequest(getAccessToken(), id as string),
    enabled: Boolean(id),
  });
}
