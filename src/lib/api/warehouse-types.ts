import { apiFetch } from "./client";
import type {
  CreateWarehouseTypeRequest,
  UpdateWarehouseTypeRequest,
  WarehouseTypeApiResponse,
  WarehouseTypeListApiResponse,
  WarehouseTypeQueryParams,
} from "@/types/warehouse-types";

function buildWarehouseTypesQuery(params?: WarehouseTypeQueryParams) {
  if (!params) {
    return "";
  }
  const search = new URLSearchParams();
  if (params.q?.trim()) {
    search.set("q", params.q.trim());
  }
  if (params.isActive !== undefined && params.isActive !== null) {
    search.set("isActive", String(params.isActive));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

export function getWarehouseTypes(
  token: string,
  params?: WarehouseTypeQueryParams,
) {
  return apiFetch<WarehouseTypeListApiResponse>(
    `/api/warehouse-types${buildWarehouseTypesQuery(params)}`,
    { method: "GET", token },
  );
}

export function createWarehouseType(
  token: string,
  body: CreateWarehouseTypeRequest,
) {
  return apiFetch<WarehouseTypeApiResponse>("/api/master-data/warehouse-types", {
    method: "POST",
    token,
    body,
  });
}

export function updateWarehouseType(
  token: string,
  id: string,
  body: UpdateWarehouseTypeRequest,
) {
  return apiFetch<WarehouseTypeApiResponse>(
    `/api/master-data/warehouse-types/${id}`,
    { method: "PATCH", token, body },
  );
}

export function deleteWarehouseType(token: string, id: string) {
  return apiFetch<WarehouseTypeApiResponse>(
    `/api/master-data/warehouse-types/${id}`,
    { method: "DELETE", token },
  );
}
