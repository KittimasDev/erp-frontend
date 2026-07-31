"use client";

import { useQuery } from "@tanstack/react-query";

import { getExecutiveSummary } from "@/lib/api/executive-dashboard";
import { getAccessToken, hasAccessToken } from "@/lib/auth/token";

export const executiveSummaryQueryKey = [
  "dashboard",
  "executive",
  "summary",
] as const;

export function useExecutiveSummaryQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: executiveSummaryQueryKey,
    queryFn: () => getExecutiveSummary(getAccessToken()),
    enabled: (options?.enabled ?? true) && hasAccessToken(),
    retry: false,
  });
}
