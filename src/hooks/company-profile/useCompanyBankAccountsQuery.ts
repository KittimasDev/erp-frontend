"use client";

import { useQuery } from "@tanstack/react-query";

import { getCompanyBankAccounts } from "@/lib/api/company-profile";
import { getAccessToken } from "@/lib/auth/token";

export const companyBankAccountsQueryKey = ["master-data", "company-bank-accounts"] as const;

/** บัญชีธนาคารของบริษัท — ใช้เลือกบัญชีที่รับเงินคืนจากผู้ขาย */
export function useCompanyBankAccountsQuery(enabled = true) {
  return useQuery({
    queryKey: companyBankAccountsQueryKey,
    queryFn: async () => (await getCompanyBankAccounts(getAccessToken())).data,
    staleTime: 5 * 60 * 1000,
    enabled,
  });
}
