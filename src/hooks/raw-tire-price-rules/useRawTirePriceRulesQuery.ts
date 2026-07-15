"use client";

import { useQuery } from "@tanstack/react-query";

import { getRawTirePriceRules } from "@/lib/api/raw-tire-price-rules";
import { getAccessToken } from "@/lib/auth/token";
import type { RawTirePriceRuleQueryParams } from "@/types/raw-tire-price-rules";

export const rawTirePriceRulesQueryKey = [
  "master-data",
  "raw-tire-price-rules",
] as const;

export function useRawTirePriceRulesQuery(
  params?: RawTirePriceRuleQueryParams,
) {
  return useQuery({
    queryKey: [...rawTirePriceRulesQueryKey, params ?? {}],
    queryFn: () => getRawTirePriceRules(getAccessToken(), params),
  });
}
