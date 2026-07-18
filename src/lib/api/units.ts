import { apiFetch } from "./client";
import type {
  CreateUnitRequest,
  UnitApiResponse,
  UnitListApiResponse,
  UpdateUnitRequest,
} from "@/types/units";

export type UnitQueryParams = {
  isActive?: boolean;
};

function buildUnitsQuery(params?: UnitQueryParams) {
  if (!params) {
    return "";
  }

  const search = new URLSearchParams();
  if (params.isActive !== undefined && params.isActive !== null) {
    search.set("isActive", String(params.isActive));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

export function getUnits(token: string, params?: UnitQueryParams) {
  return apiFetch<UnitListApiResponse>(
    `/api/master-data/units${buildUnitsQuery(params)}`,
    {
      method: "GET",
      token,
    },
  );
}

export function createUnit(token: string, body: CreateUnitRequest) {
  return apiFetch<UnitApiResponse>("/api/master-data/units", {
    method: "POST",
    token,
    body,
  });
}

export function updateUnit(
  token: string,
  id: string,
  body: UpdateUnitRequest,
) {
  return apiFetch<UnitApiResponse>(`/api/master-data/units/${id}`, {
    method: "PATCH",
    token,
    body,
  });
}

export function deleteUnit(token: string, id: string) {
  return apiFetch<UnitApiResponse>(`/api/master-data/units/${id}`, {
    method: "DELETE",
    token,
  });
}
