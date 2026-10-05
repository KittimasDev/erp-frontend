"use client";

import { useQuery } from "@tanstack/react-query";

import { getWarehouseDashboardSummary } from "@/lib/api/warehouse-dashboard";
import { getAccessToken, hasAccessToken } from "@/lib/auth/token";

export const warehouseDashboardQueryKey = [
  "inventory",
  "dashboard",
  "summary",
] as const;

export function useWarehouseDashboardSummaryQuery(options?: {
  enabled?: boolean;
  warehouseGroup?: string;
}) {
  return useQuery({
    queryKey: [...warehouseDashboardQueryKey, options?.warehouseGroup ?? "all"],
    queryFn: () =>
      getWarehouseDashboardSummary(getAccessToken(), options?.warehouseGroup),
    enabled: (options?.enabled ?? true) && hasAccessToken(),
    retry: false,
  });
}
