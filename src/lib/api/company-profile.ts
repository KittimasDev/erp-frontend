import { apiFetch } from "./client";
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
