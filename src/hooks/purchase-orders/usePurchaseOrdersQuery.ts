"use client";

import { useQuery } from "@tanstack/react-query";

import { getDocumentAttachments } from "@/lib/api/document-attachments";
import {
  getPurchaseOrder,
  getPurchaseOrderByPr,
  getPurchaseOrders,
} from "@/lib/api/purchase-orders";
import { getAccessToken } from "@/lib/auth/token";
import { DOCUMENT_TYPE_PO } from "@/types/document-attachments";
import type { PurchaseOrderQueryParams } from "@/types/purchase-orders";

export const purchaseOrdersQueryKey = ["purchase-orders"] as const;

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
