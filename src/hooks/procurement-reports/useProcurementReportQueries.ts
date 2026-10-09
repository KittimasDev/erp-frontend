"use client";

import { useQuery } from "@tanstack/react-query";

import {
  getProcurementSalesByItemReport,
  getProcurementStockBalanceReport,
  getProcurementStockMovementReport,
} from "@/lib/api/procurement-reports";
import { getAccessToken } from "@/lib/auth/token";
import type {
  ProcurementReportQuery,
  StockBalanceReportQuery,
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
  params: ProcurementReportQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: ["reports", "procurement", "stock-movements", params],
    queryFn: () => getProcurementStockMovementReport(getAccessToken(), params),
    enabled,
  });
}

export function useProcurementSalesByItemReportQuery(
  params: ProcurementReportQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: ["reports", "procurement", "sales-by-item", params],
    queryFn: () => getProcurementSalesByItemReport(getAccessToken(), params),
    enabled,
  });
}
