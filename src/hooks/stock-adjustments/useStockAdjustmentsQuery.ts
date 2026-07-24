"use client";

import { useQuery } from "@tanstack/react-query";

import {
  getDocumentAttachments,
  getStockAdjustment,
  getStockAdjustments,
} from "@/lib/api/stock-adjustments";
import { getAccessToken } from "@/lib/auth/token";
import type { StockAdjustmentQueryParams } from "@/types/stock-adjustments";

export const stockAdjustmentsQueryKey = ["stock-adjustments"] as const;
export const DOCUMENT_TYPE_STOCK_ADJUSTMENT = "STOCK_ADJUSTMENT";

export function useStockAdjustmentsQuery(params?: StockAdjustmentQueryParams) {
  return useQuery({
    queryKey: [...stockAdjustmentsQueryKey, "list", params ?? {}],
    queryFn: () => getStockAdjustments(getAccessToken(), params),
  });
}

export function useStockAdjustmentQuery(id?: string) {
  return useQuery({
    queryKey: [...stockAdjustmentsQueryKey, "detail", id],
    queryFn: () => getStockAdjustment(getAccessToken(), id as string),
    enabled: Boolean(id),
  });
}

export function useStockAdjustmentAttachmentsQuery(documentId?: string) {
  return useQuery({
    queryKey: [...stockAdjustmentsQueryKey, "attachments", documentId],
    queryFn: () =>
      getDocumentAttachments(getAccessToken(), {
        documentType: DOCUMENT_TYPE_STOCK_ADJUSTMENT,
        documentId: documentId as string,
      }),
    enabled: Boolean(documentId),
  });
}
