import { apiFetch } from "@/lib/api/client";
import type {
  ProductionDashboardRangeParams,
  ProductionDashboardSummaryApiResponse,
  ProductionDashboardSummaryParams,
  ProductionDowntimeApiResponse,
  ProductionStageProgressApiResponse,
  ProductionWorkInProgressApiResponse,
} from "@/types/production-dashboard";

function rangeQuery(params: ProductionDashboardRangeParams) {
  const search = new URLSearchParams();
  if (params.from) search.set("from", params.from);
  if (params.to) search.set("to", params.to);
  return search;
}

export function getProductionDashboardSummary(
  token: string,
  params: ProductionDashboardSummaryParams = {},
) {
  const search = rangeQuery(params);
  if (params.bucket) search.set("bucket", params.bucket);
  const query = search.toString();
  return apiFetch<ProductionDashboardSummaryApiResponse>(
    `/api/dashboard/production/summary${query ? `?${query}` : ""}`,
    { token },
  );
}

/** ไม่รับช่วงวันที่ — งานที่ค้างมาจากสามสัปดาห์ก่อนคือสิ่งที่ต้องเห็นที่สุด */
export function getProductionWorkInProgress(token: string) {
  return apiFetch<ProductionWorkInProgressApiResponse>(
    "/api/dashboard/production/work-in-progress",
    { token },
  );
}

export function getProductionDowntimeSummary(
  token: string,
  params: ProductionDashboardRangeParams = {},
) {
  const query = rangeQuery(params).toString();
  return apiFetch<ProductionDowntimeApiResponse>(
    `/api/dashboard/production/downtime${query ? `?${query}` : ""}`,
    { token },
  );
}

export function getProductionStageProgress(
  token: string,
  params: ProductionDashboardRangeParams = {},
) {
  const query = rangeQuery(params).toString();
  return apiFetch<ProductionStageProgressApiResponse>(
    `/api/dashboard/production/stage-progress${query ? `?${query}` : ""}`,
    { token },
  );
}
