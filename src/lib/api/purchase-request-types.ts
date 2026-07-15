import { apiFetch } from "./client";
import type {
  CreatePurchaseRequestTypeRequest,
  PurchaseRequestTypeApiResponse,
  PurchaseRequestTypeListApiResponse,
  PurchaseRequestTypeQueryParams,
  UpdatePurchaseRequestTypeRequest,
} from "@/types/purchase-request-types";

function buildPurchaseRequestTypesQuery(
  params?: PurchaseRequestTypeQueryParams,
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

export function getPurchaseRequestTypes(
  token: string,
  params?: PurchaseRequestTypeQueryParams,
) {
  return apiFetch<PurchaseRequestTypeListApiResponse>(
    `/api/master-data/purchase-request-types${buildPurchaseRequestTypesQuery(params)}`,
    {
      method: "GET",
      token,
    },
  );
}

export function createPurchaseRequestType(
  token: string,
  body: CreatePurchaseRequestTypeRequest,
) {
  return apiFetch<PurchaseRequestTypeApiResponse>(
    "/api/master-data/purchase-request-types",
    {
      method: "POST",
      token,
      body,
    },
  );
}

export function updatePurchaseRequestType(
  token: string,
  id: string,
  body: UpdatePurchaseRequestTypeRequest,
) {
  return apiFetch<PurchaseRequestTypeApiResponse>(
    `/api/master-data/purchase-request-types/${id}`,
    {
      method: "PATCH",
      token,
      body,
    },
  );
}

export function deletePurchaseRequestType(token: string, id: string) {
  return apiFetch<PurchaseRequestTypeApiResponse>(
    `/api/master-data/purchase-request-types/${id}`,
    {
      method: "DELETE",
      token,
    },
  );
}
