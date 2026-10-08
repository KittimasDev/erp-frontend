import { apiFetch } from "@/lib/api/client";
import type {
  ProcurementReportEnvelope,
  ProcurementReportExport,
  ProcurementReportPage,
  ProcurementReportQuery,
  ProcurementSalesByItemRow,
  ProcurementStockBalanceRow,
  ProcurementStockMovementRow,
} from "@/types/procurement-reports";

function queryString(params: ProcurementReportQuery) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      search.set(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

function getReport<T>(token: string | null, path: string, params: ProcurementReportQuery) {
  return apiFetch<ProcurementReportEnvelope<T>>(
    `/api/reports/procurement/${path}${queryString(params)}`,
    { token },
  );
}

export function getProcurementStockBalanceReport(
  token: string | null,
  params: ProcurementReportQuery,
) {
  return getReport<ProcurementReportPage<ProcurementStockBalanceRow>>(
    token,
    "stock-balance",
    params,
  );
}

export function exportProcurementStockBalanceReport(
  token: string | null,
  params: ProcurementReportQuery,
) {
  return getReport<ProcurementReportExport<ProcurementStockBalanceRow>>(
    token,
    "stock-balance/export",
    params,
  );
}

export function getProcurementStockMovementReport(
  token: string | null,
  params: ProcurementReportQuery,
) {
  return getReport<ProcurementReportPage<ProcurementStockMovementRow>>(
    token,
    "stock-movements",
    params,
  );
}

export function exportProcurementStockMovementReport(
  token: string | null,
  params: ProcurementReportQuery,
) {
  return getReport<ProcurementReportExport<ProcurementStockMovementRow>>(
    token,
    "stock-movements/export",
    params,
  );
}

export function getProcurementSalesByItemReport(
  token: string | null,
  params: ProcurementReportQuery,
) {
  return getReport<ProcurementReportPage<ProcurementSalesByItemRow>>(
    token,
    "sales-by-item",
    params,
  );
}

export function exportProcurementSalesByItemReport(
  token: string | null,
  params: ProcurementReportQuery,
) {
  return getReport<ProcurementReportExport<ProcurementSalesByItemRow>>(
    token,
    "sales-by-item/export",
    params,
  );
}
