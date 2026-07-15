import { apiFetch } from "./client";
import type {
  CreateDepartmentRequest,
  DepartmentApiResponse,
  DepartmentListApiResponse,
  DepartmentQueryParams,
  UpdateDepartmentRequest,
} from "@/types/departments";

function buildDepartmentsQuery(params?: DepartmentQueryParams) {
  if (!params) {
    return "";
  }

  const search = new URLSearchParams();

  if (params.code?.trim()) {
    search.set("code", params.code.trim());
  }

  if (params.name?.trim()) {
    search.set("name", params.name.trim());
  }

  if (params.isActive !== undefined && params.isActive !== null) {
    search.set("isActive", String(params.isActive));
  }

  const query = search.toString();
  return query ? `?${query}` : "";
}

export function getDepartments(
  token: string,
  params?: DepartmentQueryParams,
) {
  return apiFetch<DepartmentListApiResponse>(
    `/api/master-data/departments${buildDepartmentsQuery(params)}`,
    {
      method: "GET",
      token,
    },
  );
}

export function createDepartment(
  token: string,
  body: CreateDepartmentRequest,
) {
  return apiFetch<DepartmentApiResponse>("/api/master-data/departments", {
    method: "POST",
    token,
    body,
  });
}

export function updateDepartment(
  token: string,
  id: string,
  body: UpdateDepartmentRequest,
) {
  return apiFetch<DepartmentApiResponse>(
    `/api/master-data/departments/${id}`,
    {
      method: "PATCH",
      token,
      body,
    },
  );
}

export function deleteDepartment(token: string, id: string) {
  return apiFetch<DepartmentApiResponse>(
    `/api/master-data/departments/${id}`,
    {
      method: "DELETE",
      token,
    },
  );
}
