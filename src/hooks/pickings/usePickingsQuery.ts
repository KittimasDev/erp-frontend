"use client";

import { useQuery } from "@tanstack/react-query";

import {
  getPicking,
  getPickings,
  getReadySalesOrdersForPicking,
} from "@/lib/api/pickings";
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
import type { PickingQueryParams } from "@/types/pickings";

export const pickingsQueryKey = ["pickings"] as const;

export const readySalesOrdersForPickingQueryKey = [
  ...pickingsQueryKey,
  "ready-sales-orders",
] as const;

/**
 * แยก key ของ badge ออกจาก key ของ list — เดิมใช้ key เดียวกันทำให้เป็น cache
 * entry เดียวกันแต่ options ต่างกัน (enabled / refetchInterval / select)
 * observer ตัวไหน mount ก่อนก็ชนะ · key นี้เป็นส่วนขยายของ prefix เดิม
 * ดังนั้น invalidate ด้วย pickingsQueryKey ยังรีเฟรช badge ให้ด้วย
 */
export const readySalesOrdersForPickingCountQueryKey = [
  ...readySalesOrdersForPickingQueryKey,
  "count",
] as const;

/** สิทธิ์เข้าหน้ารายการใบจ่ายสินค้า (เมนู / badge) — ตรงกับ canSeeMenu */
export function canAccessPickings(): boolean {
  if (isAdministrator()) {
    return true;
  }
  if (isMatrixPermissionMode()) {
    return (
      canAccessScreen("PICKINGS") ||
      hasPermission("PICKINGS.VIEW", "PICKINGS.APPROVE")
    );
  }
  return (
    userHasRole(RoleCode.SALES_MANAGER) ||
    userHasRole(RoleCode.SALES_OFFICER) ||
    userHasRole(RoleCode.WAREHOUSE_OFFICER) ||
    userHasRole(RoleCode.WAREHOUSE_MANAGER) ||
    userHasRole(RoleCode.EXECUTIVE)
  );
}

export function usePickingsQuery(params?: PickingQueryParams) {
  return useQuery({
    queryKey: [...pickingsQueryKey, "list", params ?? {}],
    queryFn: () => getPickings(getAccessToken(), params),
  });
}

export function usePickingQuery(id?: string) {
  return useQuery({
    queryKey: [...pickingsQueryKey, "detail", id],
    queryFn: () => getPicking(getAccessToken(), id as string),
    enabled: Boolean(id),
  });
}

export function useReadySalesOrdersForPickingQuery() {
  return useQuery({
    queryKey: readySalesOrdersForPickingQueryKey,
    queryFn: () => getReadySalesOrdersForPicking(getAccessToken()),
    enabled: hasAccessToken(),
  });
}

/** จำนวน SO ที่พร้อมสร้างใบจ่าย — ใช้ร่วมกันที่ปุ่มสร้างจาก SO / เมนู / หน้าแรก */
export function readySalesOrdersForPickingCountOptions(ctx?: {
  enabled?: boolean;
}) {
  return pendingCountQueryOptions({
    queryKey: readySalesOrdersForPickingCountQueryKey,
    queryFn: () => getReadySalesOrdersForPicking(getAccessToken()),
    select: selectDataLength,
    canAccess: canAccessPickings,
    enabled: ctx?.enabled,
  });
}

export function useReadySalesOrdersForPickingCountQuery(options?: {
  enabled?: boolean;
}) {
  return useQuery(readySalesOrdersForPickingCountOptions(options));
}
