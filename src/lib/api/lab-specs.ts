import { apiDownloadBlob, apiFetch, apiUpload } from "./client";
import type {
  CreateLabSpecBody,
  LabSpecImportAnalysis,
  LabSpecImportResult,
  LabSpec,
  UpdateLabSpecBody,
} from "@/types/laboratory";

const BASE = "/api/laboratory/specs";

type ListRes = { message: string; data: LabSpec[] };
type OneRes = { message: string; data: LabSpec };
type ResolveRes = { message: string; data: LabSpec | null };

export const getLabSpecs = (
  token: string,
  params?: { sampleType?: string; isActive?: boolean },
) => {
  const search = new URLSearchParams();
  if (params?.sampleType) search.set("sampleType", params.sampleType);
  if (params?.isActive !== undefined) search.set("isActive", String(params.isActive));
  const qs = search.toString();
  return apiFetch<ListRes>(`${BASE}${qs ? `?${qs}` : ""}`, { token });
};

/** หา Spec ที่ใช้กับตัวอย่าง (สินค้าเฉพาะก่อน แล้วของประเภท) — ไม่พบ data = null */
export const resolveLabSpec = (
  token: string,
  params: { sampleType: string; itemId?: string },
) => {
  const search = new URLSearchParams({ sampleType: params.sampleType });
  if (params.itemId) search.set("itemId", params.itemId);
  return apiFetch<ResolveRes>(`${BASE}/resolve?${search.toString()}`, { token });
};

export const createLabSpec = (token: string, body: CreateLabSpecBody) =>
  apiFetch<OneRes>(BASE, { method: "POST", token, body });

export const updateLabSpec = (token: string, id: string, body: UpdateLabSpecBody) =>
  apiFetch<OneRes>(`${BASE}/${id}`, { method: "PATCH", token, body });

export const deleteLabSpec = (token: string, id: string) =>
  apiFetch<{ message: string }>(`${BASE}/${id}`, { method: "DELETE", token });

/** Template นำเข้า Spec (Excel มี Dropdown / CSV) */
export const downloadLabSpecImportTemplate = (
  token: string,
  format: "xlsx" | "csv",
) => apiDownloadBlob(`${BASE}/import-template?format=${format}`, { token });

const toForm = (file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  return formData;
};

/** ตรวจไฟล์ + Preview (ยังไม่บันทึก) */
export const previewLabSpecImport = (token: string, file: File) =>
  apiUpload<{ message: string; data: LabSpecImportAnalysis }>(
    `${BASE}/import/preview`,
    toForm(file),
    { token },
  );

/** ยืนยันนำเข้า */
export const importLabSpecs = (token: string, file: File) =>
  apiUpload<{ message: string; data: LabSpecImportResult }>(
    `${BASE}/import`,
    toForm(file),
    { token },
  );
