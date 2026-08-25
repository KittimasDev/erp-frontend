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
  selectDataLength,
} from "@/lib/query/count-query";
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

/** สิทธิ์เข้าหน้าขอรับผลผลิตเข้าคลัง (เมนู / badge) — ตรงกับ canSeeMenu */
export function canAccessProductionOutputStockRequests(): boolean {
  if (isAdministrator()) {
    return true;
  }
  if (isMatrixPermissionMode()) {
    return (
      canAccessScreen("PRODUCTION_OUTPUT_STOCK_REQUESTS") ||
      hasPermission(
        "PRODUCTION_OUTPUT_STOCK_REQUESTS.VIEW",
        "PRODUCTION_OUTPUT_STOCK_REQUESTS.ADD",
        "PRODUCTION_OUTPUT_STOCK_REQUESTS.APPROVE",
      )
    );
  }
  return (
    userHasRole(RoleCode.PRODUCTION_OFFICER) ||
    userHasRole(RoleCode.WAREHOUSE_OFFICER) ||
    userHasRole(RoleCode.WAREHOUSE_MANAGER) ||
    userHasRole(RoleCode.EXECUTIVE)
  );
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
export function pendingProductionOutputStockRequestsCountOptions(ctx?: {
  enabled?: boolean;
}) {
  return pendingCountQueryOptions({
    queryKey: pendingProductionOutputStockRequestsCountQueryKey,
    queryFn: () =>
      getProductionOutputStockRequests(getAccessToken(), {
        status: ProductionOutputRequestStatus.PENDING_APPROVAL,
      }),
    select: selectDataLength,
    canAccess: canAccessProductionOutputStockRequests,
    // feature flag พับเข้า enabled ไม่ filter registry ทิ้ง (ต้องคงจำนวน query)
    enabled: (ctx?.enabled ?? true) && PRODUCTION_OUTPUT_ENABLED,
  });
}

export function usePendingProductionOutputStockRequestsCountQuery(options?: {
  enabled?: boolean;
}) {
  return useQuery(pendingProductionOutputStockRequestsCountOptions(options));
}

/** สิทธิ์เข้าหน้าอนุมัติรับผลผลิตเข้าคลัง (คลัง FG) — คนละหน้าจอกับหน้าขอรับผลผลิต */
export function canAccessProductionOutputApprovals(): boolean {
  if (isAdministrator()) {
    return true;
  }
  if (isMatrixPermissionMode()) {
    return (
      canAccessScreen("PRODUCTION_OUTPUT_APPROVALS") ||
      hasPermission(
        "PRODUCTION_OUTPUT_APPROVALS.VIEW",
        "PRODUCTION_OUTPUT_APPROVALS.APPROVE",
      )
    );
  }
  return (
    userHasRole(RoleCode.WAREHOUSE_MANAGER) || userHasRole(RoleCode.EXECUTIVE)
  );
}

export const pendingProductionOutputApprovalsCountQueryKey = [
  ...productionOutputStockRequestsQueryKey,
  "approvals",
  "count",
] as const;

/** จำนวนคำขอที่คลัง FG ต้องอนุมัติ สำหรับ badge */
export function pendingProductionOutputApprovalsCountOptions(ctx?: {
  enabled?: boolean;
}) {
  return pendingCountQueryOptions({
    queryKey: pendingProductionOutputApprovalsCountQueryKey,
    queryFn: () => getProductionOutputApprovals(getAccessToken()),
    select: selectDataLength,
    canAccess: canAccessProductionOutputApprovals,
    enabled: (ctx?.enabled ?? true) && PRODUCTION_OUTPUT_ENABLED,
  });
}

/** สิทธิ์เข้าหน้ารับผลผลิตเข้าคลัง (อ้างอิงตั๋วผลิต) */
export function canAccessPendingProductionOutput(): boolean {
  if (isAdministrator()) {
    return true;
  }
  if (isMatrixPermissionMode()) {
    return (
      canAccessScreen("PENDING_PRODUCTION_OUTPUT") ||
      hasPermission("PENDING_PRODUCTION_OUTPUT.VIEW")
    );
  }
  return (
    userHasRole(RoleCode.PRODUCTION_OFFICER) ||
    userHasRole(RoleCode.WAREHOUSE_OFFICER) ||
    userHasRole(RoleCode.WAREHOUSE_MANAGER) ||
    userHasRole(RoleCode.EXECUTIVE)
  );
}

export const pendingProductionOutputTicketsCountQueryKey = [
  ...productionOutputPendingTicketsQueryKey,
  "count",
] as const;

/** จำนวนตั๋วผลิตที่ยังไม่ได้รับเข้าคลัง สำหรับ badge */
export function pendingProductionOutputTicketsCountOptions(ctx?: {
  enabled?: boolean;
}) {
  return pendingCountQueryOptions({
    queryKey: pendingProductionOutputTicketsCountQueryKey,
    queryFn: () => getProductionOutputPendingTickets(getAccessToken()),
    select: selectDataLength,
    canAccess: canAccessPendingProductionOutput,
    enabled: (ctx?.enabled ?? true) && PRODUCTION_OUTPUT_ENABLED,
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
