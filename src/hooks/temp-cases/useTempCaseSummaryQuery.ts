"use client";

import { useQuery } from "@tanstack/react-query";

import { getTempCaseSummary } from "@/lib/api/temp-cases";
import { getAccessToken } from "@/lib/auth/token";

export const tempCaseSummaryQueryKey = ["temp-cases", "summary"] as const;

export function useTempCaseSummaryQuery(enabled = true) {
  return useQuery({
    queryKey: tempCaseSummaryQueryKey,
    queryFn: () => getTempCaseSummary(getAccessToken()),
    enabled,
  });
}
