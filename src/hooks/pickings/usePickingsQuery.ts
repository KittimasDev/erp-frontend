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
import type { PickingQueryParams } from "@/types/pickings";

export const pickingsQueryKey = ["pickings"] as const;

export const pendingDraftPickingsCountQueryKey = [
  ...pickingsQueryKey,
  "draft-count",
] as const;

const COUNT_POLL_MS = 30_000;

function countPollInterval(query: {
  state: { status: string };
}): number | false {
  if (query.state.status === "error") {
    return false;
  }
  return COUNT_POLL_MS;
}

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
    queryKey: [...pickingsQueryKey, "ready-sales-orders"],
    queryFn: () => getReadySalesOrdersForPicking(getAccessToken()),
  });
}

/** จำนวนใบจ่ายสินค้าร่าง สำหรับ badge (เมนู / หน้าแรก) */
export function usePendingDraftPickingsCountQuery(options?: {
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: pendingDraftPickingsCountQueryKey,
    queryFn: () =>
      getPickings(getAccessToken(), {
        status: "DRAFT",
      }),
    enabled:
      (options?.enabled ?? true) && hasAccessToken() && canAccessPickings(),
    refetchInterval: countPollInterval,
    refetchOnMount: true,
    refetchOnWindowFocus: (query) => query.state.status !== "error",
    retry: 1,
    select: (res) => res?.data?.length ?? 0,
  });
}
