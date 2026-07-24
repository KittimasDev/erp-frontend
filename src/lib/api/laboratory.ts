import { apiFetch } from "./client";
import type {
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
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export function getLabSamples(token: string, params?: LabSampleQueryParams) {
  return apiFetch<LabSampleListApiResponse>(
    `/api/laboratory/samples${buildQuery(params)}`,
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
