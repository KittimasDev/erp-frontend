import { apiDownloadBlob, apiFetch, apiUpload } from "./client";
import type {
  CompanyBankAccountApiResponse,
  CompanyBankAccountListApiResponse,
  CompanyProfileApiResponse,
  CreateCompanyBankAccountRequest,
  UpdateCompanyBankAccountRequest,
  UpdateCompanyProfileRequest,
} from "@/types/company-profile";

const BASE = "/api/master-data/company-profile";

export function getCompanyProfile(token: string) {
  return apiFetch<CompanyProfileApiResponse>(BASE, {
    method: "GET",
    token,
  });
}

export function updateCompanyProfile(
  token: string,
  body: UpdateCompanyProfileRequest,
) {
  return apiFetch<CompanyProfileApiResponse>(BASE, {
    method: "PATCH",
    token,
    body,
  });
}

/* ---- โลโก้บริษัท ---- */

export function uploadCompanyLogo(token: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return apiUpload<CompanyProfileApiResponse>(`${BASE}/logo`, formData, {
    token,
  });
}

export function deleteCompanyLogo(token: string) {
  return apiFetch<CompanyProfileApiResponse>(`${BASE}/logo`, {
    method: "DELETE",
    token,
  });
}

/** โลโก้ต้องแนบ token จึงโหลดใส่ <img src> ตรง ๆ ไม่ได้ — ดึงเป็น blob แทน */
export function downloadCompanyLogo(token: string) {
  return apiDownloadBlob(`${BASE}/logo`, { token });
}

export function getCompanyBankAccounts(token: string) {
  return apiFetch<CompanyBankAccountListApiResponse>(`${BASE}/bank-accounts`, {
    method: "GET",
    token,
  });
}

export function createCompanyBankAccount(
  token: string,
  body: CreateCompanyBankAccountRequest,
) {
  return apiFetch<CompanyBankAccountApiResponse>(`${BASE}/bank-accounts`, {
    method: "POST",
    token,
    body,
  });
}

export function updateCompanyBankAccount(
  token: string,
  id: string,
  body: UpdateCompanyBankAccountRequest,
) {
  return apiFetch<CompanyBankAccountApiResponse>(
    `${BASE}/bank-accounts/${id}`,
    {
      method: "PATCH",
      token,
      body,
    },
  );
}

export function deleteCompanyBankAccount(token: string, id: string) {
  return apiFetch<CompanyBankAccountApiResponse>(
    `${BASE}/bank-accounts/${id}`,
    {
      method: "DELETE",
      token,
    },
  );
}
