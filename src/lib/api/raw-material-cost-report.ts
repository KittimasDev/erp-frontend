import { apiFetch } from "@/lib/api/client";
import type {
  RawMaterialCostDetailData,
  RawMaterialCostEnvelope,
  RawMaterialCostQueryParams,
  RawMaterialCostSummaryData,
} from "@/types/raw-material-cost-report";

function buildQuery(params: RawMaterialCostQueryParams) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      search.set(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

const BASE = "/api/reports/procurement/raw-material-cost";

export function getRawMaterialCostSummary(
  token: string | null,
  params: RawMaterialCostQueryParams,
) {
  return apiFetch<RawMaterialCostEnvelope<RawMaterialCostSummaryData>>(
    `${BASE}/summary${buildQuery({ ...params, q: undefined, page: undefined, limit: undefined })}`,
    { token },
  );
}

export function getRawMaterialCostDetail(
  token: string | null,
  params: RawMaterialCostQueryParams,
) {
  return apiFetch<RawMaterialCostEnvelope<RawMaterialCostDetailData>>(
    `${BASE}/detail${buildQuery(params)}`,
    { token },
  );
}
