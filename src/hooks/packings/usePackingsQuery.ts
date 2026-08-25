"use client";

import { useQuery } from "@tanstack/react-query";

import {
  getPacking,
  getPackings,
  getReadyPickingsForPacking,
} from "@/lib/api/packings";
import { getAccessToken } from "@/lib/auth/token";
import {
  canAccessScreen,
  hasPermission,
  isMatrixPermissionMode,
} from "@/lib/auth/permissions-access";
import { RoleCode } from "@/lib/auth/role-codes";
import { isAdministrator, userHasRole } from "@/lib/auth/session";
import {
  pendingCountQueryOptions,
  selectDataLength,
} from "@/lib/query/count-query";
import type { PackingQueryParams } from "@/types/packings";

export const packingsQueryKey = ["packings"] as const;

export function usePackingsQuery(params?: PackingQueryParams) {
  return useQuery({
    queryKey: [...packingsQueryKey, "list", params ?? {}],
    queryFn: () => getPackings(getAccessToken(), params),
  });
}

export function usePackingQuery(id?: string) {
  return useQuery({
    queryKey: [...packingsQueryKey, "detail", id],
    queryFn: () => getPacking(getAccessToken(), id as string),
    enabled: Boolean(id),
  });
}

export function useReadyPickingsForPackingQuery() {
  return useQuery({
    queryKey: [...packingsQueryKey, "ready-pickings"],
    queryFn: () => getReadyPickingsForPacking(getAccessToken()),
  });
}

/** สิทธิ์เข้าหน้าใบบรรจุสินค้า (เมนู / badge) — ตรงกับ canSeeMenu ของ packings */
export function canAccessPackings(): boolean {
  if (isAdministrator()) {
    return true;
  }
  if (isMatrixPermissionMode()) {
    return (
      canAccessScreen("PACKINGS") ||
      hasPermission("PACKINGS.VIEW", "PACKINGS.APPROVE")
    );
  }
  return (
    userHasRole(RoleCode.SALES_MANAGER) ||
    userHasRole(RoleCode.WAREHOUSE_OFFICER) ||
    userHasRole(RoleCode.WAREHOUSE_MANAGER) ||
    userHasRole(RoleCode.EXECUTIVE)
  );
}

export const readyPickingsForPackingCountQueryKey = [
  ...packingsQueryKey,
  "ready-pickings",
  "count",
] as const;

/** จำนวนใบจ่ายที่พร้อมบรรจุ สำหรับ badge */
export function readyPickingsForPackingCountOptions(ctx?: {
  enabled?: boolean;
}) {
  return pendingCountQueryOptions({
    queryKey: readyPickingsForPackingCountQueryKey,
    queryFn: () => getReadyPickingsForPacking(getAccessToken()),
    select: selectDataLength,
    canAccess: canAccessPackings,
    enabled: ctx?.enabled,
  });
}
