"use client";

import { useQuery } from "@tanstack/react-query";

import {
  getPurchaseOrder,
  getPurchaseOrderByPr,
  getPurchaseOrders,
} from "@/lib/api/purchase-orders";
import { getAccessToken } from "@/lib/auth/token";
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
