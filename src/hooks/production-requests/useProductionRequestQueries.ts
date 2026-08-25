"use client";

import { useQuery } from "@tanstack/react-query";

import {
  getEligibleSalesOrder,
  getEligibleSalesOrders,
  getLinkedSalesOrders,
  getLinkedSalesOrdersCount,
  getProductionRequest,
  getProductionRequestPlanningSummary,
  getProductionRequests,
} from "@/lib/api/production-requests";
import {
  canAccessScreen,
  hasPermission,
  isMatrixPermissionMode,
} from "@/lib/auth/permissions-access";
import { RoleCode } from "@/lib/auth/role-codes";
import { isAdministrator, userHasRole } from "@/lib/auth/session";
import { getAccessToken } from "@/lib/auth/token";
import { pendingCountQueryOptions } from "@/lib/query/count-query";
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

/** สิทธิ์เข้าหน้าใบสั่งขายที่ส่งผลิต (เมนู / badge) — ตรงกับ canSeeMenu */
export function canAccessSalesOrdersInProduction(): boolean {
  if (isAdministrator()) {
    return true;
  }
  if (isMatrixPermissionMode()) {
    return (
      canAccessScreen("SALES_ORDERS_IN_PRODUCTION") ||
      hasPermission(
        "SALES_ORDERS_IN_PRODUCTION.VIEW",
        "PRODUCTION_REQUESTS.VIEW",
      )
    );
  }
  return (
    userHasRole(RoleCode.SALES_OFFICER) ||
    userHasRole(RoleCode.SALES_MANAGER) ||
    userHasRole(RoleCode.EXECUTIVE) ||
    userHasRole(RoleCode.ACCOUNTING_OFFICER)
  );
}

export const linkedSalesOrdersCountQueryKey = [
  ...productionRequestsQueryKey,
  "linked-sales-orders",
  "count",
] as const;

/**
 * จำนวนใบสั่งขายรอยืนยันหลังส่งผลิต สำหรับ badge
 * ใช้ endpoint /count ที่ไม่ sync สถานะ SO — ห้ามเปลี่ยนไปใช้ getLinkedSalesOrders
 * เพราะตัวนั้นยิง bulk UPDATE ทุกครั้งที่เรียก
 */
export function linkedSalesOrdersCountOptions(ctx?: { enabled?: boolean }) {
  return pendingCountQueryOptions({
    queryKey: linkedSalesOrdersCountQueryKey,
    queryFn: () => getLinkedSalesOrdersCount(getAccessToken()),
    select: (res) => res?.data?.count ?? 0,
    canAccess: canAccessSalesOrdersInProduction,
    enabled: ctx?.enabled,
  });
}
