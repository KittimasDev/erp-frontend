"use client";

import { useQuery } from "@tanstack/react-query";

import {
  getPendingQuotationApprovals,
  getQuotation,
  getQuotationItemAvailability,
  getQuotations,
} from "@/lib/api/quotations";
import {
  canAccessScreen,
  hasPermission,
  isMatrixPermissionMode,
} from "@/lib/auth/permissions-access";
import { RoleCode } from "@/lib/auth/role-codes";
import { isAdministrator, userHasRole } from "@/lib/auth/session";
import { pendingCountQueryOptions, selectDataLength } from "@/lib/query/count-query";
import { getAccessToken } from "@/lib/auth/token";
import type {
  QuotationItemAvailabilityQueryParams,
  QuotationQueryParams,
} from "@/types/quotations";

export const quotationsQueryKey = ["quotations"] as const;

export const pendingQuotationApprovalsCountQueryKey = [
  ...quotationsQueryKey,
  "approvals-pending-count",
] as const;

/** สิทธิ์เข้าหน้าอนุมัติใบเสนอราคา (เมนู / badge) — ตรงกับ canSeeMenu */
export function canAccessQuotationApprovals(): boolean {
  if (isAdministrator()) {
    return true;
  }
  if (isMatrixPermissionMode()) {
    return (
      canAccessScreen("QUOTATION_APPROVALS") ||
      hasPermission("QUOTATION_APPROVALS.VIEW", "QUOTATION_APPROVALS.APPROVE")
    );
  }
  return userHasRole(RoleCode.SALES_MANAGER);
}

/** รายการใบเสนอราคาที่ผู้อนุมัติเห็น — ไม่ส่ง status = รออนุมัติ */
export function usePendingQuotationApprovalsQuery(params?: QuotationQueryParams) {
  return useQuery({
    queryKey: [...quotationsQueryKey, "approvals-pending", params ?? {}],
    queryFn: () => getPendingQuotationApprovals(getAccessToken(), params),
  });
}

/** จำนวนใบเสนอราคารออนุมัติสำหรับ badge (เมนู / หน้าแรก) */
export function pendingQuotationApprovalsCountOptions(ctx?: { enabled?: boolean }) {
  return pendingCountQueryOptions({
    queryKey: pendingQuotationApprovalsCountQueryKey,
    queryFn: () => getPendingQuotationApprovals(getAccessToken()),
    select: selectDataLength,
    canAccess: canAccessQuotationApprovals,
    enabled: ctx?.enabled,
  });
}

export function useQuotationsQuery(
  params?: QuotationQueryParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [...quotationsQueryKey, "list", params ?? {}],
    queryFn: () => getQuotations(getAccessToken(), params),
    enabled: options?.enabled ?? true,
  });
}

export function useQuotationQuery(id?: string) {
  return useQuery({
    queryKey: [...quotationsQueryKey, "detail", id],
    queryFn: () => getQuotation(getAccessToken(), id as string),
    enabled: Boolean(id),
  });
}

export function useQuotationItemAvailabilityQuery(
  params?: QuotationItemAvailabilityQueryParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [...quotationsQueryKey, "item-availability", params ?? {}],
    queryFn: () => getQuotationItemAvailability(getAccessToken(), params),
    enabled: options?.enabled ?? true,
  });
}
