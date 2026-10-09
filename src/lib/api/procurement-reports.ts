import { apiFetch } from "@/lib/api/client";
import type {
  ProcurementReportEnvelope,
  SalesSummaryReportExport,
  SalesSummaryReportPage,
  SalesSummaryReportQuery,
  StockBalanceReportExport,
  StockBalanceReportPage,
  StockBalanceReportQuery,
  StockMovementSummaryReportExport,
  StockMovementSummaryReportPage,
  StockMovementSummaryReportQuery,
} from "@/types/procurement-reports";

type ReportQuery =
  | StockMovementSummaryReportQuery
  | StockBalanceReportQuery
  | SalesSummaryReportQuery;

function queryString(params: ReportQuery) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      search.set(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

function getReport<T>(token: string | null, path: string, params: ReportQuery) {
  return apiFetch<ProcurementReportEnvelope<T>>(
    `/api/reports/procurement/${path}${queryString(params)}`,
    { token },
  );
}

export function getProcurementStockBalanceReport(
  token: string | null,
  params: StockBalanceReportQuery,
) {
  return getReport<StockBalanceReportPage>(token, "stock-balance", params);
}

export function exportProcurementStockBalanceReport(
  token: string | null,
  params: StockBalanceReportQuery,
) {
  return getReport<StockBalanceReportExport>(
    token,
    "stock-balance/export",
    params,
  );
}

export function getProcurementStockMovementReport(
  token: string | null,
  params: StockMovementSummaryReportQuery,
) {
  return getReport<StockMovementSummaryReportPage>(
    token,
    "stock-movements",
    params,
  );
}

export function exportProcurementStockMovementReport(
  token: string | null,
  params: StockMovementSummaryReportQuery,
) {
  return getReport<StockMovementSummaryReportExport>(
    token,
    "stock-movements/export",
    params,
  );
}

export function getProcurementSalesByItemReport(
  token: string | null,
  params: SalesSummaryReportQuery,
) {
  return getReport<SalesSummaryReportPage>(token, "sales-by-item", params);
}

export function exportProcurementSalesByItemReport(
  token: string | null,
  params: SalesSummaryReportQuery,
) {
  return getReport<SalesSummaryReportExport>(
    token,
    "sales-by-item/export",
    params,
  );
}
