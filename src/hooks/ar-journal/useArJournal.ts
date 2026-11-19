"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { ApiError } from "@/lib/api/client";
import { getArJournal, getArJournalEntry } from "@/lib/api/ar-journal";
import { getAccessToken } from "@/lib/auth/token";
import type { ArJournalKind, ArJournalQuery } from "@/types/ar-journal";

export const arJournalQueryKey = ["ar-journal"] as const;

export function useArJournalQuery(kind: ArJournalKind, params: ArJournalQuery) {
  return useQuery({
    queryKey: [...arJournalQueryKey, kind, params],
    queryFn: async () => (await getArJournal(getAccessToken(), kind, params)).data,
    placeholderData: keepPreviousData,
  });
}

/** รายการสมุดรายวัน 1 รายการ — 403 ไม่ retry */
export function useArJournalEntryQuery(kind: ArJournalKind, key: string, enabled: boolean) {
  return useQuery({
    queryKey: [...arJournalQueryKey, kind, "entry", key],
    queryFn: async () => (await getArJournalEntry(getAccessToken(), kind, key)).data,
    enabled,
    retry: (count, error) => !(error instanceof ApiError && error.status === 403) && count < 2,
  });
}
