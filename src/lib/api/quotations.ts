import { apiFetch } from "./client";
import type {
  CreateQuotationBody,
  QuotationApiResponse,
  QuotationListApiResponse,
  QuotationQueryParams,
  UpdateQuotationBody,
} from "@/types/quotations";

function buildQuotationsQuery(params?: QuotationQueryParams) {
  if (!params) {
    return "";
  }

  const search = new URLSearchParams();

  if (params.quotationNo?.trim()) {
    search.set("quotationNo", params.quotationNo.trim());
  }
  if (params.customerId) {
    search.set("customerId", params.customerId);
  }
  if (params.status?.trim()) {
    search.set("status", params.status.trim());
  }
  if (params.dateFrom) {
    search.set("dateFrom", params.dateFrom);
  }
  if (params.dateTo) {
    search.set("dateTo", params.dateTo);
  }

  const query = search.toString();
  return query ? `?${query}` : "";
}

export function getQuotations(token: string, params?: QuotationQueryParams) {
  return apiFetch<QuotationListApiResponse>(
    `/api/quotations${buildQuotationsQuery(params)}`,
    { method: "GET", token },
  );
}

export function getQuotation(token: string, id: string) {
  return apiFetch<QuotationApiResponse>(`/api/quotations/${id}`, {
    method: "GET",
    token,
  });
}

export function createQuotation(token: string, body: CreateQuotationBody) {
  return apiFetch<QuotationApiResponse>("/api/quotations", {
    method: "POST",
    token,
    body,
  });
}

export function updateQuotation(
  token: string,
  id: string,
  body: UpdateQuotationBody,
) {
  return apiFetch<QuotationApiResponse>(`/api/quotations/${id}`, {
    method: "PATCH",
    token,
    body,
  });
}

export function sendQuotation(token: string, id: string) {
  return apiFetch<QuotationApiResponse>(`/api/quotations/${id}/send`, {
    method: "POST",
    token,
  });
}

export function acceptQuotation(token: string, id: string) {
  return apiFetch<QuotationApiResponse>(`/api/quotations/${id}/accept`, {
    method: "POST",
    token,
  });
}

export function rejectQuotation(token: string, id: string) {
  return apiFetch<QuotationApiResponse>(`/api/quotations/${id}/reject`, {
    method: "POST",
    token,
  });
}

export function cancelQuotation(token: string, id: string) {
  return apiFetch<QuotationApiResponse>(`/api/quotations/${id}/cancel`, {
    method: "POST",
    token,
  });
}
