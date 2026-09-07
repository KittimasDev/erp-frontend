"use client";

import { useQuery } from "@tanstack/react-query";

import { canAccessBadgeScreen } from "@/hooks/badges/badge-access";
import { getStockTransfer, getStockTransfers } from "@/lib/api/stock-transfers";
import {
  pendingCountQueryOptions,
  selectListTotal,
} from "@/lib/query/count-query";
import { getAccessToken } from "@/lib/auth/token";
import type { StockTransferQueryParams } from "@/types/stock-transfers";

export const stockTransfersQueryKey = ["stock-transfers"] as const;

export function useStockTransfersQuery(params?: StockTransferQueryParams) {
  return useQuery({
    queryKey: [...stockTransfersQueryKey, "list", params ?? {}],
    queryFn: () => getStockTransfers(getAccessToken(), params),
  });
}

export function useStockTransferQuery(id?: string) {
  return useQuery({
    queryKey: [...stockTransfersQueryKey, "detail", id],
    queryFn: () => getStockTransfer(getAccessToken(), id as string),
    enabled: Boolean(id),
  });
}

/** คิวใบโอนย้ายสินค้าที่รออนุมัติ สำหรับ badge (เมนู / หน้าแรก) */
export const pendingStockTransfersCountQueryKey = [
  ...stockTransfersQueryKey,
  "pending",
  "count",
] as const;

export function pendingStockTransfersCountOptions(ctx?: { enabled?: boolean }) {
  return pendingCountQueryOptions({
    queryKey: pendingStockTransfersCountQueryKey,
    queryFn: () =>
      getStockTransfers(getAccessToken(), {
        status: "DRAFT",
        page: 1,
        limit: 1,
      }),
    select: selectListTotal,
    canAccess: () => canAccessBadgeScreen("STOCK_TRANSFERS"),
    enabled: ctx?.enabled,
  });
}
