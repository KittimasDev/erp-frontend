import { apiFetch } from "./client";
import type {
  CreateSectionRequest,
  SectionApiResponse,
  SectionListApiResponse,
  SectionQueryParams,
  UpdateSectionRequest,
} from "@/types/sections";

function buildSectionsQuery(params?: SectionQueryParams) {
  if (!params) {
    return "";
  }
  const search = new URLSearchParams();
  if (params.name?.trim()) {
    search.set("name", params.name.trim());
  }
  if (params.departmentId) {
    search.set("departmentId", params.departmentId);
  }
  if (params.isActive !== undefined && params.isActive !== null) {
    search.set("isActive", String(params.isActive));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

export function getSections(token: string, params?: SectionQueryParams) {
  return apiFetch<SectionListApiResponse>(
    `/api/master-data/sections${buildSectionsQuery(params)}`,
    { method: "GET", token },
  );
}

export function createSection(token: string, body: CreateSectionRequest) {
  return apiFetch<SectionApiResponse>("/api/master-data/sections", {
    method: "POST",
    token,
    body,
  });
}

export function updateSection(
  token: string,
  id: string,
  body: UpdateSectionRequest,
) {
  return apiFetch<SectionApiResponse>(`/api/master-data/sections/${id}`, {
    method: "PATCH",
    token,
    body,
  });
}

export function deleteSection(token: string, id: string) {
  return apiFetch<SectionApiResponse>(`/api/master-data/sections/${id}`, {
    method: "DELETE",
    token,
  });
}
