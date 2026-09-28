"use client";

import { useQuery } from "@tanstack/react-query";

import { getDocumentAttachments } from "@/lib/api/document-attachments";
import {
  getPendingPurchasePayments,
  getPurchasePayment,
  getPurchasePaymentByPo,
  getPurchasePayments,
} from "@/lib/api/purchase-payments";
import { getAccessToken } from "@/lib/auth/token";
import {
  ATTACHMENT_GROUP_PAYMENT,
  DOCUMENT_TYPE_SUPPLIER_PAYMENT,
} from "@/types/document-attachments";
import {
  canAccessScreen,
  hasPermission,
  isMatrixPermissionMode,
} from "@/lib/auth/permissions-access";
import { RoleCode } from "@/lib/auth/role-codes";
import { isAdministrator, userHasRole } from "@/lib/auth/session";
import {
  pendingCountQueryOptions,
  selectListTotal,
} from "@/lib/query/count-query";
import type { SupplierPaymentQueryParams } from "@/types/purchase-payments";

export const purchasePaymentsQueryKey = ["purchase-payments"] as const;

export function usePendingPurchasePaymentsQuery(params?: {
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: [...purchasePaymentsQueryKey, "pending", params ?? {}],
    queryFn: () => getPendingPurchasePayments(getAccessToken(), params),
  });
}

export function usePurchasePaymentsQuery(params?: SupplierPaymentQueryParams) {
  return useQuery({
    queryKey: [...purchasePaymentsQueryKey, "list", params ?? {}],
    queryFn: () => getPurchasePayments(getAccessToken(), params),
  });
}

export function usePurchasePaymentQuery(id?: string) {
  return useQuery({
    queryKey: [...purchasePaymentsQueryKey, "detail", id],
    queryFn: () => getPurchasePayment(getAccessToken(), id as string),
    enabled: Boolean(id),
  });
}

export function usePurchasePaymentByPoQuery(purchaseOrderId?: string) {
  return useQuery({
    queryKey: [...purchasePaymentsQueryKey, "by-po", purchaseOrderId],
    queryFn: () =>
      getPurchasePaymentByPo(getAccessToken(), purchaseOrderId as string),
    enabled: Boolean(purchaseOrderId),
  });
}

export function usePurchasePaymentAttachmentsQuery(voucherId?: string) {
  return useQuery({
    queryKey: [...purchasePaymentsQueryKey, "attachments", voucherId],
    queryFn: () =>
      getDocumentAttachments(getAccessToken(), {
        documentType: DOCUMENT_TYPE_SUPPLIER_PAYMENT,
        documentId: voucherId as string,
      }),
    enabled: Boolean(voucherId),
    select: (res) => ({
      ...res,
      data: (res.data ?? []).filter(
        (row) => row.attachmentGroup === ATTACHMENT_GROUP_PAYMENT,
      ),
    }),
  });
}

/** สิทธิ์เข้าหน้ารอจ่ายเงิน Supplier (เมนู / badge) — ตรงกับ canSeeMenu */
export function canAccessPendingPurchasePayments(): boolean {
  if (isAdministrator()) {
    return true;
  }
  if (isMatrixPermissionMode()) {
    return (
      canAccessScreen("PURCHASE_PAYMENTS_PENDING") ||
      hasPermission("PURCHASE_PAYMENTS_PENDING.VIEW")
    );
  }
  return userHasRole(RoleCode.ACCOUNTING_OFFICER);
}

export const pendingPurchasePaymentsCountQueryKey = [
  ...purchasePaymentsQueryKey,
  "pending",
  "count",
] as const;

/** จำนวน PO ที่รอจ่ายเงิน Supplier สำหรับ badge */
export function pendingPurchasePaymentsCountOptions(ctx?: {
  enabled?: boolean;
}) {
  return pendingCountQueryOptions({
    queryKey: pendingPurchasePaymentsCountQueryKey,
    queryFn: () =>
      getPendingPurchasePayments(getAccessToken(), { page: 1, limit: 1 }),
    select: selectListTotal,
    canAccess: canAccessPendingPurchasePayments,
    enabled: ctx?.enabled,
  });
}
