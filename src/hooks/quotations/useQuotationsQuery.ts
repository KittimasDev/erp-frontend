"use client";

import { useQuery } from "@tanstack/react-query";

import { getQuotation, getQuotations } from "@/lib/api/quotations";
import { getAccessToken } from "@/lib/auth/token";
import type { QuotationQueryParams } from "@/types/quotations";

export const quotationsQueryKey = ["quotations"] as const;

export function useQuotationsQuery(
  params?: QuotationQueryParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [...quotationsQueryKey, "list", params ?? {}],
    queryFn: () => getQuotations(getAccessToken(), params),
    enabled: options?.enabled ?? true,
  });
}

export function useQuotationQuery(id?: string) {
  return useQuery({
    queryKey: [...quotationsQueryKey, "detail", id],
    queryFn: () => getQuotation(getAccessToken(), id as string),
    enabled: Boolean(id),
  });
}
