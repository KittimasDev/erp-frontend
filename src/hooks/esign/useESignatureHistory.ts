"use client";

import { useQuery } from "@tanstack/react-query";

import { getESignatureHistory } from "@/lib/api/esign";
import { getAccessToken } from "@/lib/auth/token";

export const eSignatureHistoryQueryKey = ["esign-history"] as const;

export function useESignatureHistory(documentId?: string) {
  return useQuery({
    queryKey: [...eSignatureHistoryQueryKey, documentId],
    enabled: Boolean(documentId),
    staleTime: 10_000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const token = getAccessToken();
      if (!token || !documentId) return [];
      const res = await getESignatureHistory(token, documentId);
      return res.data ?? [];
    },
  });
}
