import { apiFetch } from "./client";
import type {
  CreateWeighbridgeScaleRequest,
  UpdateWeighbridgeScaleRequest,
  WeighbridgeScaleApiResponse,
  WeighbridgeScaleListApiResponse,
  WeighbridgeScaleQueryParams,
} from "@/types/weighbridge-scales";

function buildWeighbridgeScalesQuery(params?: WeighbridgeScaleQueryParams) {
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
  if (params.scaleType?.trim()) {
    search.set("scaleType", params.scaleType.trim());
  }
  if (params.locationName?.trim()) {
    search.set("locationName", params.locationName.trim());
  }
  if (params.connectionType?.trim()) {
    search.set("connectionType", params.connectionType.trim());
  }
  if (params.isActive !== undefined && params.isActive !== null) {
    search.set("isActive", String(params.isActive));
  }
  if (
    params.isAutoReadEnabled !== undefined &&
    params.isAutoReadEnabled !== null
  ) {
    search.set("isAutoReadEnabled", String(params.isAutoReadEnabled));
  }

  const query = search.toString();
  return query ? `?${query}` : "";
}

export function getWeighbridgeScales(
  token: string,
  params?: WeighbridgeScaleQueryParams,
) {
  return apiFetch<WeighbridgeScaleListApiResponse>(
    `/api/master-data/weighbridge-scales${buildWeighbridgeScalesQuery(params)}`,
    {
      method: "GET",
      token,
    },
  );
}

export function createWeighbridgeScale(
  token: string,
  body: CreateWeighbridgeScaleRequest,
) {
  return apiFetch<WeighbridgeScaleApiResponse>(
    "/api/master-data/weighbridge-scales",
    {
      method: "POST",
      token,
      body,
    },
  );
}

export function updateWeighbridgeScale(
  token: string,
  id: string,
  body: UpdateWeighbridgeScaleRequest,
) {
  return apiFetch<WeighbridgeScaleApiResponse>(
    `/api/master-data/weighbridge-scales/${id}`,
    {
      method: "PATCH",
      token,
      body,
    },
  );
}

export function deleteWeighbridgeScale(token: string, id: string) {
  return apiFetch<WeighbridgeScaleApiResponse>(
    `/api/master-data/weighbridge-scales/${id}`,
    {
      method: "DELETE",
      token,
    },
  );
}
