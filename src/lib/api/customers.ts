import { apiDownloadBlob, apiFetch, apiUpload } from "./client";
import type { CsvImportApiResponse } from "@/types/csv-import";
import type {
  CreateCustomerRequest,
  CustomerApiResponse,
  CustomerListApiResponse,
  CustomerQueryParams,
  UpdateCustomerRequest,
} from "@/types/customers";

function buildCustomersQuery(params?: CustomerQueryParams) {
  if (!params) {
    return "";
  }

  const search = new URLSearchParams();

  if (params.q?.trim()) {
    search.set("q", params.q.trim());
  }

  if (params.customerType?.trim()) {
    search.set("customerType", params.customerType.trim());
  }

  if (params.isActive !== undefined && params.isActive !== null) {
    search.set("isActive", String(params.isActive));
  }

  const query = search.toString();
  return query ? `?${query}` : "";
}

export function getCustomers(token: string, params?: CustomerQueryParams) {
  return apiFetch<CustomerListApiResponse>(
    `/api/customers${buildCustomersQuery(params)}`,
    {
      method: "GET",
      token,
    },
  );
}

export function getCustomer(token: string, id: string) {
  return apiFetch<CustomerApiResponse>(`/api/customers/${id}`, {
    method: "GET",
    token,
  });
}

export function importCustomersCsv(token: string | null, file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return apiUpload<CsvImportApiResponse>("/api/customers/import-csv", formData, {
    token,
  });
}

/** Excel template นำเข้าลูกค้า — backend สร้างใหม่ทุกครั้งจากประเภทลูกค้าที่รองรับ ณ ตอนนั้น */
export function downloadCustomerImportTemplate(token: string) {
  return apiDownloadBlob("/api/customers/import-template", { token });
}

export function createCustomer(token: string, body: CreateCustomerRequest) {
  return apiFetch<CustomerApiResponse>("/api/customers", {
    method: "POST",
    token,
    body,
  });
}

export function updateCustomer(
  token: string,
  id: string,
  body: UpdateCustomerRequest,
) {
  return apiFetch<CustomerApiResponse>(`/api/customers/${id}`, {
    method: "PATCH",
    token,
    body,
  });
}

export function activateCustomer(token: string, id: string) {
  return apiFetch<CustomerApiResponse>(`/api/customers/${id}/activate`, {
    method: "PATCH",
    token,
  });
}

export function deactivateCustomer(token: string, id: string) {
  return apiFetch<CustomerApiResponse>(`/api/customers/${id}/deactivate`, {
    method: "PATCH",
    token,
  });
}
