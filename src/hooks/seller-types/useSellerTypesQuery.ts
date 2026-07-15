"use client";

import { useQuery } from "@tanstack/react-query";

import { getSellerTypes } from "@/lib/api/seller-types";
import { getAccessToken } from "@/lib/auth/token";
import type { SellerTypeQueryParams } from "@/types/seller-types";

export const sellerTypesQueryKey = ["master-data", "seller-types"] as const;

export function useSellerTypesQuery(params?: SellerTypeQueryParams) {
  return useQuery({
    queryKey: [...sellerTypesQueryKey, params ?? {}],
    queryFn: () => getSellerTypes(getAccessToken(), params),
  });
}
