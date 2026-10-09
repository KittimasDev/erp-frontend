"use client";

import { useQuery } from "@tanstack/react-query";

import {
  getProcurementSalesByItemReport,
  getProcurementStockBalanceReport,
  getProcurementStockMovementReport,
} from "@/lib/api/procurement-reports";
import { getAccessToken } from "@/lib/auth/token";
import type {
  SalesSummaryReportQuery,
  StockBalanceReportQuery,
  StockMovementSummaryReportQuery,
} from "@/types/procurement-reports";

export function useProcurementStockBalanceReportQuery(
  params: StockBalanceReportQuery,
) {
  return useQuery({
    queryKey: ["reports", "procurement", "stock-balance", params],
    queryFn: () => getProcurementStockBalanceReport(getAccessToken(), params),
  });
}

export function useProcurementStockMovementReportQuery(
  params: StockMovementSummaryReportQuery,
) {
  return useQuery({
    queryKey: ["reports", "procurement", "stock-movements", params],
    queryFn: () => getProcurementStockMovementReport(getAccessToken(), params),
  });
}

export function useProcurementSalesByItemReportQuery(
  params: SalesSummaryReportQuery,
) {
  return useQuery({
    queryKey: ["reports", "procurement", "sales-by-item", params],
    queryFn: () => getProcurementSalesByItemReport(getAccessToken(), params),
  });
}
