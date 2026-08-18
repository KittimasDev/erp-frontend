"use client";

import { useQuery } from "@tanstack/react-query";

import {
  getPendingStockVerification,
  getSalesOrder,
  getSalesOrderAvailableWarehouses,
  getSalesOrderReservationStatus,
  getSalesOrders,
  getSalesOrderStockVerification,
} from "@/lib/api/sales-orders";
import { getAccessToken } from "@/lib/auth/token";
import type { SalesOrderQueryParams } from "@/types/sales-orders";

import { SALES_ORDER_LIVE_QUERY_OPTIONS } from "./invalidate-sales-order-flow";

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
    ...SALES_ORDER_LIVE_QUERY_OPTIONS,
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
    ...SALES_ORDER_LIVE_QUERY_OPTIONS,
  });
}

export function useSalesOrderReservationStatusQuery(id?: string) {
  return useQuery({
    queryKey: [...salesOrdersQueryKey, "reservation-status", id],
    queryFn: () =>
      getSalesOrderReservationStatus(getAccessToken(), id as string),
    enabled: Boolean(id),
    ...SALES_ORDER_LIVE_QUERY_OPTIONS,
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
