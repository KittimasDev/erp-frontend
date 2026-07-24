"use client";

import { useQuery } from "@tanstack/react-query";

import { getProcurementTracking } from "@/lib/api/procurement-dashboard";
import { getAccessToken } from "@/lib/auth/token";
import type { ProcurementTrackingQueryParams } from "@/types/procurement-dashboard";

export const procurementTrackingQueryKey = [
  "procurement",
  "dashboard",
  "tracking",
] as const;

export function useProcurementTrackingQuery(
  params?: ProcurementTrackingQueryParams,
) {
  return useQuery({
    queryKey: [...procurementTrackingQueryKey, params ?? {}],
    queryFn: () => getProcurementTracking(getAccessToken(), params),
  });
}
