import { apiFetch } from "./client";
import type {
  CreateSellerBankAccountRequest,
  SellerBankAccountApiResponse,
  SellerBankAccountListApiResponse,
  SellerBankAccountQueryParams,
  UpdateSellerBankAccountRequest,
} from "@/types/seller-bank-accounts";

function buildSellerBankAccountsQuery(
  params?: SellerBankAccountQueryParams,
) {
  if (!params) {
    return "";
  }

  const search = new URLSearchParams();

  if (params.sellerId?.trim()) {
    search.set("sellerId", params.sellerId.trim());
  }

  if (params.bankName?.trim()) {
    search.set("bankName", params.bankName.trim());
  }

  if (params.accountNo?.trim()) {
    search.set("accountNo", params.accountNo.trim());
  }

  if (params.accountName?.trim()) {
    search.set("accountName", params.accountName.trim());
  }

  if (params.isDefault !== undefined && params.isDefault !== null) {
    search.set("isDefault", String(params.isDefault));
  }

  if (params.isActive !== undefined && params.isActive !== null) {
    search.set("isActive", String(params.isActive));
  }

  const query = search.toString();
  return query ? `?${query}` : "";
}

export function getSellerBankAccounts(
  token: string,
  params?: SellerBankAccountQueryParams,
) {
  return apiFetch<SellerBankAccountListApiResponse>(
    `/api/master-data/seller-bank-accounts${buildSellerBankAccountsQuery(params)}`,
    {
      method: "GET",
      token,
    },
  );
}

export function createSellerBankAccount(
  token: string,
  body: CreateSellerBankAccountRequest,
) {
  return apiFetch<SellerBankAccountApiResponse>(
    "/api/master-data/seller-bank-accounts",
    {
      method: "POST",
      token,
      body,
    },
  );
}

export function updateSellerBankAccount(
  token: string,
  id: string,
  body: UpdateSellerBankAccountRequest,
) {
  return apiFetch<SellerBankAccountApiResponse>(
    `/api/master-data/seller-bank-accounts/${id}`,
    {
      method: "PATCH",
      token,
      body,
    },
  );
}

export function deleteSellerBankAccount(token: string, id: string) {
  return apiFetch<SellerBankAccountApiResponse>(
    `/api/master-data/seller-bank-accounts/${id}`,
    {
      method: "DELETE",
      token,
    },
  );
}
