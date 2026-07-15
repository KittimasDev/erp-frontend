import { apiFetch } from "./client";
import type {
  CreatePaymentTermRequest,
  PaymentTermApiResponse,
  PaymentTermListApiResponse,
  PaymentTermQueryParams,
  UpdatePaymentTermRequest,
} from "@/types/payment-terms";

function buildPaymentTermsQuery(params?: PaymentTermQueryParams) {
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

export function getPaymentTerms(
  token: string,
  params?: PaymentTermQueryParams,
) {
  return apiFetch<PaymentTermListApiResponse>(
    `/api/master-data/payment-terms${buildPaymentTermsQuery(params)}`,
    {
      method: "GET",
      token,
    },
  );
}

export function createPaymentTerm(
  token: string,
  body: CreatePaymentTermRequest,
) {
  return apiFetch<PaymentTermApiResponse>("/api/master-data/payment-terms", {
    method: "POST",
    token,
    body,
  });
}

export function updatePaymentTerm(
  token: string,
  id: string,
  body: UpdatePaymentTermRequest,
) {
  return apiFetch<PaymentTermApiResponse>(
    `/api/master-data/payment-terms/${id}`,
    {
      method: "PATCH",
      token,
      body,
    },
  );
}

export function deletePaymentTerm(token: string, id: string) {
  return apiFetch<PaymentTermApiResponse>(
    `/api/master-data/payment-terms/${id}`,
    {
      method: "DELETE",
      token,
    },
  );
}
