"use client";

import { useQuery } from "@tanstack/react-query";

import { getProcurementSummary } from "@/lib/api/procurement-dashboard";
import { getAccessToken } from "@/lib/auth/token";
import type { ProcurementSummaryQueryParams } from "@/types/procurement-dashboard";

export const procurementSummaryQueryKey = [
  "procurement",
  "dashboard",
  "summary",
] as const;

export function useProcurementSummaryQuery(
  params: ProcurementSummaryQueryParams = {},
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [
      ...procurementSummaryQueryKey,
      params.dateFrom ?? "",
      params.dateTo ?? "",
    ],
    queryFn: () => getProcurementSummary(getAccessToken(), params),
    enabled: options?.enabled ?? true,
    retry: false,
  });
}
