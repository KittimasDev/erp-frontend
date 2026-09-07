"use client";

import { useQuery } from "@tanstack/react-query";

import { canAccessBadgeScreen } from "@/hooks/badges/badge-access";
import {
  getDocumentAttachments,
  getStockAdjustment,
  getStockAdjustments,
} from "@/lib/api/stock-adjustments";
import { getStockCounts } from "@/lib/api/stock-counts";
import {
  pendingCountQueryOptions,
  selectListTotal,
} from "@/lib/query/count-query";
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

/**
 * คิว "นับและปรับปรุงสต๊อกวัตถุดิบ" สำหรับ badge (เมนู / หน้าแรก)
 *
 * เมนู `rm-stock-control` รวมสองหน้าไว้ด้วยกัน (ใบปรับปรุง + ใบตรวจนับ)
 * badge จึงต้องรวมยอดสองคิว — ยิงคู่กันแล้วบวก ไม่แยกเป็นสอง entry เพราะ
 * ทะเบียน badge ผูก 1 entry ต่อ 1 menuKey (menuKey ซ้ำจะทับกัน)
 *
 * ใบปรับปรุงมีขั้นส่งอนุมัติของตัวเอง → นับ PENDING_APPROVAL
 * ใบตรวจนับไม่มีขั้นนั้น สร้างแล้วรออนุมัติเลย → นับ DRAFT
 */
export const pendingStockControlCountQueryKey = [
  "stock-control",
  "pending",
  "count",
] as const;

export function pendingStockControlCountOptions(ctx?: { enabled?: boolean }) {
  return pendingCountQueryOptions({
    queryKey: pendingStockControlCountQueryKey,
    queryFn: async () => {
      const token = getAccessToken();
      const [adjustments, counts] = await Promise.all([
        getStockAdjustments(token, {
          status: "PENDING_APPROVAL",
          page: 1,
          limit: 1,
        }),
        getStockCounts(token, { status: "DRAFT", page: 1, limit: 1 }),
      ]);
      return { adjustments, counts };
    },
    select: (res) => selectListTotal(res.adjustments) + selectListTotal(res.counts),
    canAccess: () =>
      canAccessBadgeScreen("STOCK_CONTROL", "STOCK_ADJUSTMENTS", "STOCK_COUNTS"),
    enabled: ctx?.enabled,
  });
}
