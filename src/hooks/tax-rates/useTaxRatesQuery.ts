"use client";

import { useQuery } from "@tanstack/react-query";

import { getTaxRates } from "@/lib/api/tax-rates";
import { getAccessToken } from "@/lib/auth/token";
import type { TaxRateQueryParams } from "@/types/tax-rates";

export const taxRatesQueryKey = ["master-data", "tax-rates"] as const;

export function useTaxRatesQuery(params?: TaxRateQueryParams) {
  return useQuery({
    queryKey: [...taxRatesQueryKey, params ?? {}],
    queryFn: () => getTaxRates(getAccessToken(), params),
  });
}
