"use client";

import { useQuery } from "@tanstack/react-query";

import { getWeighbridgeDashboard } from "@/lib/api/weighbridge-tickets";
import { getAccessToken } from "@/lib/auth/token";

export const weighbridgeDashboardQueryKey = [
  "weighbridge",
  "tickets",
  "dashboard",
] as const;

export type WeighbridgeDashboardQueryParams = {
  date?: string;
  from?: string;
  to?: string;
};

export function useWeighbridgeDashboardQuery(
  params?: WeighbridgeDashboardQueryParams | string,
) {
  const normalized: WeighbridgeDashboardQueryParams | undefined =
    typeof params === "string"
      ? params
        ? { date: params }
        : undefined
      : params;

  const from = normalized?.from?.trim() || undefined;
  const to = normalized?.to?.trim() || undefined;
  const date =
    !from && !to ? normalized?.date?.trim() || undefined : undefined;

  return useQuery({
    queryKey: [
      ...weighbridgeDashboardQueryKey,
      from ?? "",
      to ?? "",
      date ?? "today",
    ],
    queryFn: () =>
      getWeighbridgeDashboard(getAccessToken(), { from, to, date }),
  });
}
