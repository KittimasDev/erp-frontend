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
import {
  pendingCountQueryOptions,
  selectListTotal,
} from "@/lib/query/count-query";
import { DOCUMENT_TYPE_PO } from "@/types/document-attachments";
import type { PurchaseOrderQueryParams } from "@/types/purchase-orders";

export const purchaseOrdersQueryKey = ["purchase-orders"] as const;

export const pendingPurchaseOrderApprovalsCountQueryKey = [
  ...purchaseOrdersQueryKey,
  "approvals-pending-count",
] as const;


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
export function pendingPurchaseOrderApprovalsCountOptions(ctx?: {
  enabled?: boolean;
}) {
  return pendingCountQueryOptions({
    queryKey: pendingPurchaseOrderApprovalsCountQueryKey,
    queryFn: () =>
      getPendingPurchaseOrderApprovals(getAccessToken(), {
        page: 1,
        limit: 1,
      }),
    select: selectListTotal,
    canAccess: canAccessPurchaseOrderApprovals,
    enabled: ctx?.enabled,
  });
}

export function usePendingPurchaseOrderApprovalsCountQuery(options?: {
  enabled?: boolean;
}) {
  return useQuery(pendingPurchaseOrderApprovalsCountOptions(options));
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
