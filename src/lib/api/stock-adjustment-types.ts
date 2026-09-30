import { apiFetch } from "./client";
import type {
  CreateStockAdjustmentTypeRequest,
  StockAdjustmentTypeApiResponse,
  StockAdjustmentTypeListApiResponse,
  StockAdjustmentTypeQueryParams,
  UpdateStockAdjustmentTypeRequest,
} from "@/types/stock-adjustment-types";

function buildStockAdjustmentTypesQuery(
  params?: StockAdjustmentTypeQueryParams,
) {
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

  if (params.description?.trim()) {
    search.set("description", params.description.trim());
  }

  if (params.isActive !== undefined && params.isActive !== null) {
    search.set("isActive", String(params.isActive));
  }

  const query = search.toString();
  return query ? `?${query}` : "";
}

export function getStockAdjustmentTypes(
  token: string,
  params?: StockAdjustmentTypeQueryParams,
) {
  return apiFetch<StockAdjustmentTypeListApiResponse>(
    `/api/stock-adjustment-types${buildStockAdjustmentTypesQuery(params)}`,
    {
      method: "GET",
      token,
    },
  );
}

export function createStockAdjustmentType(
  token: string,
  body: CreateStockAdjustmentTypeRequest,
) {
  return apiFetch<StockAdjustmentTypeApiResponse>(
    "/api/master-data/stock-adjustment-types",
    {
      method: "POST",
      token,
      body,
    },
  );
}

export function updateStockAdjustmentType(
  token: string,
  id: string,
  body: UpdateStockAdjustmentTypeRequest,
) {
  return apiFetch<StockAdjustmentTypeApiResponse>(
    `/api/master-data/stock-adjustment-types/${id}`,
    {
      method: "PATCH",
      token,
      body,
    },
  );
}

export function deleteStockAdjustmentType(token: string, id: string) {
  return apiFetch<StockAdjustmentTypeApiResponse>(
    `/api/master-data/stock-adjustment-types/${id}`,
    {
      method: "DELETE",
      token,
    },
  );
}
