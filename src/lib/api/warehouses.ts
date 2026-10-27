import { apiFetch } from "./client";
import type { Warehouse3DLayoutConfig } from "@/types/warehouse-3d";
import type {
  CreateWarehouseRequest,
  UpdateWarehouseRequest,
  Warehouse,
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

  if (params.menuScope?.trim()) {
    search.set("menuScope", params.menuScope.trim());
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
    `/api/warehouses${buildWarehousesQuery(params)}`,
    {
      method: "GET",
      token,
    },
  );
}

export function getWarehouse(token: string, id: string) {
  return apiFetch<WarehouseApiResponse>(`/api/warehouses/${id}`, {
    method: "GET",
    token,
  });
}

export function createWarehouse(token: string, body: CreateWarehouseRequest) {
  return apiFetch<WarehouseApiResponse>("/api/warehouses", {
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
  return apiFetch<WarehouseApiResponse>(`/api/warehouses/${id}`, {
    method: "PATCH",
    token,
    body,
  });
}

export function activateWarehouse(token: string, id: string) {
  return apiFetch<WarehouseApiResponse>(`/api/warehouses/${id}/activate`, {
    method: "PATCH",
    token,
  });
}

export function deactivateWarehouse(token: string, id: string) {
  return apiFetch<WarehouseApiResponse>(`/api/warehouses/${id}/deactivate`, {
    method: "PATCH",
    token,
  });
}

export function getWarehouse3DLayout(token: string, id: string) {
  return apiFetch<{
    statusCode: number;
    message: string;
    data: {
      warehouse: Warehouse;
      layout3dConfig: Warehouse3DLayoutConfig | null;
      locations: Array<{
        id: string;
        warehouseId: string;
        locationCode: string;
        locationName: string;
        description?: string;
        isActive: boolean;
      }>;
    };
  }>(`/api/warehouses/${id}/layout-3d`, {
    method: "GET",
    token,
  });
}

export function updateWarehouse3DLayout(
  token: string,
  id: string,
  layout3dConfig: Warehouse3DLayoutConfig,
) {
  return apiFetch<{
    statusCode: number;
    message: string;
    data: Warehouse;
  }>(`/api/warehouses/${id}/layout-3d`, {
    method: "PUT",
    token,
    body: { layout3dConfig },
  });
}
