"use client";

import { useQuery } from "@tanstack/react-query";

import { getSellers } from "@/lib/api/sellers";
import { getAccessToken } from "@/lib/auth/token";
import type { SellerQueryParams } from "@/types/sellers";

export const sellersQueryKey = ["master-data", "sellers"] as const;

export function useSellersQuery(params?: SellerQueryParams) {
  return useQuery({
    queryKey: [...sellersQueryKey, params ?? {}],
    queryFn: () => getSellers(getAccessToken(), params),
  });
}
