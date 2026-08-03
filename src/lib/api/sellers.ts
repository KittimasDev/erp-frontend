import { apiFetch } from "./client";
import type {
  CreateSellerRequest,
  SellerApiResponse,
  SellerListApiResponse,
  SellerQueryParams,
  UpdateSellerRequest,
} from "@/types/sellers";

function buildSellersQuery(params?: SellerQueryParams) {
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

  if (params.sellerTypeId?.trim()) {
    search.set("sellerTypeId", params.sellerTypeId.trim());
  }

  if (params.taxId?.trim()) {
    search.set("taxId", params.taxId.trim());
  }

  if (params.phone?.trim()) {
    search.set("phone", params.phone.trim());
  }

  if (params.email?.trim()) {
    search.set("email", params.email.trim());
  }

  if (params.contactName?.trim()) {
    search.set("contactName", params.contactName.trim());
  }

  if (params.paymentMethod?.trim()) {
    search.set("paymentMethod", params.paymentMethod.trim());
  }

  if (params.isActive !== undefined && params.isActive !== null) {
    search.set("isActive", String(params.isActive));
  }

  const query = search.toString();
  return query ? `?${query}` : "";
}

export function getSellers(token: string, params?: SellerQueryParams) {
  return apiFetch<SellerListApiResponse>(
    `/api/master-data/sellers${buildSellersQuery(params)}`,
    {
      method: "GET",
      token,
    },
  );
}

export function createSeller(token: string, body: CreateSellerRequest) {
  return apiFetch<SellerApiResponse>("/api/master-data/sellers", {
    method: "POST",
    token,
    body,
  });
}

export function getSeller(token: string, id: string) {
  return apiFetch<SellerApiResponse>(`/api/master-data/sellers/${id}`, {
    method: "GET",
    token,
  });
}

export function updateSeller(
  token: string,
  id: string,
  body: UpdateSellerRequest,
) {
  return apiFetch<SellerApiResponse>(`/api/master-data/sellers/${id}`, {
    method: "PATCH",
    token,
    body,
  });
}

export function deleteSeller(token: string, id: string) {
  return apiFetch<SellerApiResponse>(`/api/master-data/sellers/${id}`, {
    method: "DELETE",
    token,
  });
}
