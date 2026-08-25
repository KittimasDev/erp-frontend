"use client";

import { useQuery } from "@tanstack/react-query";

import { getDocumentAttachments } from "@/lib/api/document-attachments";
import {
  getPendingPurchaseOrderApprovals,
  getPurchaseOrder,
  getPurchaseOrderByPr,
  getPurchaseOrders,
} from "@/lib/api/purchase-orders";
import {
  canAccessScreen,
  hasPermission,
  isMatrixPermissionMode,
} from "@/lib/auth/permissions-access";
import { RoleCode } from "@/lib/auth/role-codes";
import { isAdministrator, userHasRole } from "@/lib/auth/session";
import { getAccessToken, hasAccessToken } from "@/lib/auth/token";
import { DOCUMENT_TYPE_PO } from "@/types/document-attachments";
import type { PurchaseOrderQueryParams } from "@/types/purchase-orders";

export const purchaseOrdersQueryKey = ["purchase-orders"] as const;

export const pendingPurchaseOrderApprovalsCountQueryKey = [
  ...purchaseOrdersQueryKey,
  "approvals-pending-count",
] as const;

const COUNT_POLL_MS = 30_000;

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

/** สิทธิ์เข้าหน้าใบสั่งซื้อรออนุมัติ (เมนู / badge) — ตรงกับ canSeeMenu */
export function canAccessPurchaseOrderApprovals(): boolean {
  if (isAdministrator()) {
    return true;
  }
  if (isMatrixPermissionMode()) {
    return (
      canAccessScreen("PURCHASE_ORDER_APPROVALS") ||
      hasPermission(
        "PURCHASE_ORDER_APPROVALS.VIEW",
        "PURCHASE_ORDER_APPROVALS.APPROVE",
      )
    );
  }
  return userHasRole(RoleCode.PROCUREMENT_MANAGER);
}

export function usePendingPurchaseOrderApprovalsQuery(
  params?: PurchaseOrderQueryParams,
) {
  return useQuery({
    queryKey: [...purchaseOrdersQueryKey, "approvals-pending", params ?? {}],
    queryFn: () => getPendingPurchaseOrderApprovals(getAccessToken(), params),
  });
}

/** จำนวน PO รออนุมัติสำหรับ badge (เมนู / หน้าแรก) */
export function usePendingPurchaseOrderApprovalsCountQuery(options?: {
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: pendingPurchaseOrderApprovalsCountQueryKey,
    queryFn: () =>
      getPendingPurchaseOrderApprovals(getAccessToken(), {
        page: 1,
        limit: 1,
      }),
    enabled:
      (options?.enabled ?? true) &&
      hasAccessToken() &&
      canAccessPurchaseOrderApprovals(),
    refetchInterval: COUNT_POLL_MS,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    retry: 2,
    select: selectListTotal,
  });
}

export function usePurchaseOrdersQuery(params?: PurchaseOrderQueryParams) {
  return useQuery({
    queryKey: [...purchaseOrdersQueryKey, "list", params ?? {}],
    queryFn: () => getPurchaseOrders(getAccessToken(), params),
  });
}

export function usePurchaseOrderQuery(id?: string) {
  return useQuery({
    queryKey: [...purchaseOrdersQueryKey, "detail", id],
    queryFn: () => getPurchaseOrder(getAccessToken(), id as string),
    enabled: Boolean(id),
  });
}

export function usePurchaseOrderByPrQuery(purchaseRequestId?: string) {
  return useQuery({
    queryKey: [...purchaseOrdersQueryKey, "by-pr", purchaseRequestId],
    queryFn: () =>
      getPurchaseOrderByPr(getAccessToken(), purchaseRequestId as string),
    enabled: Boolean(purchaseRequestId),
  });
}

export function usePurchaseOrderAttachmentsQuery(documentId?: string) {
  return useQuery({
    queryKey: [...purchaseOrdersQueryKey, "attachments", documentId],
    queryFn: () =>
      getDocumentAttachments(getAccessToken(), {
        documentType: DOCUMENT_TYPE_PO,
        documentId: documentId as string,
      }),
    enabled: Boolean(documentId),
  });
}
