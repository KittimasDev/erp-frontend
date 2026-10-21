"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { getPurchaseJournal, getPurchaseJournalByDocument } from "@/lib/api/purchase-journal";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token";
import type { PurchaseJournalQuery } from "@/types/purchase-journal";

export const purchaseJournalQueryKey = ["purchase-journal"] as const;

export function usePurchaseJournalQuery(params: PurchaseJournalQuery) {
  return useQuery({
    queryKey: [...purchaseJournalQueryKey, params],
    queryFn: async () => (await getPurchaseJournal(getAccessToken(), params)).data,
    placeholderData: keepPreviousData,
  });
}

/** ใบสำคัญบัญชีของ AP 1 ใบ — 403 (ไม่มีสิทธิ์สมุดรายวัน) ไม่ retry เพราะลองซ้ำก็ไม่ผ่าน */
export function usePurchaseJournalByDocQuery(id: string, enabled: boolean) {
  return useQuery({
    queryKey: [...purchaseJournalQueryKey, "doc", id],
    queryFn: async () => (await getPurchaseJournalByDocument(getAccessToken(), id)).data,
    enabled,
    retry: (count, error) => !(error instanceof ApiError && error.status === 403) && count < 2,
  });
}
