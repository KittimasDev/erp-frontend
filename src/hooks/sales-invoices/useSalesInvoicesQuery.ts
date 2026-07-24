"use client";

import { useQuery } from "@tanstack/react-query";

import {
  getPendingSalesInvoices,
  getSalesInvoice,
  getSalesInvoiceByDelivery,
  getSalesInvoices,
} from "@/lib/api/sales-invoices";
import { getAccessToken } from "@/lib/auth/token";
import type { SalesInvoiceQueryParams } from "@/types/sales-invoices";

export const salesInvoicesQueryKey = ["sales-invoices"] as const;

export function usePendingSalesInvoicesQuery(params?: {
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: [...salesInvoicesQueryKey, "pending", params ?? {}],
    queryFn: () => getPendingSalesInvoices(getAccessToken(), params),
  });
}

export function useSalesInvoicesQuery(params?: SalesInvoiceQueryParams) {
  return useQuery({
    queryKey: [...salesInvoicesQueryKey, "list", params ?? {}],
    queryFn: () => getSalesInvoices(getAccessToken(), params),
  });
}

export function useSalesInvoiceQuery(id?: string) {
  return useQuery({
    queryKey: [...salesInvoicesQueryKey, "detail", id],
    queryFn: () => getSalesInvoice(getAccessToken(), id as string),
    enabled: Boolean(id),
  });
}

export function useSalesInvoiceByDeliveryQuery(deliveryOrderId?: string) {
  return useQuery({
    queryKey: [...salesInvoicesQueryKey, "by-delivery", deliveryOrderId],
    queryFn: () =>
      getSalesInvoiceByDelivery(getAccessToken(), deliveryOrderId as string),
    enabled: Boolean(deliveryOrderId),
  });
}
