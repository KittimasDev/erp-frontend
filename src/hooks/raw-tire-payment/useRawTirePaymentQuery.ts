"use client";

import { useQuery } from "@tanstack/react-query";

import { getRawTirePurchasePayment } from "@/lib/api/raw-tire-purchase-receipts";
import { getAccessToken } from "@/lib/auth/token";

export const rawTirePaymentQueryKey = [
  "raw-tire-purchase",
  "receipts",
  "payment",
] as const;

export function useRawTirePaymentQuery(receiptId: string) {
  return useQuery({
    queryKey: [...rawTirePaymentQueryKey, receiptId],
    queryFn: () => getRawTirePurchasePayment(getAccessToken(), receiptId),
    enabled: Boolean(receiptId),
    refetchOnMount: "always",
  });
}
