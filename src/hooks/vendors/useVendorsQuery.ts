"use client";

import { useQuery } from "@tanstack/react-query";

import { getVendors } from "@/lib/api/vendors";
import { getAccessToken } from "@/lib/auth/token";
import type { VendorQueryParams } from "@/types/vendors";

export const vendorsQueryKey = ["master-data", "creditors"] as const;

export function useVendorsQuery(params?: VendorQueryParams) {
  return useQuery({
    queryKey: [...vendorsQueryKey, params ?? {}],
    queryFn: () => getVendors(getAccessToken(), params),
  });
}
