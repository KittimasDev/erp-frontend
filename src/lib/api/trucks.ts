import { apiFetch } from "./client";
import type {
  CreateTruckRequest,
  TruckApiResponse,
  TruckListApiResponse,
  TruckQueryParams,
  UpdateTruckRequest,
} from "@/types/trucks";

function buildTrucksQuery(params?: TruckQueryParams) {
  if (!params) {
    return "";
  }

  const search = new URLSearchParams();

  if (params.code?.trim()) {
    search.set("code", params.code.trim());
  }

  if (params.licensePlate?.trim()) {
    search.set("licensePlate", params.licensePlate.trim());
  }

  if (params.sellerId?.trim()) {
    search.set("sellerId", params.sellerId.trim());
  }

  if (params.province?.trim()) {
    search.set("province", params.province.trim());
  }

  if (params.truckType?.trim()) {
    search.set("truckType", params.truckType.trim());
  }

  if (params.driverName?.trim()) {
    search.set("driverName", params.driverName.trim());
  }

  if (params.driverPhone?.trim()) {
    search.set("driverPhone", params.driverPhone.trim());
  }

  if (params.isActive !== undefined && params.isActive !== null) {
    search.set("isActive", String(params.isActive));
  }

  const query = search.toString();
  return query ? `?${query}` : "";
}

export function getTrucks(token: string, params?: TruckQueryParams) {
  return apiFetch<TruckListApiResponse>(
    `/api/master-data/trucks${buildTrucksQuery(params)}`,
    {
      method: "GET",
      token,
    },
  );
}

export function createTruck(token: string, body: CreateTruckRequest) {
  return apiFetch<TruckApiResponse>("/api/master-data/trucks", {
    method: "POST",
    token,
    body,
  });
}

export function updateTruck(
  token: string,
  id: string,
  body: UpdateTruckRequest,
) {
  return apiFetch<TruckApiResponse>(`/api/master-data/trucks/${id}`, {
    method: "PATCH",
    token,
    body,
  });
}

export function deleteTruck(token: string, id: string) {
  return apiFetch<TruckApiResponse>(`/api/master-data/trucks/${id}`, {
    method: "DELETE",
    token,
  });
}
