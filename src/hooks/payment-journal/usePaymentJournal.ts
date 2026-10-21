"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { getPaymentJournal } from "@/lib/api/payment-journal";
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
