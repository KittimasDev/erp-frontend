"use client";

import { useQuery } from "@tanstack/react-query";

import { getRawTirePurchaseReceipt } from "@/lib/api/raw-tire-purchase-receipts";
import { getAccessToken } from "@/lib/auth/token";

export const rawTirePurchaseReceiptQueryKey = [
  "raw-tire-purchase",
  "receipts",
] as const;

export function useRawTirePurchaseReceiptQuery(receiptId: string) {
  return useQuery({
    queryKey: [...rawTirePurchaseReceiptQueryKey, receiptId],
    queryFn: () => getRawTirePurchaseReceipt(getAccessToken(), receiptId),
    enabled: Boolean(receiptId),
  });
}
