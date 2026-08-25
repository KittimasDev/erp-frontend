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

export const purchaseOrdersPendingFromPrCountQueryKey = [
  ...purchaseRequestsQueryKey,
  "pending-from-pr-count",
] as const;

const COUNT_POLL_MS = 30_000;

function countPollInterval(): number {
  return COUNT_POLL_MS;
}

function selectListTotal(res: {
  data?: { total?: number | string; items?: unknown[] };
}): number {
  const total = res?.data?.total as number | string | undefined;
  if (typeof total === "number" && Number.isFinite(total)) {
    return total;
  }
  if (typeof total === "string" && total.trim() !== "") {
    const parsed = Number(total);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return res?.data?.items?.length ?? 0;
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

/** สิทธิ์เข้าหน้ารายการใบสั่งซื้อ (เมนู / badge PR รอสร้าง PO) — ตรงกับ canSeeMenu */
export function canAccessPurchaseOrders(): boolean {
  if (isAdministrator()) {
    return true;
  }
  if (isMatrixPermissionMode()) {
    return (
      canAccessScreen("PURCHASE_ORDERS") ||
      hasPermission("PURCHASE_ORDERS.VIEW", "PURCHASE_ORDERS.ADD")
    );
  }
  return (
    userHasRole(RoleCode.PROCUREMENT_OFFICER) ||
    userHasRole(RoleCode.PROCUREMENT_MANAGER) ||
    userHasRole(RoleCode.WAREHOUSE_OFFICER) ||
    userHasRole(RoleCode.WAREHOUSE_MANAGER) ||
    userHasRole(RoleCode.ACCOUNTING_OFFICER) ||
    userHasRole(RoleCode.EXECUTIVE)
  );
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
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    retry: 2,
    select: selectListTotal,
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

/** จำนวน PR ที่อนุมัติแล้วรอสร้าง PO สำหรับ badge (เมนูใบสั่งซื้อ / หน้าแรก) */
export function usePurchaseOrdersPendingFromPrCountQuery(options?: {
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: purchaseOrdersPendingFromPrCountQueryKey,
    queryFn: () =>
      getPurchaseOrdersPendingFromPr(getAccessToken(), {
        page: 1,
        limit: 1,
      }),
    enabled:
      (options?.enabled ?? true) &&
      hasAccessToken() &&
      canAccessPurchaseOrders(),
    refetchInterval: countPollInterval,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    retry: 2,
    select: selectListTotal,
  });
}

export function usePurchaseRequestQuery(id?: string) {
  return useQuery({
    queryKey: [...purchaseRequestsQueryKey, "detail", id],
    queryFn: () => getPurchaseRequest(getAccessToken(), id as string),
    enabled: Boolean(id),
  });
}
