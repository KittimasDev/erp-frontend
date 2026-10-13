import { apiFetch } from "./client";
import type {
  CreateLabSpecBody,
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
