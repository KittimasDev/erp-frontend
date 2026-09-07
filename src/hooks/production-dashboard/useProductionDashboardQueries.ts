"use client";

import { useQuery } from "@tanstack/react-query";

import {
  getProductionDashboardSummary,
  getProductionDowntimeSummary,
  getProductionStageProgress,
  getProductionWorkInProgress,
} from "@/lib/api/production-dashboard";
import { getAccessToken } from "@/lib/auth/token";
import type {
  ProductionDashboardRangeParams,
  ProductionDashboardSummaryParams,
} from "@/types/production-dashboard";

export const productionDashboardQueryKey = [
  "production",
  "dashboard",
] as const;

export function useProductionDashboardSummaryQuery(
  params: ProductionDashboardSummaryParams = {},
) {
  return useQuery({
    queryKey: [
      ...productionDashboardQueryKey,
      "summary",
      params.from ?? "",
      params.to ?? "",
      params.bucket ?? "DAY",
    ],
    queryFn: () => getProductionDashboardSummary(getAccessToken(), params),
    retry: false,
  });
}

/**
 * กระดานงานสด — poll ทุก 30 วินาที
 *
 * แยก query ออกจากส่วนสรุปโดยตั้งใจ ไม่งั้นการ poll จะลาก aggregate 30 วัน
 * มาคิดใหม่ทุกครึ่งนาทีทั้งที่ตัวเลขนั้นแทบไม่ขยับ
 */
export function useProductionWorkInProgressQuery() {
  return useQuery({
    queryKey: [...productionDashboardQueryKey, "work-in-progress"],
    queryFn: () => getProductionWorkInProgress(getAccessToken()),
    refetchInterval: 30_000,
    retry: false,
  });
}

export function useProductionDowntimeQuery(
  params: ProductionDashboardRangeParams = {},
) {
  return useQuery({
    queryKey: [
      ...productionDashboardQueryKey,
      "downtime",
      params.from ?? "",
      params.to ?? "",
    ],
    queryFn: () => getProductionDowntimeSummary(getAccessToken(), params),
    retry: false,
  });
}

export function useProductionStageProgressQuery(
  params: ProductionDashboardRangeParams = {},
) {
  return useQuery({
    queryKey: [
      ...productionDashboardQueryKey,
      "stage-progress",
      params.from ?? "",
      params.to ?? "",
    ],
    queryFn: () => getProductionStageProgress(getAccessToken(), params),
    retry: false,
  });
}
