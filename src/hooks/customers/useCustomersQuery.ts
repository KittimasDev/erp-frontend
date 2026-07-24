"use client";

import { useQuery } from "@tanstack/react-query";

import { getCustomers } from "@/lib/api/customers";
import { getAccessToken } from "@/lib/auth/token";
import type { CustomerQueryParams } from "@/types/customers";

export const customersQueryKey = ["master-data", "customers"] as const;

export function useCustomersQuery(params?: CustomerQueryParams) {
  return useQuery({
    queryKey: [...customersQueryKey, params ?? {}],
    queryFn: () => getCustomers(getAccessToken(), params),
  });
}
