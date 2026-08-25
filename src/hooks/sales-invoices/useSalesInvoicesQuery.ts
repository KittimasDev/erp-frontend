"use client";

import { useQuery } from "@tanstack/react-query";

import { getDocumentAttachments } from "@/lib/api/document-attachments";
import {
  getPendingSalesInvoices,
  getSalesInvoice,
  getSalesInvoiceByDelivery,
  getSalesInvoices,
} from "@/lib/api/sales-invoices";
import { getAccessToken } from "@/lib/auth/token";
import {
  ATTACHMENT_GROUP_PAYMENT,
  DOCUMENT_TYPE_SALES_INVOICE,
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
import type { SalesInvoiceQueryParams } from "@/types/sales-invoices";

export const salesInvoicesQueryKey = ["sales-invoices"] as const;

export function usePendingSalesInvoicesQuery(params?: {
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: [...salesInvoicesQueryKey, "pending", params ?? {}],
    queryFn: () => getPendingSalesInvoices(getAccessToken(), params),
  });
}

export function useSalesInvoicesQuery(params?: SalesInvoiceQueryParams) {
  return useQuery({
    queryKey: [...salesInvoicesQueryKey, "list", params ?? {}],
    queryFn: () => getSalesInvoices(getAccessToken(), params),
  });
}

export function useSalesInvoiceQuery(id?: string) {
  return useQuery({
    queryKey: [...salesInvoicesQueryKey, "detail", id],
    queryFn: () => getSalesInvoice(getAccessToken(), id as string),
    enabled: Boolean(id),
  });
}

export function useSalesInvoiceByDeliveryQuery(deliveryOrderId?: string) {
  return useQuery({
    queryKey: [...salesInvoicesQueryKey, "by-delivery", deliveryOrderId],
    queryFn: () =>
      getSalesInvoiceByDelivery(getAccessToken(), deliveryOrderId as string),
    enabled: Boolean(deliveryOrderId),
  });
}

export function useSalesInvoicePaymentAttachmentsQuery(invoiceId?: string) {
  return useQuery({
    queryKey: [...salesInvoicesQueryKey, "payment-attachments", invoiceId],
    queryFn: () =>
      getDocumentAttachments(getAccessToken(), {
        documentType: DOCUMENT_TYPE_SALES_INVOICE,
        documentId: invoiceId as string,
      }),
    enabled: Boolean(invoiceId),
    select: (res) => ({
      ...res,
      data: (res.data ?? []).filter(
        (row) => row.attachmentGroup === ATTACHMENT_GROUP_PAYMENT,
      ),
    }),
  });
}

/** สิทธิ์เข้าหน้ารอออกใบแจ้งหนี้ (เมนู / badge) — ตรงกับ canSeeMenu */
export function canAccessPendingSalesInvoices(): boolean {
  if (isAdministrator()) {
    return true;
  }
  if (isMatrixPermissionMode()) {
    return (
      canAccessScreen("SALES_INVOICES_PENDING") ||
      hasPermission("SALES_INVOICES_PENDING.VIEW")
    );
  }
  return (
    userHasRole(RoleCode.SALES_OFFICER) ||
    userHasRole(RoleCode.SALES_MANAGER) ||
    userHasRole(RoleCode.ACCOUNTING_OFFICER) ||
    userHasRole(RoleCode.EXECUTIVE)
  );
}

export const pendingSalesInvoicesCountQueryKey = [
  ...salesInvoicesQueryKey,
  "pending",
  "count",
] as const;

/** จำนวนใบส่งสินค้าที่รอออกใบแจ้งหนี้ สำหรับ badge */
export function pendingSalesInvoicesCountOptions(ctx?: { enabled?: boolean }) {
  return pendingCountQueryOptions({
    queryKey: pendingSalesInvoicesCountQueryKey,
    queryFn: () =>
      getPendingSalesInvoices(getAccessToken(), { page: 1, limit: 1 }),
    select: selectListTotal,
    canAccess: canAccessPendingSalesInvoices,
    enabled: ctx?.enabled,
  });
}
