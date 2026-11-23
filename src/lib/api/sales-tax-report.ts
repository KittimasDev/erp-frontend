import { apiFetch } from "@/lib/api/client";
import type { SalesTaxReportApiResponse, SalesTaxReportQuery } from "@/types/sales-tax-report";

export function getSalesTaxReport(token: string | null, params: SalesTaxReportQuery) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const qs = search.toString();
  return apiFetch<SalesTaxReportApiResponse>(`/api/reports/sales-tax${qs ? `?${qs}` : ""}`, { token });
}
