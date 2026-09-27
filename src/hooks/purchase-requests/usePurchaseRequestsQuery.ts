"use client";

import { useQueries, useQuery } from "@tanstack/react-query";

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
import {
  pendingCountQueryOptions,
  selectListTotal,
} from "@/lib/query/count-query";
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
    queryFn: () => getPendingPurchaseRequestApprovals(getAccessToken(), params),
  });
}

/** จำนวน PR รออนุมัติสำหรับ badge (เมนู / หน้าแรก) */
export function pendingPurchaseRequestApprovalsCountOptions(ctx?: {
  enabled?: boolean;
}) {
  return pendingCountQueryOptions({
    queryKey: pendingPurchaseRequestApprovalsCountQueryKey,
    queryFn: () =>
      getPendingPurchaseRequestApprovals(getAccessToken(), {
        page: 1,
        limit: 1,
      }),
    select: selectListTotal,
    canAccess: canAccessPurchaseRequestApprovals,
    enabled: ctx?.enabled,
  });
}

export function usePendingPurchaseRequestApprovalsCountQuery(options?: {
  enabled?: boolean;
}) {
  return useQuery(pendingPurchaseRequestApprovalsCountOptions(options));
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
export function purchaseOrdersPendingFromPrCountOptions(ctx?: {
  enabled?: boolean;
}) {
  return pendingCountQueryOptions({
    queryKey: purchaseOrdersPendingFromPrCountQueryKey,
    queryFn: () =>
      getPurchaseOrdersPendingFromPr(getAccessToken(), {
        page: 1,
        limit: 1,
      }),
    select: selectListTotal,
    canAccess: canAccessPurchaseOrders,
    enabled: ctx?.enabled,
  });
}

export function usePurchaseOrdersPendingFromPrCountQuery(options?: {
  enabled?: boolean;
}) {
  return useQuery(purchaseOrdersPendingFromPrCountOptions(options));
}

function purchaseRequestQueryOptions(id: string) {
  return {
    queryKey: [...purchaseRequestsQueryKey, "detail", id],
    queryFn: () => getPurchaseRequest(getAccessToken(), id),
  };
}

export function usePurchaseRequestQuery(id?: string) {
  return useQuery({
    ...purchaseRequestQueryOptions(id as string),
    enabled: Boolean(id),
  });
}

/**
 * โหลดใบขอซื้อหลายใบพร้อมกัน — ใช้ตอนรวมหลายใบเป็นใบสั่งซื้อใบเดียว
 * ใช้ cache key เดียวกับ `usePurchaseRequestQuery` จึงไม่ยิงซ้ำถ้าเคยโหลดแล้ว
 */
export function usePurchaseRequestsQueries(ids: string[]) {
  return useQueries({
    queries: ids.map((id) => purchaseRequestQueryOptions(id)),
  });
}
