"use client";

import { useQuery } from "@tanstack/react-query";

import { getSeller } from "@/lib/api/sellers";
import { getAccessToken, hasAccessToken } from "@/lib/auth/token";

export const sellerQueryKey = ["master-data", "sellers"] as const;

export function useSellerQuery(id?: string) {
  return useQuery({
    queryKey: [...sellerQueryKey, id],
    queryFn: () => getSeller(getAccessToken(), id as string),
    enabled: Boolean(id) && hasAccessToken(),
  });
}
