"use client";

import { useQuery } from "@tanstack/react-query";

import { getCustomer } from "@/lib/api/customers";
import { getAccessToken } from "@/lib/auth/token";
import { customersQueryKey } from "./useCustomersQuery";

export function useCustomerQuery(id: string | undefined) {
  return useQuery({
    queryKey: [...customersQueryKey, "detail", id],
    queryFn: () => getCustomer(getAccessToken(), id as string),
    enabled: Boolean(id),
  });
}
