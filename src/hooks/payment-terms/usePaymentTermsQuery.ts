"use client";

import { useQuery } from "@tanstack/react-query";

import { getPaymentTerms } from "@/lib/api/payment-terms";
import { getAccessToken } from "@/lib/auth/token";
import type { PaymentTermQueryParams } from "@/types/payment-terms";

export const paymentTermsQueryKey = [
  "master-data",
  "payment-terms",
] as const;

export function usePaymentTermsQuery(params?: PaymentTermQueryParams) {
  return useQuery({
    queryKey: [...paymentTermsQueryKey, params ?? {}],
    queryFn: () => getPaymentTerms(getAccessToken(), params),
  });
}
