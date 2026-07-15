import { apiFetch } from "./client";
import type {
  CreateUnitRequest,
  UnitApiResponse,
  UnitListApiResponse,
  UpdateUnitRequest,
} from "@/types/units";

export function getUnits(token: string) {
  return apiFetch<UnitListApiResponse>("/api/master-data/units", {
    method: "GET",
    token,
  });
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
