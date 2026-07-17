"use client";

import { useQuery } from "@tanstack/react-query";

import { getWeighbridgeDashboard } from "@/lib/api/weighbridge-tickets";
import { getAccessToken } from "@/lib/auth/token";

export const weighbridgeDashboardQueryKey = [
  "weighbridge",
  "tickets",
  "dashboard",
] as const;

export function useWeighbridgeDashboardQuery(date?: string) {
  return useQuery({
    queryKey: [...weighbridgeDashboardQueryKey, date ?? "today"],
    queryFn: () => getWeighbridgeDashboard(getAccessToken(), date),
  });
}
