"use client";

import { useQuery } from "@tanstack/react-query";

import {
  getPendingPurchaseRequestApprovals,
  getPurchaseOrdersPendingFromPr,
  getPurchaseRequest,
  getPurchaseRequests,
} from "@/lib/api/purchase-requests";
import {
  canAccessScreen,
  hasPermission,
  isMatrixPermissionMode,
} from "@/lib/auth/permissions-access";
import { RoleCode } from "@/lib/auth/role-codes";
import { isAdministrator, userHasRole } from "@/lib/auth/session";
import { getAccessToken, hasAccessToken } from "@/lib/auth/token";
import type { PurchaseRequestQueryParams } from "@/types/purchase-requests";

export const purchaseRequestsQueryKey = ["purchase-requests"] as const;

export const pendingPurchaseRequestApprovalsCountQueryKey = [
  ...purchaseRequestsQueryKey,
  "approvals-pending-count",
] as const;

const COUNT_POLL_MS = 30_000;

function countPollInterval(query: { state: { status: string } }): number | false {
  if (query.state.status === "error") {
    return false;
  }
  return COUNT_POLL_MS;
}

/** สิทธิ์เข้าหน้ารายการใบขอซื้อรออนุมัติ (เมนู / badge) — ตรงกับ canSeeMenu */
export function canAccessPurchaseRequestApprovals(): boolean {
  if (isAdministrator()) {
    return true;
  }
  if (isMatrixPermissionMode()) {
    return (
      canAccessScreen("PURCHASE_REQUEST_APPROVALS") ||
      hasPermission(
        "PURCHASE_REQUEST_APPROVALS.VIEW",
        "PURCHASE_REQUEST_APPROVALS.APPROVE",
      )
    );
  }
  return userHasRole(RoleCode.PROCUREMENT_MANAGER);
}

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

/** จำนวน PR รออนุมัติสำหรับ badge (เมนู / หน้าแรก) */
export function usePendingPurchaseRequestApprovalsCountQuery(options?: {
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: pendingPurchaseRequestApprovalsCountQueryKey,
    queryFn: () =>
      getPendingPurchaseRequestApprovals(getAccessToken(), {
        page: 1,
        limit: 1,
      }),
    enabled:
      (options?.enabled ?? true) &&
      hasAccessToken() &&
      canAccessPurchaseRequestApprovals(),
    refetchInterval: countPollInterval,
    refetchOnMount: true,
    refetchOnWindowFocus: (query) => query.state.status !== "error",
    retry: 1,
    select: (res) => {
      const total = res?.data?.total;
      if (typeof total === "number" && Number.isFinite(total)) {
        return total;
      }
      return res?.data?.items?.length ?? 0;
    },
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
