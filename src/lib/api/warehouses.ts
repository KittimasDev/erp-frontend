import { apiFetch } from "./client";
import type {
  CreateWarehouseRequest,
  UpdateWarehouseRequest,
  WarehouseApiResponse,
  WarehouseListApiResponse,
  WarehouseQueryParams,
} from "@/types/warehouses";

function buildWarehousesQuery(params?: WarehouseQueryParams) {
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

  if (params.warehouseGroup?.trim()) {
    search.set("warehouseGroup", params.warehouseGroup.trim());
  }

  if (params.description?.trim()) {
    search.set("description", params.description.trim());
  }

  if (params.isActive !== undefined && params.isActive !== null) {
    search.set("isActive", String(params.isActive));
  }

  if (
    params.allowNegativeStock !== undefined &&
    params.allowNegativeStock !== null
  ) {
    search.set("allowNegativeStock", String(params.allowNegativeStock));
  }

  if (params.isQcRequired !== undefined && params.isQcRequired !== null) {
    search.set("isQcRequired", String(params.isQcRequired));
  }

  const query = search.toString();
  return query ? `?${query}` : "";
}

export function getWarehouses(token: string, params?: WarehouseQueryParams) {
  return apiFetch<WarehouseListApiResponse>(
    `/api/master-data/warehouses${buildWarehousesQuery(params)}`,
    {
      method: "GET",
      token,
    },
  );
}

export function createWarehouse(token: string, body: CreateWarehouseRequest) {
  return apiFetch<WarehouseApiResponse>("/api/master-data/warehouses", {
    method: "POST",
    token,
    body,
  });
}

export function updateWarehouse(
  token: string,
  id: string,
  body: UpdateWarehouseRequest,
) {
  return apiFetch<WarehouseApiResponse>(`/api/master-data/warehouses/${id}`, {
    method: "PATCH",
    token,
    body,
  });
}

export function deleteWarehouse(token: string, id: string) {
  return apiFetch<WarehouseApiResponse>(`/api/master-data/warehouses/${id}`, {
    method: "DELETE",
    token,
  });
}
