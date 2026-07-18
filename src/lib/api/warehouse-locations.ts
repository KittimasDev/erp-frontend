import { apiFetch } from "./client";
import type {
  CreateWarehouseLocationRequest,
  UpdateWarehouseLocationRequest,
  WarehouseLocationApiResponse,
  WarehouseLocationListApiResponse,
  WarehouseLocationQueryParams,
} from "@/types/warehouse-locations";

function buildWarehouseLocationsQuery(params?: WarehouseLocationQueryParams) {
  if (!params) {
    return "";
  }

  const search = new URLSearchParams();

  if (params.warehouseId?.trim()) {
    search.set("warehouseId", params.warehouseId.trim());
  }

  if (params.code?.trim()) {
    search.set("code", params.code.trim());
  }

  if (params.name?.trim()) {
    search.set("name", params.name.trim());
  }

  if (params.description?.trim()) {
    search.set("description", params.description.trim());
  }

  if (params.isActive !== undefined && params.isActive !== null) {
    search.set("isActive", String(params.isActive));
  }

  const query = search.toString();
  return query ? `?${query}` : "";
}

export function getWarehouseLocations(
  token: string,
  params?: WarehouseLocationQueryParams,
) {
  return apiFetch<WarehouseLocationListApiResponse>(
    `/api/warehouse-locations${buildWarehouseLocationsQuery(params)}`,
    {
      method: "GET",
      token,
    },
  );
}

export function getWarehouseLocation(token: string, id: string) {
  return apiFetch<WarehouseLocationApiResponse>(
    `/api/warehouse-locations/${id}`,
    {
      method: "GET",
      token,
    },
  );
}

export function createWarehouseLocation(
  token: string,
  body: CreateWarehouseLocationRequest,
) {
  return apiFetch<WarehouseLocationApiResponse>("/api/warehouse-locations", {
    method: "POST",
    token,
    body,
  });
}

export function updateWarehouseLocation(
  token: string,
  id: string,
  body: UpdateWarehouseLocationRequest,
) {
  return apiFetch<WarehouseLocationApiResponse>(
    `/api/warehouse-locations/${id}`,
    {
      method: "PATCH",
      token,
      body,
    },
  );
}

export function activateWarehouseLocation(token: string, id: string) {
  return apiFetch<WarehouseLocationApiResponse>(
    `/api/warehouse-locations/${id}/activate`,
    {
      method: "PATCH",
      token,
    },
  );
}

export function deactivateWarehouseLocation(token: string, id: string) {
  return apiFetch<WarehouseLocationApiResponse>(
    `/api/warehouse-locations/${id}/deactivate`,
    {
      method: "PATCH",
      token,
    },
  );
}
