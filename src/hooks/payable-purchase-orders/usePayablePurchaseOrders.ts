"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import {
  getPayablePurchaseOrder,
  getPayablePurchaseOrders,
} from "@/lib/api/payable-purchase-orders";
import { getAccessToken } from "@/lib/auth/token";
import type { PayablePurchaseOrderQueryParams } from "@/types/payable-purchase-orders";

export const payablePurchaseOrdersQueryKey = ["payable-purchase-orders"] as const;

export function usePayablePurchaseOrdersQuery(params: PayablePurchaseOrderQueryParams) {
  return useQuery({
    queryKey: [...payablePurchaseOrdersQueryKey, "list", params],
    queryFn: async () =>
      (await getPayablePurchaseOrders(getAccessToken(), params)).data,
    placeholderData: keepPreviousData,
  });
}

export function usePayablePurchaseOrderQuery(id: string | null) {
  return useQuery({
    queryKey: [...payablePurchaseOrdersQueryKey, "detail", id],
    queryFn: async () =>
      (await getPayablePurchaseOrder(getAccessToken(), id as string)).data,
    enabled: Boolean(id),
  });
}
