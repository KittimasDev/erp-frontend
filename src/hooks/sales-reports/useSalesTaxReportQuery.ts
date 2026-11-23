"use client";

import { useQuery } from "@tanstack/react-query";

import { getSalesTaxReport } from "@/lib/api/sales-tax-report";
import { getAccessToken } from "@/lib/auth/token";
import type { SalesTaxReportQuery } from "@/types/sales-tax-report";

export function useSalesTaxReportQuery(params: SalesTaxReportQuery) {
  return useQuery({
    queryKey: ["reports", "sales-tax", params],
    queryFn: () => getSalesTaxReport(getAccessToken(), params),
  });
}
