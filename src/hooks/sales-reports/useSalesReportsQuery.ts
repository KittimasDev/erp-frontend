"use client";

import { useQuery } from "@tanstack/react-query";

import {
  getArAgingReport,
  getSalesInvoiceSummaryReport,
  getSalesPaymentReport,
} from "@/lib/api/sales-reports";
import { getAccessToken } from "@/lib/auth/token";
import type {
  QueryArAgingReportParams,
  QuerySalesInvoiceSummaryReportParams,
  QuerySalesPaymentReportParams,
} from "@/types/sales-reports";

export function useArAgingReportQuery(params?: QueryArAgingReportParams) {
  return useQuery({
    queryKey: ["reports", "ar-aging", params ?? {}],
    queryFn: () => getArAgingReport(getAccessToken(), params),
  });
}

export function useSalesInvoiceSummaryReportQuery(
  params?: QuerySalesInvoiceSummaryReportParams,
) {
  return useQuery({
    queryKey: ["reports", "sales-invoices", params ?? {}],
    queryFn: () => getSalesInvoiceSummaryReport(getAccessToken(), params),
  });
}

export function useSalesPaymentReportQuery(
  params?: QuerySalesPaymentReportParams,
) {
  return useQuery({
    queryKey: ["reports", "sales-payments", params ?? {}],
    queryFn: () => getSalesPaymentReport(getAccessToken(), params),
  });
}
