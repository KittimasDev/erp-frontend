import { apiFetch } from "@/lib/api/client";
import type {
  CancelMaterialConversionJobBody,
  CloseMaterialConversionJobBody,
  CreateMaterialConversionJobBody,
  MaterialConversionJobApiResponse,
  MaterialConversionJobListApiResponse,
  QueryMaterialConversionJobsParams,
} from "@/types/material-conversion";

const BASE = "/api/production/material-conversion-jobs";

function buildQuery(params?: QueryMaterialConversionJobsParams) {
  if (!params) return "";
  const search = new URLSearchParams();
  if (params.jobNo?.trim()) search.set("jobNo", params.jobNo.trim());
  if (params.routeId) search.set("routeId", params.routeId);
  if (params.batchNo?.trim()) search.set("batchNo", params.batchNo.trim());
  if (params.status?.trim()) search.set("status", params.status.trim());
  if (params.progressStatus?.trim())
    search.set("progressStatus", params.progressStatus.trim());
  if (params.productionOrderId)
    search.set("productionOrderId", params.productionOrderId);
  if (params.dateFrom) search.set("dateFrom", params.dateFrom);
  if (params.dateTo) search.set("dateTo", params.dateTo);
  if (params.page) search.set("page", String(params.page));
  if (params.limit) search.set("limit", String(params.limit));
  const query = search.toString();
  return query ? `?${query}` : "";
}

export function getMaterialConversionJobs(
  token: string,
  params?: QueryMaterialConversionJobsParams,
) {
  return apiFetch<MaterialConversionJobListApiResponse>(
    `${BASE}${buildQuery(params)}`,
    { token },
  );
}

export function getMaterialConversionJob(token: string, id: string) {
  return apiFetch<MaterialConversionJobApiResponse>(`${BASE}/${id}`, { token });
}

/** เปิดใบงาน — **ยังไม่สร้างเอกสารขั้นตอนใด ๆ และไม่แตะสต๊อก** */
export function createMaterialConversionJob(
  token: string,
  body: CreateMaterialConversionJobBody,
) {
  return apiFetch<MaterialConversionJobApiResponse>(BASE, {
    method: "POST",
    token,
    body,
  });
}

/** ปิดใบงาน — ขั้นที่ยังไม่เคยเปิดเอกสารถือว่าไม่ทำแล้ว · ไม่แตะสต๊อก */
export function closeMaterialConversionJob(
  token: string,
  id: string,
  body?: CloseMaterialConversionJobBody,
) {
  return apiFetch<MaterialConversionJobApiResponse>(`${BASE}/${id}/close`, {
    method: "POST",
    token,
    body,
  });
}

export function reopenMaterialConversionJob(token: string, id: string) {
  return apiFetch<MaterialConversionJobApiResponse>(`${BASE}/${id}/reopen`, {
    method: "POST",
    token,
  });
}

/** ยกเลิกทั้งใบ — **ทำได้ก็ต่อเมื่อยังไม่มีขั้นไหนตัดสต๊อก** */
export function cancelMaterialConversionJob(
  token: string,
  id: string,
  body?: CancelMaterialConversionJobBody,
) {
  return apiFetch<MaterialConversionJobApiResponse>(`${BASE}/${id}/cancel`, {
    method: "POST",
    token,
    body,
  });
}
