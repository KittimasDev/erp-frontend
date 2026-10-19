"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import * as api from "@/lib/api/creditor-balances";
import { getAccessToken } from "@/lib/auth/token";
import type { CreditorBalanceQuery } from "@/types/creditor-balances";

export const creditorBalancesKey = ["creditor-balances"] as const;

export function useCreditorBalanceSummaryQuery(params?: CreditorBalanceQuery) {
  return useQuery({
    queryKey: [...creditorBalancesKey, "summary", params ?? {}],
    queryFn: async () => (await api.getCreditorBalanceSummary(getAccessToken(), params)).data,
    placeholderData: keepPreviousData,
  });
}

export function useCreditorBalancesQuery(params?: CreditorBalanceQuery) {
  return useQuery({
    queryKey: [...creditorBalancesKey, "list", params ?? {}],
    queryFn: async () => (await api.getCreditorBalances(getAccessToken(), params)).data,
    placeholderData: keepPreviousData,
  });
}

export function useCreditorBalancePosQuery(creditorId?: string, enabled = false) {
  return useQuery({
    queryKey: [...creditorBalancesKey, "pos", creditorId],
    queryFn: async () =>
      (await api.getCreditorBalancePurchaseOrders(getAccessToken(), creditorId as string)).data,
    enabled: Boolean(creditorId) && enabled,
  });
}
