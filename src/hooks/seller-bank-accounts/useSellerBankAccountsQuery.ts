"use client";

import { useQuery } from "@tanstack/react-query";

import { getSellerBankAccounts } from "@/lib/api/seller-bank-accounts";
import { getAccessToken } from "@/lib/auth/token";
import type { SellerBankAccountQueryParams } from "@/types/seller-bank-accounts";

export const sellerBankAccountsQueryKey = [
  "master-data",
  "seller-bank-accounts",
] as const;

export function useSellerBankAccountsQuery(
  params?: SellerBankAccountQueryParams,
) {
  return useQuery({
    queryKey: [...sellerBankAccountsQueryKey, params ?? {}],
    queryFn: () => getSellerBankAccounts(getAccessToken(), params),
  });
}
