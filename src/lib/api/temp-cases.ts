import { apiDownloadBlob, apiFetch, apiUpload } from "./client";
import type {
  CreateTempCaseRequest,
  TempCaseApiResponse,
  TempCaseCategoryListApiResponse,
  TempCaseImageListApiResponse,
  TempCaseListApiResponse,
  TempCaseStatus,
  TempCaseSummaryApiResponse,
  UpdateTempCaseRequest,
} from "@/types/temp-cases";
import type { DocumentAttachmentApiResponse } from "@/types/document-attachments";

export type TempCaseQueryParams = {
  status?: TempCaseStatus;
};

function buildQuery(params?: TempCaseQueryParams) {
  if (!params?.status) {
    return "";
  }
  const search = new URLSearchParams();
  search.set("status", params.status);
  return `?${search.toString()}`;
}

export function getTempCaseCategories(token: string) {
  return apiFetch<TempCaseCategoryListApiResponse>(
    "/api/temp-cases/categories",
    {
      method: "GET",
      token,
    },
  );
}

export function getTempCaseSummary(token: string) {
  return apiFetch<TempCaseSummaryApiResponse>("/api/temp-cases/summary", {
    method: "GET",
    token,
  });
}

export function getTempCases(token: string, params?: TempCaseQueryParams) {
  return apiFetch<TempCaseListApiResponse>(
    `/api/temp-cases${buildQuery(params)}`,
    {
      method: "GET",
      token,
    },
  );
}

export function createTempCase(token: string, body: CreateTempCaseRequest) {
  return apiFetch<TempCaseApiResponse>("/api/temp-cases", {
    method: "POST",
    token,
    body,
  });
}

export function updateTempCase(
  token: string,
  id: string,
  body: UpdateTempCaseRequest,
) {
  return apiFetch<TempCaseApiResponse>(`/api/temp-cases/${id}`, {
    method: "PATCH",
    token,
    body,
  });
}

export function deleteTempCase(token: string, id: string) {
  return apiFetch<TempCaseApiResponse>(`/api/temp-cases/${id}`, {
    method: "DELETE",
    token,
  });
}

export function getTempCaseImages(token: string, caseId: string) {
  return apiFetch<TempCaseImageListApiResponse>(
    `/api/temp-cases/${caseId}/images`,
    {
      method: "GET",
      token,
    },
  );
}

export function uploadTempCaseImage(
  token: string,
  caseId: string,
  file: File,
) {
  const formData = new FormData();
  formData.append("file", file);
  return apiUpload<DocumentAttachmentApiResponse>(
    `/api/temp-cases/${caseId}/images`,
    formData,
    { token },
  );
}

/** Reuse shared attachment download endpoint */
export function downloadTempCaseImage(token: string, attachmentId: string) {
  return apiDownloadBlob(`/api/documents/attachments/${attachmentId}/download`, {
    token,
  });
}
