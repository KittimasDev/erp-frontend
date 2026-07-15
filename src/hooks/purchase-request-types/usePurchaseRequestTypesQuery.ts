"use client";

import { useQuery } from "@tanstack/react-query";

import { getPurchaseRequestTypes } from "@/lib/api/purchase-request-types";
import { getAccessToken } from "@/lib/auth/token";
import type { PurchaseRequestTypeQueryParams } from "@/types/purchase-request-types";

export const purchaseRequestTypesQueryKey = [
  "master-data",
  "purchase-request-types",
] as const;

export function usePurchaseRequestTypesQuery(
  params?: PurchaseRequestTypeQueryParams,
) {
  return useQuery({
    queryKey: [...purchaseRequestTypesQueryKey, params ?? {}],
    queryFn: () => getPurchaseRequestTypes(getAccessToken(), params),
  });
}
