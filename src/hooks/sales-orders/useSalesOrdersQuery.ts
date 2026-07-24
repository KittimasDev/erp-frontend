"use client";

import { useQuery } from "@tanstack/react-query";

import {
  getPendingStockVerification,
  getSalesOrder,
  getSalesOrderAvailableWarehouses,
  getSalesOrders,
  getSalesOrderStockVerification,
} from "@/lib/api/sales-orders";
import { getAccessToken } from "@/lib/auth/token";
import type { SalesOrderQueryParams } from "@/types/sales-orders";

export const salesOrdersQueryKey = ["sales-orders"] as const;

export function useSalesOrdersQuery(params?: SalesOrderQueryParams) {
  return useQuery({
    queryKey: [...salesOrdersQueryKey, "list", params ?? {}],
    queryFn: () => getSalesOrders(getAccessToken(), params),
  });
}

export function useSalesOrderQuery(id?: string) {
  return useQuery({
    queryKey: [...salesOrdersQueryKey, "detail", id],
    queryFn: () => getSalesOrder(getAccessToken(), id as string),
    enabled: Boolean(id),
  });
}

export function usePendingStockVerificationQuery() {
  return useQuery({
    queryKey: [...salesOrdersQueryKey, "stock-verification-pending"],
    queryFn: () => getPendingStockVerification(getAccessToken()),
  });
}

export function useSalesOrderStockVerificationQuery(id?: string) {
  return useQuery({
    queryKey: [...salesOrdersQueryKey, "stock-verification", id],
    queryFn: () =>
      getSalesOrderStockVerification(getAccessToken(), id as string),
    enabled: Boolean(id),
  });
}

export function useSalesOrderAvailableWarehousesQuery(id?: string) {
  return useQuery({
    queryKey: [...salesOrdersQueryKey, "available-warehouses", id],
    queryFn: () =>
      getSalesOrderAvailableWarehouses(getAccessToken(), id as string),
    enabled: Boolean(id),
  });
}
