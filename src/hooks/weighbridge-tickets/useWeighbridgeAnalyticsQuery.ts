"use client";

import { useQuery } from "@tanstack/react-query";

import { getWeighbridgeAnalytics } from "@/lib/api/weighbridge-tickets";
import { getAccessToken } from "@/lib/auth/token";
import type { WeighbridgeAnalyticsQuery } from "@/types/weighbridge-tickets";

export const weighbridgeAnalyticsQueryKey = [
  "weighbridge",
  "tickets",
  "analytics",
] as const;

export function useWeighbridgeAnalyticsQuery(
  params: WeighbridgeAnalyticsQuery = {},
) {
  return useQuery({
    queryKey: [
      ...weighbridgeAnalyticsQueryKey,
      params.from ?? "",
      params.to ?? "",
      params.date ?? "",
    ],
    queryFn: () => getWeighbridgeAnalytics(getAccessToken(), params),
  });
}
