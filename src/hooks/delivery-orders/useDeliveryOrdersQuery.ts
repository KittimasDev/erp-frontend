"use client";

import { useQuery } from "@tanstack/react-query";

import {
  getDeliveryOrder,
  getDeliveryOrders,
  getReadyPackingsForDelivery,
} from "@/lib/api/delivery-orders";
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
import type { DeliveryOrderQueryParams } from "@/types/delivery-orders";

export const deliveryOrdersQueryKey = ["delivery-orders"] as const;

export function useDeliveryOrdersQuery(params?: DeliveryOrderQueryParams) {
  return useQuery({
    queryKey: [...deliveryOrdersQueryKey, "list", params ?? {}],
    queryFn: () => getDeliveryOrders(getAccessToken(), params),
  });
}

export function useDeliveryOrderQuery(id?: string) {
  return useQuery({
    queryKey: [...deliveryOrdersQueryKey, "detail", id],
    queryFn: () => getDeliveryOrder(getAccessToken(), id as string),
    enabled: Boolean(id),
  });
}

export function useReadyPackingsForDeliveryQuery(enabled = true) {
  return useQuery({
    queryKey: [...deliveryOrdersQueryKey, "ready-packings"],
    queryFn: () => getReadyPackingsForDelivery(getAccessToken()),
    enabled,
  });
}

/** สิทธิ์เข้าหน้าใบส่งสินค้า (เมนู / badge) — ตรงกับ canSeeMenu ของ delivery-orders */
export function canAccessDeliveryOrders(): boolean {
  if (isAdministrator()) {
    return true;
  }
  if (isMatrixPermissionMode()) {
    return (
      canAccessScreen("DELIVERY_ORDERS") ||
      hasPermission("DELIVERY_ORDERS.VIEW", "DELIVERY_ORDERS.APPROVE")
    );
  }
  return (
    userHasRole(RoleCode.SALES_OFFICER) ||
    userHasRole(RoleCode.SALES_MANAGER) ||
    userHasRole(RoleCode.WAREHOUSE_OFFICER) ||
    userHasRole(RoleCode.WAREHOUSE_MANAGER) ||
    userHasRole(RoleCode.EXECUTIVE) ||
    userHasRole(RoleCode.ACCOUNTING_OFFICER)
  );
}

export const readyPackingsForDeliveryCountQueryKey = [
  ...deliveryOrdersQueryKey,
  "ready-packings",
  "count",
] as const;

/** จำนวนใบบรรจุที่พร้อมออกใบส่งสินค้า สำหรับ badge */
export function readyPackingsForDeliveryCountOptions(ctx?: {
  enabled?: boolean;
}) {
  return pendingCountQueryOptions({
    queryKey: readyPackingsForDeliveryCountQueryKey,
    queryFn: () => getReadyPackingsForDelivery(getAccessToken()),
    select: selectDataLength,
    canAccess: canAccessDeliveryOrders,
    enabled: ctx?.enabled,
  });
}
