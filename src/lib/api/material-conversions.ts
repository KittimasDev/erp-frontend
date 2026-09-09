import { apiFetch } from "@/lib/api/client";
import type {
  CancelMaterialConversionBody,
  CompleteMaterialConversionBody,
  CreateMaterialConversionBody,
  MaterialConversionApiResponse,
  MaterialConversionListApiResponse,
  QueryMaterialConversionsParams,
  StepSkipCheckApiResponse,
} from "@/types/material-conversion";

const BASE = "/api/production/material-conversions";

function buildQuery(params?: QueryMaterialConversionsParams) {
  if (!params) return "";
  const search = new URLSearchParams();
  if (params.runNo?.trim()) search.set("runNo", params.runNo.trim());
  if (params.routeId) search.set("routeId", params.routeId);
  if (params.stepCode?.trim()) search.set("stepCode", params.stepCode.trim());
  if (params.status?.trim()) search.set("status", params.status.trim());
  if (params.batchNo?.trim()) search.set("batchNo", params.batchNo.trim());
  if (params.productionOrderId)
    search.set("productionOrderId", params.productionOrderId);
  if (params.dateFrom) search.set("dateFrom", params.dateFrom);
  if (params.dateTo) search.set("dateTo", params.dateTo);
  if (params.includeLegacy !== undefined)
    search.set("includeLegacy", String(params.includeLegacy));
  if (params.jobId) search.set("jobId", params.jobId);
  if (params.hasJob !== undefined) search.set("hasJob", String(params.hasJob));
  if (params.page) search.set("page", String(params.page));
  if (params.limit) search.set("limit", String(params.limit));
  const query = search.toString();
  return query ? `?${query}` : "";
}

export function getMaterialConversions(
  token: string,
  params?: QueryMaterialConversionsParams,
) {
  return apiFetch<MaterialConversionListApiResponse>(
    `${BASE}${buildQuery(params)}`,
    { token },
  );
}

export function getMaterialConversion(token: string, id: string) {
  return apiFetch<MaterialConversionApiResponse>(`${BASE}/${id}`, { token });
}

/** เตือนก่อนกดบันทึกว่ามีการข้ามขั้นหรือไม่ — เตือนเท่านั้น ไม่บล็อก */
export function checkStepSkip(
  token: string,
  params: { routeId: string; stepId: string; batchNo?: string },
) {
  const search = new URLSearchParams({
    routeId: params.routeId,
    stepId: params.stepId,
  });
  if (params.batchNo?.trim()) search.set("batchNo", params.batchNo.trim());
  return apiFetch<StepSkipCheckApiResponse>(
    `${BASE}/step-skip-check?${search.toString()}`,
    { token },
  );
}

export function createMaterialConversion(
  token: string,
  body: CreateMaterialConversionBody,
) {
  return apiFetch<MaterialConversionApiResponse>(BASE, {
    method: "POST",
    token,
    body,
  });
}

/** เริ่มงาน — **ตัดสต๊อกวัตถุดิบทุกบรรทัดจริงทันที** */
export function startMaterialConversion(
  token: string,
  id: string,
  body?: { inputs?: Array<{ lineId: string; actualQty: number }>; remark?: string },
) {
  return apiFetch<MaterialConversionApiResponse>(`${BASE}/${id}/start`, {
    method: "POST",
    token,
    body,
  });
}

/** ปิดงาน — **ผลผลิตทุกบรรทัดเข้าคลังจริง** พร้อม Lot แยกต่อบรรทัด */
export function completeMaterialConversion(
  token: string,
  id: string,
  body?: CompleteMaterialConversionBody,
) {
  return apiFetch<MaterialConversionApiResponse>(`${BASE}/${id}/complete`, {
    method: "POST",
    token,
    body,
  });
}

/** ยกเลิก — **วัตถุดิบที่ตัดไปแล้วไม่ถูกคืนเข้าสต๊อก** */
export function cancelMaterialConversion(
  token: string,
  id: string,
  body?: CancelMaterialConversionBody,
) {
  return apiFetch<MaterialConversionApiResponse>(`${BASE}/${id}/cancel`, {
    method: "POST",
    token,
    body,
  });
}
