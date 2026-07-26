import { apiFetch } from "./client";
import type {
  ArAgingReportApiResponse,
  QueryArAgingReportParams,
  QuerySalesInvoiceSummaryReportParams,
  QuerySalesPaymentReportParams,
  SalesInvoiceSummaryReportApiResponse,
  SalesPaymentReportApiResponse,
} from "@/types/sales-reports";

function buildQuery(params?: Record<string, unknown>) {
  if (!params) return "";
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value));
    }
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

async function downloadCsv(
  path: string,
  token: string,
  params: Record<string, unknown> | undefined,
  fallbackFilename: string,
) {
  const response = await fetch(`${path}${buildQuery(params)}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error("ดาวน์โหลดรายงานไม่สำเร็จ");
  }

  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition");
  const match = disposition?.match(/filename="?([^"]+)"?/);
  const filename = match?.[1] ?? fallbackFilename;

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export function getArAgingReport(
  token: string,
  params?: QueryArAgingReportParams,
) {
  return apiFetch<ArAgingReportApiResponse>(
    `/api/reports/ar-aging${buildQuery(params)}`,
    { method: "GET", token },
  );
}

export function downloadArAgingReportCsv(
  token: string,
  params?: QueryArAgingReportParams,
) {
  return downloadCsv(
    "/api/reports/ar-aging/export",
    token,
    params,
    "ar-aging-report.csv",
  );
}

export function getSalesInvoiceSummaryReport(
  token: string,
  params?: QuerySalesInvoiceSummaryReportParams,
) {
  return apiFetch<SalesInvoiceSummaryReportApiResponse>(
    `/api/reports/sales-invoices${buildQuery(params)}`,
    { method: "GET", token },
  );
}

export function downloadSalesInvoiceSummaryReportCsv(
  token: string,
  params?: QuerySalesInvoiceSummaryReportParams,
) {
  return downloadCsv(
    "/api/reports/sales-invoices/export",
    token,
    params,
    "sales-invoice-summary-report.csv",
  );
}

export function getSalesPaymentReport(
  token: string,
  params?: QuerySalesPaymentReportParams,
) {
  return apiFetch<SalesPaymentReportApiResponse>(
    `/api/reports/sales-payments${buildQuery(params)}`,
    { method: "GET", token },
  );
}

export function downloadSalesPaymentReportCsv(
  token: string,
  params?: QuerySalesPaymentReportParams,
) {
  return downloadCsv(
    "/api/reports/sales-payments/export",
    token,
    params,
    "sales-payment-report.csv",
  );
}
