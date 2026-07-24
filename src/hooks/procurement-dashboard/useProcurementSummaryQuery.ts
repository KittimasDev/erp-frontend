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
) {
  return useQuery({
    queryKey: [
      ...procurementSummaryQueryKey,
      params.dateFrom ?? "",
      params.dateTo ?? "",
    ],
    queryFn: () => getProcurementSummary(getAccessToken(), params),
  });
}
