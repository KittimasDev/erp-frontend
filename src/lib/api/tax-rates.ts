import { apiFetch } from "./client";
import type {
  CreateTaxRateRequest,
  TaxRateApiResponse,
  TaxRateListApiResponse,
  TaxRateQueryParams,
  UpdateTaxRateRequest,
} from "@/types/tax-rates";

function buildTaxRatesQuery(params?: TaxRateQueryParams) {
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

  if (
    params.rate !== undefined &&
    params.rate !== null &&
    !Number.isNaN(params.rate)
  ) {
    search.set("rate", String(params.rate));
  }

  if (params.taxType?.trim()) {
    search.set("taxType", params.taxType.trim());
  }

  if (params.isActive !== undefined && params.isActive !== null) {
    search.set("isActive", String(params.isActive));
  }

  const query = search.toString();
  return query ? `?${query}` : "";
}

export function getTaxRates(token: string, params?: TaxRateQueryParams) {
  return apiFetch<TaxRateListApiResponse>(
    `/api/tax-rates${buildTaxRatesQuery(params)}`,
    {
      method: "GET",
      token,
    },
  );
}

export function createTaxRate(token: string, body: CreateTaxRateRequest) {
  return apiFetch<TaxRateApiResponse>("/api/master-data/tax-rates", {
    method: "POST",
    token,
    body,
  });
}

export function updateTaxRate(
  token: string,
  id: string,
  body: UpdateTaxRateRequest,
) {
  return apiFetch<TaxRateApiResponse>(`/api/master-data/tax-rates/${id}`, {
    method: "PATCH",
    token,
    body,
  });
}

export function deleteTaxRate(token: string, id: string) {
  return apiFetch<TaxRateApiResponse>(`/api/master-data/tax-rates/${id}`, {
    method: "DELETE",
    token,
  });
}
