import { apiDownloadBlob, apiFetch, apiUpload } from "./client";
import type {
  AddLabResultLine,
  CreateLabSampleBody,
  LabCoa,
  LabSampleImportAnalysis,
  LabSampleImportResult,
  LabCoaQueryParams,
  ReviewLabSampleBody,
  UpdateLabResultBody,
  LabSampleApiResponse,
  LabSampleCoaApiResponse,
  LabSampleListApiResponse,
  LabSampleQueryParams,
  LabSampleQrCodeApiResponse,
} from "@/types/laboratory";

function buildQuery(params?: LabSampleQueryParams) {
  if (!params) return "";
  const search = new URLSearchParams();
  if (params.sampleNo?.trim()) search.set("sampleNo", params.sampleNo.trim());
  if (params.status) search.set("status", params.status);
  if (params.sampleType) search.set("sampleType", params.sampleType);
  if (params.referenceDocId) search.set("referenceDocId", params.referenceDocId);
  if (params.lotId) search.set("lotId", params.lotId);
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export function getLabSamples(token: string, params?: LabSampleQueryParams) {
  return apiFetch<LabSampleListApiResponse>(
    `/api/laboratory/samples${buildQuery(params)}`,
    { token },
  );
}

/** ลงทะเบียนตัวอย่างใหม่ (M8.1) — ส่ง lotId แล้ว backend ดึงสินค้า/Batch ให้ */
export function createLabSample(token: string, body: CreateLabSampleBody) {
  return apiFetch<LabSampleApiResponse>("/api/laboratory/samples", {
    method: "POST",
    token,
    body,
  });
}

/** บันทึกผลตรวจ — ส่ง specParameterId แล้ว backend ดึงหน่วย/เกณฑ์และตัดสิน PASS/FAIL ให้ */
export function addLabResults(
  token: string,
  id: string,
  results: AddLabResultLine[],
) {
  return apiFetch<LabSampleApiResponse>(`/api/laboratory/samples/${id}/results`, {
    method: "POST",
    token,
    body: { results },
  });
}

export function updateLabResult(
  token: string,
  id: string,
  resultId: string,
  body: UpdateLabResultBody,
) {
  return apiFetch<LabSampleApiResponse>(
    `/api/laboratory/samples/${id}/results/${resultId}`,
    { method: "PATCH", token, body },
  );
}

/** Template นำเข้าตัวอย่าง+ผลตรวจ (Excel มี Dropdown/ชีตอ้างอิง · CSV) */
export const downloadLabSampleImportTemplate = (
  token: string,
  format: "xlsx" | "csv",
) =>
  apiDownloadBlob(`/api/laboratory/samples/import-template?format=${format}`, {
    token,
  });

const toForm = (file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  return formData;
};

export const previewLabSampleImport = (token: string, file: File) =>
  apiUpload<{ message: string; data: LabSampleImportAnalysis }>(
    "/api/laboratory/samples/import/preview",
    toForm(file),
    { token },
  );

export const importLabSamples = (token: string, file: File) =>
  apiUpload<{ message: string; data: LabSampleImportResult }>(
    "/api/laboratory/samples/import",
    toForm(file),
    { token },
  );

/** เลือก Spec ให้ตัวอย่างเก่าที่ยังไม่มี Spec */
export function setLabSampleSpec(token: string, id: string, specId: string) {
  return apiFetch<LabSampleApiResponse>(`/api/laboratory/samples/${id}/spec`, {
    method: "PATCH",
    token,
    body: { specId },
  });
}

export function deleteLabResult(token: string, id: string, resultId: string) {
  return apiFetch<LabSampleApiResponse>(
    `/api/laboratory/samples/${id}/results/${resultId}`,
    { method: "DELETE", token },
  );
}

/** อนุมัติ/ตีกลับผลตรวจ — ต้องยืนยันรหัสผ่าน (ลายเซ็นอิเล็กทรอนิกส์) */
export function reviewLabSample(
  token: string,
  id: string,
  action: "approve" | "reject",
  body: ReviewLabSampleBody,
) {
  return apiFetch<LabSampleApiResponse>(
    `/api/laboratory/samples/${id}/${action}`,
    { method: "POST", token, body },
  );
}

export function reissueLabCoa(token: string, id: string, reason: string) {
  return apiFetch<{ message: string; data: LabCoa }>(
    `/api/laboratory/samples/${id}/coa/reissue`,
    { method: "POST", token, body: { reason } },
  );
}

export function getLabCoaHistory(token: string, params?: LabCoaQueryParams) {
  const search = new URLSearchParams();
  if (params?.coaNo?.trim()) search.set("coaNo", params.coaNo.trim());
  if (params?.lotNo?.trim()) search.set("lotNo", params.lotNo.trim());
  if (params?.sampleNo?.trim()) search.set("sampleNo", params.sampleNo.trim());
  if (params?.status) search.set("status", params.status);
  if (params?.dateFrom) search.set("dateFrom", params.dateFrom);
  if (params?.dateTo) search.set("dateTo", params.dateTo);
  const qs = search.toString();
  return apiFetch<{ message: string; data: LabCoa[] }>(
    `/api/laboratory/samples/coas/history${qs ? `?${qs}` : ""}`,
    { token },
  );
}

export function getLabSample(token: string, id: string) {
  return apiFetch<LabSampleApiResponse>(`/api/laboratory/samples/${id}`, {
    token,
  });
}

export function getLabSampleCoa(token: string, id: string) {
  return apiFetch<LabSampleCoaApiResponse>(
    `/api/laboratory/samples/${id}/coa`,
    { token },
  );
}

export function getLabSampleQrCode(token: string, id: string) {
  return apiFetch<LabSampleQrCodeApiResponse>(
    `/api/laboratory/samples/${id}/qrcode`,
    { token },
  );
}
