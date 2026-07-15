import { apiFetch } from "./client";
import type {
  CreateVendorRequest,
  UpdateVendorRequest,
  VendorApiResponse,
  VendorListApiResponse,
  VendorQueryParams,
} from "@/types/vendors";

function buildVendorsQuery(params?: VendorQueryParams) {
  if (!params) {
    return "";
  }

  const search = new URLSearchParams();

  if (params.name?.trim()) {
    search.set("name", params.name.trim());
  }

  if (params.taxId?.trim()) {
    search.set("taxId", params.taxId.trim());
  }

  if (params.contactName?.trim()) {
    search.set("contactName", params.contactName.trim());
  }

  if (params.contactPhone?.trim()) {
    search.set("contactPhone", params.contactPhone.trim());
  }

  if (
    params.creditDays !== undefined &&
    params.creditDays !== null &&
    !Number.isNaN(params.creditDays)
  ) {
    search.set("creditDays", String(params.creditDays));
  }

  if (params.isActive !== undefined && params.isActive !== null) {
    search.set("isActive", String(params.isActive));
  }

  const query = search.toString();
  return query ? `?${query}` : "";
}

export function getVendors(token: string, params?: VendorQueryParams) {
  return apiFetch<VendorListApiResponse>(
    `/api/master-data/creditors${buildVendorsQuery(params)}`,
    {
      method: "GET",
      token,
    },
  );
}

export function createVendor(token: string, body: CreateVendorRequest) {
  return apiFetch<VendorApiResponse>("/api/master-data/creditors", {
    method: "POST",
    token,
    body,
  });
}

export function updateVendor(
  token: string,
  id: string,
  body: UpdateVendorRequest,
) {
  return apiFetch<VendorApiResponse>(`/api/master-data/creditors/${id}`, {
    method: "PATCH",
    token,
    body,
  });
}

export function deleteVendor(token: string, id: string) {
  return apiFetch<VendorApiResponse>(`/api/master-data/creditors/${id}`, {
    method: "DELETE",
    token,
  });
}
