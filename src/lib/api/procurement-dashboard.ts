import { apiFetch } from "./client";
import type {
  ProcurementSummaryApiResponse,
  ProcurementSummaryQueryParams,
  ProcurementTrackingListApiResponse,
  ProcurementTrackingQueryParams,
} from "@/types/procurement-dashboard";

function buildTrackingQuery(params?: ProcurementTrackingQueryParams) {
  if (!params) return "";
  const search = new URLSearchParams();
  if (params.poNo?.trim()) search.set("poNo", params.poNo.trim());
  if (params.prNo?.trim()) search.set("prNo", params.prNo.trim());
  if (params.status?.trim()) search.set("status", params.status.trim());
  if (params.paymentStatus?.trim())
    search.set("paymentStatus", params.paymentStatus.trim());
  if (params.dateFrom) search.set("dateFrom", params.dateFrom);
  if (params.dateTo) search.set("dateTo", params.dateTo);
  if (params.page != null) search.set("page", String(params.page));
  if (params.limit != null) search.set("limit", String(params.limit));
  const query = search.toString();
  return query ? `?${query}` : "";
}

function buildSummaryQuery(params?: ProcurementSummaryQueryParams) {
  if (!params) return "";
  const search = new URLSearchParams();
  if (params.dateFrom) search.set("dateFrom", params.dateFrom);
  if (params.dateTo) search.set("dateTo", params.dateTo);
  const query = search.toString();
  return query ? `?${query}` : "";
}

export function getProcurementTracking(
  token: string,
  params?: ProcurementTrackingQueryParams,
) {
  return apiFetch<ProcurementTrackingListApiResponse>(
    `/api/procurement/dashboard/tracking${buildTrackingQuery(params)}`,
    { method: "GET", token },
  );
}

export function getProcurementSummary(
  token: string,
  params?: ProcurementSummaryQueryParams,
) {
  return apiFetch<ProcurementSummaryApiResponse>(
    `/api/procurement/dashboard/summary${buildSummaryQuery(params)}`,
    { method: "GET", token },
  );
}
