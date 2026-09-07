import { apiFetch } from "@/lib/api/client";
import type {
  CancelStageRunBody,
  CompleteStageRunBody,
  CreateStageRunBody,
  QueryStageRunsParams,
  StageRunApiResponse,
  StageRunListApiResponse,
} from "@/types/production-stage-run";

/**
 * เรียก API ของขั้นตอนการผลิต — ตัวเดียวใช้ได้ทั้งเตรียมยางและ rCB
 *
 * ปกติโปรเจกตนี้แยกไฟล์ api ตาม resource แต่สองโมดูลนี้ใช้สัญญาเดียวกันทุกฟิลด์
 * ต่างแค่ path — รับ `apiBase` เป็นพารามิเตอร์จึงตรงกับความจริงมากกว่าการ
 * copy ไฟล์สองอัน (path จริงเก็บไว้ที่ `components/production-stages/stage-modules.ts`)
 */

function buildQuery(params?: QueryStageRunsParams) {
  if (!params) return "";
  const search = new URLSearchParams();
  if (params.runNo?.trim()) search.set("runNo", params.runNo.trim());
  if (params.stageType?.trim()) search.set("stageType", params.stageType.trim());
  if (params.status?.trim()) search.set("status", params.status.trim());
  if (params.batchNo?.trim()) search.set("batchNo", params.batchNo.trim());
  if (params.productionOrderId)
    search.set("productionOrderId", params.productionOrderId);
  if (params.dateFrom) search.set("dateFrom", params.dateFrom);
  if (params.dateTo) search.set("dateTo", params.dateTo);
  if (params.page) search.set("page", String(params.page));
  if (params.limit) search.set("limit", String(params.limit));
  const query = search.toString();
  return query ? `?${query}` : "";
}

export function getStageRuns(
  token: string,
  apiBase: string,
  params?: QueryStageRunsParams,
) {
  return apiFetch<StageRunListApiResponse>(`${apiBase}${buildQuery(params)}`, {
    token,
  });
}

export function getStageRun(token: string, apiBase: string, id: string) {
  return apiFetch<StageRunApiResponse>(`${apiBase}/${id}`, { token });
}

export function createStageRun(
  token: string,
  apiBase: string,
  body: CreateStageRunBody,
) {
  return apiFetch<StageRunApiResponse>(apiBase, {
    method: "POST",
    token,
    body,
  });
}

/** เริ่มงาน — **ตัดสต๊อกจริงทันที** ไม่มี body */
export function startStageRun(token: string, apiBase: string, id: string) {
  return apiFetch<StageRunApiResponse>(`${apiBase}/${id}/start`, {
    method: "POST",
    token,
  });
}

/**
 * ยืนยันเสร็จงาน — **รับผลผลิตเข้าคลังจริง**
 * ไม่ส่ง body = รับตามแผน (พฤติกรรมเดิม) · ส่ง `outputActualQty` = รับตามของที่ชั่งได้
 */
export function completeStageRun(
  token: string,
  apiBase: string,
  id: string,
  body?: CompleteStageRunBody,
) {
  return apiFetch<StageRunApiResponse>(`${apiBase}/${id}/complete`, {
    method: "POST",
    token,
    body,
  });
}

/**
 * ยกเลิกรอบงาน — ร่างยกเลิกได้เลย · รอบที่เริ่มงานแล้วต้องมีเหตุผล
 * และ **วัตถุดิบที่ตัดไปแล้วไม่ถูกคืนเข้าสต๊อก**
 */
export function cancelStageRun(
  token: string,
  apiBase: string,
  id: string,
  body?: CancelStageRunBody,
) {
  return apiFetch<StageRunApiResponse>(`${apiBase}/${id}/cancel`, {
    method: "POST",
    token,
    body,
  });
}
