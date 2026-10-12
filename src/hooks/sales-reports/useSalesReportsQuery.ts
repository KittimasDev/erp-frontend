"use client";

import { useQuery } from "@tanstack/react-query";

import { getArAgingReport } from "@/lib/api/sales-reports";
import { getAccessToken } from "@/lib/auth/token";
import type { QueryArAgingReportParams } from "@/types/sales-reports";

export function useArAgingReportQuery(params?: QueryArAgingReportParams) {
  return useQuery({
    queryKey: ["reports", "ar-aging", params ?? {}],
    queryFn: () => getArAgingReport(getAccessToken(), params),
  });
}
