import { apiFetch } from "./client";
import type {
  CreateSellerTypeRequest,
  SellerTypeApiResponse,
  SellerTypeListApiResponse,
  SellerTypeQueryParams,
  UpdateSellerTypeRequest,
} from "@/types/seller-types";

function buildSellerTypesQuery(params?: SellerTypeQueryParams) {
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

export function getSellerTypes(token: string, params?: SellerTypeQueryParams) {
  return apiFetch<SellerTypeListApiResponse>(
    `/api/master-data/seller-types${buildSellerTypesQuery(params)}`,
    {
      method: "GET",
      token,
    },
  );
}

export function createSellerType(token: string, body: CreateSellerTypeRequest) {
  return apiFetch<SellerTypeApiResponse>("/api/master-data/seller-types", {
    method: "POST",
    token,
    body,
  });
}

export function updateSellerType(
  token: string,
  id: string,
  body: UpdateSellerTypeRequest,
) {
  return apiFetch<SellerTypeApiResponse>(
    `/api/master-data/seller-types/${id}`,
    {
      method: "PATCH",
      token,
      body,
    },
  );
}

export function deleteSellerType(token: string, id: string) {
  return apiFetch<SellerTypeApiResponse>(
    `/api/master-data/seller-types/${id}`,
    {
      method: "DELETE",
      token,
    },
  );
}
