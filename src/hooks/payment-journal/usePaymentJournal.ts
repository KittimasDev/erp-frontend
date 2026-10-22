"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { getPaymentJournal, getPaymentJournalByDocument } from "@/lib/api/payment-journal";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token";
import type { PaymentJournalQuery } from "@/types/payment-journal";

export const paymentJournalQueryKey = ["payment-journal"] as const;

export function usePaymentJournalQuery(params: PaymentJournalQuery) {
  return useQuery({
    queryKey: [...paymentJournalQueryKey, params],
    queryFn: async () => (await getPaymentJournal(getAccessToken(), params)).data,
    placeholderData: keepPreviousData,
  });
}

/** รายการสมุดรายวันจ่าย 1 ใบ — 403 ไม่ retry */
export function usePaymentJournalByDocQuery(id: string, enabled: boolean) {
  return useQuery({
    queryKey: [...paymentJournalQueryKey, "doc", id],
    queryFn: async () => (await getPaymentJournalByDocument(getAccessToken(), id)).data,
    enabled,
    retry: (count, error) => !(error instanceof ApiError && error.status === 403) && count < 2,
  });
}
