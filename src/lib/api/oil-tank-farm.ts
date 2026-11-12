import { ApiError, apiFetch } from "./client";
import { resolveLabSpec } from "./lab-specs";
import type {
  CreateOilDispatchBody,
  CreateOilReceivingBody,
  CreateOilTankBody,
  CreateOilTransferBody,
  OilDispatchApiResponse,
  OilDispatchListApiResponse,
  OilReceivingApiResponse,
  OilReceivingListApiResponse,
  OilTankApiResponse,
  OilTankListApiResponse,
  OilTankReadingApiResponse,
  OilTankReadingListApiResponse,
  OilTransferApiResponse,
  OilTransferListApiResponse,
  TankBalanceReportApiResponse,
  UpdateOilTankBody,
} from "@/types/oil-tank-farm";

const BASE = "/api/oil-tank-farm";

// ── Tanks ──
export const getOilTanks = (token: string) => apiFetch<OilTankListApiResponse>(`${BASE}/tanks`, { method: "GET", token });
export const createOilTank = (token: string, body: CreateOilTankBody) =>
  apiFetch<OilTankApiResponse>(`${BASE}/tanks`, { method: "POST", token, body });
export const updateOilTank = (token: string, id: string, body: UpdateOilTankBody) =>
  apiFetch<OilTankApiResponse>(`${BASE}/tanks/${id}`, { method: "PATCH", token, body });

export const getTankReadings = (token: string, tankId: string) =>
  apiFetch<OilTankReadingListApiResponse>(`${BASE}/tanks/${tankId}/readings`, { method: "GET", token });
export const recordTankReading = (
  token: string,
  tankId: string,
  body: { measuredAt: string; measuredLiters: number; note?: string },
) => apiFetch<OilTankReadingApiResponse>(`${BASE}/tanks/${tankId}/readings`, { method: "POST", token, body });
export const adjustTankReading = (token: string, readingId: string, note?: string) =>
  apiFetch<OilTankReadingApiResponse>(`${BASE}/tanks/readings/${readingId}/adjust`, { method: "POST", token, body: { note } });
export const ignoreTankReading = (token: string, readingId: string, note?: string) =>
  apiFetch<OilTankReadingApiResponse>(`${BASE}/tanks/readings/${readingId}/ignore`, { method: "POST", token, body: { note } });

export const getTankBalanceReport = (
  token: string,
  params: { from: string; to: string; granularity: string; tankId?: string },
) => {
  const search = new URLSearchParams({ from: params.from, to: params.to, granularity: params.granularity });
  if (params.tankId) search.set("tankId", params.tankId);
  return apiFetch<TankBalanceReportApiResponse>(`${BASE}/tanks/balance-report?${search.toString()}`, { method: "GET", token });
};

// ── Receivings ──
export const getOilReceivings = (token: string) =>
  apiFetch<OilReceivingListApiResponse>(`${BASE}/receivings`, { method: "GET", token });
export const createOilReceiving = (token: string, body: CreateOilReceivingBody) =>
  apiFetch<OilReceivingApiResponse>(`${BASE}/receivings`, { method: "POST", token, body });
export const postOilReceiving = (token: string, id: string) =>
  apiFetch<OilReceivingApiResponse>(`${BASE}/receivings/${id}/post`, { method: "POST", token });
export const cancelOilReceiving = (token: string, id: string) =>
  apiFetch<OilReceivingApiResponse>(`${BASE}/receivings/${id}/cancel`, { method: "POST", token });

/** ส่งตัวอย่างน้ำมันของใบรับนี้ให้ Lab — ผล Lab อนุมัติ/ตีกลับจะปล่อย/ปฏิเสธ Lot อัตโนมัติ */
export const createLabSampleForReceiving = async (
  token: string,
  body: {
    collectedDate: string;
    referenceDocId: string;
    referenceDocNo: string;
    itemId?: string;
    lotId?: string;
  },
) => {
  if (!body.itemId) {
    throw new ApiError("ใบรับนี้ยังไม่มี Lot/สินค้า — ส่งตัวอย่าง Lab ไม่ได้", 400);
  }
  // ตัวอย่างต้องผูก Spec — ใช้ Spec เริ่มต้น (สินค้าเฉพาะ → ของประเภทน้ำมัน) ผู้ใช้เปลี่ยนได้ที่หน้าตัวอย่าง
  const spec = await resolveLabSpec(token, { sampleType: "OIL", itemId: body.itemId });
  if (!spec.data) {
    throw new ApiError("ยังไม่มี Spec การตรวจของน้ำมัน — สร้างที่หน้า Spec การตรวจก่อน", 400);
  }
  return apiFetch<{ message: string; data: { id: string; sampleNo: string } }>("/api/laboratory/samples", {
    method: "POST",
    token,
    body: {
      sampleType: "OIL",
      collectedDate: body.collectedDate,
      itemId: body.itemId,
      specId: spec.data.id,
      lotId: body.lotId,
      referenceDocType: "OIL_RECEIVING",
      referenceDocId: body.referenceDocId,
      referenceDocNo: body.referenceDocNo,
    },
  });
};

// ── Transfers ──
export const getOilTransfers = (token: string) =>
  apiFetch<OilTransferListApiResponse>(`${BASE}/transfers`, { method: "GET", token });
export const createOilTransfer = (token: string, body: CreateOilTransferBody) =>
  apiFetch<OilTransferApiResponse>(`${BASE}/transfers`, { method: "POST", token, body });
export const approveOilTransfer = (token: string, id: string) =>
  apiFetch<OilTransferApiResponse>(`${BASE}/transfers/${id}/approve`, { method: "POST", token });
export const cancelOilTransfer = (token: string, id: string) =>
  apiFetch<OilTransferApiResponse>(`${BASE}/transfers/${id}/cancel`, { method: "POST", token });

// ── Dispatches ──
export const getOilDispatches = (token: string) =>
  apiFetch<OilDispatchListApiResponse>(`${BASE}/dispatches`, { method: "GET", token });
export const createOilDispatch = (token: string, body: CreateOilDispatchBody) =>
  apiFetch<OilDispatchApiResponse>(`${BASE}/dispatches`, { method: "POST", token, body });
export const approveOilDispatch = (token: string, id: string) =>
  apiFetch<OilDispatchApiResponse>(`${BASE}/dispatches/${id}/approve`, { method: "POST", token });
export const cancelOilDispatch = (token: string, id: string) =>
  apiFetch<OilDispatchApiResponse>(`${BASE}/dispatches/${id}/cancel`, { method: "POST", token });
