"use client";

import { useQuery } from "@tanstack/react-query";

import {
  getDuePurchaseOrders,
  getGoodsReceipt,
  getGoodsReceipts,
  getGoodsReceiptsByPo,
} from "@/lib/api/goods-receipts";
import { getAccessToken } from "@/lib/auth/token";
import type { GoodsReceiptQueryParams } from "@/types/goods-receipts";

export const goodsReceiptsQueryKey = ["goods-receipts"] as const;

export function useGoodsReceiptsQuery(params?: GoodsReceiptQueryParams) {
  return useQuery({
    queryKey: [...goodsReceiptsQueryKey, "list", params ?? {}],
    queryFn: () => getGoodsReceipts(getAccessToken(), params),
  });
}

export function useGoodsReceiptQuery(id?: string) {
  return useQuery({
    queryKey: [...goodsReceiptsQueryKey, "detail", id],
    queryFn: () => getGoodsReceipt(getAccessToken(), id as string),
    enabled: Boolean(id),
  });
}

export function useDuePurchaseOrdersQuery() {
  return useQuery({
    queryKey: [...goodsReceiptsQueryKey, "due-purchase-orders"],
    queryFn: () => getDuePurchaseOrders(getAccessToken()),
  });
}

export function useGoodsReceiptsByPoQuery(purchaseOrderId?: string) {
  return useQuery({
    queryKey: [...goodsReceiptsQueryKey, "by-po", purchaseOrderId],
    queryFn: () =>
      getGoodsReceiptsByPo(getAccessToken(), purchaseOrderId as string),
    enabled: Boolean(purchaseOrderId),
  });
}
