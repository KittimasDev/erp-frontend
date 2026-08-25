"use client";

import { useQuery } from "@tanstack/react-query";

import {
  getPendingStockVerification,
  getSalesOrder,
  getSalesOrderAvailableWarehouses,
  getSalesOrderReservationStatus,
  getSalesOrders,
  getSalesOrderStockVerification,
} from "@/lib/api/sales-orders";
import { getDocumentAttachments } from "@/lib/api/document-attachments";
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
import { DOCUMENT_TYPE_SO } from "@/types/document-attachments";
import type { SalesOrderQueryParams } from "@/types/sales-orders";

import { SALES_ORDER_LIVE_QUERY_OPTIONS } from "./invalidate-sales-order-flow";

export const salesOrdersQueryKey = ["sales-orders"] as const;

export function useSalesOrdersQuery(params?: SalesOrderQueryParams) {
  return useQuery({
    queryKey: [...salesOrdersQueryKey, "list", params ?? {}],
    queryFn: () => getSalesOrders(getAccessToken(), params),
  });
}

export function useSalesOrderQuery(id?: string) {
  return useQuery({
    queryKey: [...salesOrdersQueryKey, "detail", id],
    queryFn: () => getSalesOrder(getAccessToken(), id as string),
    enabled: Boolean(id),
    ...SALES_ORDER_LIVE_QUERY_OPTIONS,
  });
}

export const pendingStockVerificationQueryKey = [
  ...salesOrdersQueryKey,
  "stock-verification-pending",
] as const;

/** key ของ badge แยกจาก list — กัน cache entry เดียวกันแต่ options ต่างกันชนกัน */
export const pendingStockVerificationCountQueryKey = [
  ...pendingStockVerificationQueryKey,
  "count",
] as const;

/** สิทธิ์เข้าหน้าตรวจสอบสต๊อกขาย (เมนู / badge) — ตรงกับ canSeeMenu ของ sd-stock-verification */
export function canAccessSalesStockVerification(): boolean {
  if (isAdministrator()) {
    return true;
  }
  if (isMatrixPermissionMode()) {
    return (
      canAccessScreen("SALES_STOCK_VERIFICATION") ||
      hasPermission(
        "SALES_STOCK_VERIFICATION.VIEW",
        "SALES_STOCK_VERIFICATION.APPROVE",
      )
    );
  }
  return (
    userHasRole(RoleCode.SALES_OFFICER) ||
    userHasRole(RoleCode.SALES_MANAGER) ||
    userHasRole(RoleCode.WAREHOUSE_OFFICER) ||
    userHasRole(RoleCode.WAREHOUSE_MANAGER) ||
    userHasRole(RoleCode.EXECUTIVE)
  );
}

export function usePendingStockVerificationQuery() {
  return useQuery({
    queryKey: pendingStockVerificationQueryKey,
    queryFn: () => getPendingStockVerification(getAccessToken()),
  });
}

/** จำนวน SO ที่รอตรวจสอบสต๊อก — ใช้ที่ badge เมนู sidebar / กล่องคลังสำเร็จรูปหน้าแรก */
export function pendingStockVerificationCountOptions(ctx?: {
  enabled?: boolean;
}) {
  return pendingCountQueryOptions({
    queryKey: pendingStockVerificationCountQueryKey,
    queryFn: () => getPendingStockVerification(getAccessToken()),
    select: selectDataLength,
    canAccess: canAccessSalesStockVerification,
    enabled: ctx?.enabled,
  });
}

export function usePendingStockVerificationCountQuery(options?: {
  enabled?: boolean;
}) {
  return useQuery(pendingStockVerificationCountOptions(options));
}

export function useSalesOrderStockVerificationQuery(id?: string) {
  return useQuery({
    queryKey: [...salesOrdersQueryKey, "stock-verification", id],
    queryFn: () =>
      getSalesOrderStockVerification(getAccessToken(), id as string),
    enabled: Boolean(id),
    ...SALES_ORDER_LIVE_QUERY_OPTIONS,
  });
}

export function useSalesOrderReservationStatusQuery(id?: string) {
  return useQuery({
    queryKey: [...salesOrdersQueryKey, "reservation-status", id],
    queryFn: () =>
      getSalesOrderReservationStatus(getAccessToken(), id as string),
    enabled: Boolean(id),
    ...SALES_ORDER_LIVE_QUERY_OPTIONS,
  });
}

export function useSalesOrderAvailableWarehousesQuery(id?: string) {
  return useQuery({
    queryKey: [...salesOrdersQueryKey, "available-warehouses", id],
    queryFn: () =>
      getSalesOrderAvailableWarehouses(getAccessToken(), id as string),
    enabled: Boolean(id),
  });
}

export function useSalesOrderAttachmentsQuery(documentId?: string) {
  return useQuery({
    queryKey: [...salesOrdersQueryKey, "attachments", documentId],
    queryFn: () =>
      getDocumentAttachments(getAccessToken(), {
        documentType: DOCUMENT_TYPE_SO,
        documentId: documentId as string,
      }),
    enabled: Boolean(documentId),
  });
}
