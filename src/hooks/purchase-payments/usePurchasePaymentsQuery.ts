"use client";

import { useQuery } from "@tanstack/react-query";

import {
  getPendingPurchasePayments,
  getPurchasePayment,
  getPurchasePaymentByPo,
  getPurchasePayments,
} from "@/lib/api/purchase-payments";
import { getAccessToken } from "@/lib/auth/token";
import type { SupplierPaymentQueryParams } from "@/types/purchase-payments";

export const purchasePaymentsQueryKey = ["purchase-payments"] as const;

export function usePendingPurchasePaymentsQuery(params?: {
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: [...purchasePaymentsQueryKey, "pending", params ?? {}],
    queryFn: () => getPendingPurchasePayments(getAccessToken(), params),
  });
}

export function usePurchasePaymentsQuery(params?: SupplierPaymentQueryParams) {
  return useQuery({
    queryKey: [...purchasePaymentsQueryKey, "list", params ?? {}],
    queryFn: () => getPurchasePayments(getAccessToken(), params),
  });
}

export function usePurchasePaymentQuery(id?: string) {
  return useQuery({
    queryKey: [...purchasePaymentsQueryKey, "detail", id],
    queryFn: () => getPurchasePayment(getAccessToken(), id as string),
    enabled: Boolean(id),
  });
}

export function usePurchasePaymentByPoQuery(purchaseOrderId?: string) {
  return useQuery({
    queryKey: [...purchasePaymentsQueryKey, "by-po", purchaseOrderId],
    queryFn: () =>
      getPurchasePaymentByPo(getAccessToken(), purchaseOrderId as string),
    enabled: Boolean(purchaseOrderId),
  });
}
