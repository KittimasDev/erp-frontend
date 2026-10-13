import { apiFetch } from "@/lib/api/client";
import type {
  ConversionLookups,
  ConversionScaleTicket,
  EndRunDowntimeBody,
  RunDowntimeList,
  StartRunDowntimeBody,
  CancelMaterialConversionBody,
  ChemicalUsageApiResponse,
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

/** สรุปสารเคมีที่ใช้ — ส่ง runId หรือ batchNo อย่างใดอย่างหนึ่ง */
export function getChemicalUsage(
  token: string,
  params: { runId?: string; batchNo?: string },
) {
  const search = new URLSearchParams();
  if (params.runId) search.set("runId", params.runId);
  if (params.batchNo?.trim()) search.set("batchNo", params.batchNo.trim());
  return apiFetch<ChemicalUsageApiResponse>(
    `${BASE}/chemical-usage?${search.toString()}`,
    { token },
  );
}

/** เครื่องจักร + พนักงาน สำหรับฟอร์มใบแปรสภาพ (คนผลิตไม่ต้องมีสิทธิ์หน้าเครื่องจักร/ผู้ใช้) */
export function getConversionLookups(token: string) {
  return apiFetch<{ message: string; data: ConversionLookups }>(`${BASE}/lookups`, { token });
}

/** ตั๋วชั่ง Floor Scale ที่ยังไม่ถูกผูกกับบรรทัดผลผลิต (M4.3) */
export function getConversionScaleTickets(token: string) {
  return apiFetch<{ message: string; data: ConversionScaleTicket[] }>(
    `${BASE}/floor-scale-tickets`,
    { token },
  );
}

export function getRunDowntimes(token: string, id: string) {
  return apiFetch<{ message: string; data: RunDowntimeList }>(`${BASE}/${id}/downtimes`, { token });
}

export function startRunDowntime(token: string, id: string, body: StartRunDowntimeBody) {
  return apiFetch<{ message: string; data: RunDowntimeList }>(`${BASE}/${id}/downtimes`, {
    method: "POST",
    token,
    body,
  });
}

export function endRunDowntime(
  token: string,
  id: string,
  downtimeId: string,
  body: EndRunDowntimeBody,
) {
  return apiFetch<{ message: string; data: RunDowntimeList }>(
    `${BASE}/${id}/downtimes/${downtimeId}/end`,
    { method: "POST", token, body },
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
