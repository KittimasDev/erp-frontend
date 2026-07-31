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
  all?: boolean;
};

export function useWeighbridgeDashboardQuery(
  params?: WeighbridgeDashboardQueryParams | string,
  options?: { enabled?: boolean },
) {
  const normalized: WeighbridgeDashboardQueryParams | undefined =
    typeof params === "string"
      ? params
        ? { date: params }
        : undefined
      : params;

  const all = Boolean(normalized?.all);
  const from = all ? undefined : normalized?.from?.trim() || undefined;
  const to = all ? undefined : normalized?.to?.trim() || undefined;
  const date =
    all || from || to ? undefined : normalized?.date?.trim() || undefined;

  return useQuery({
    queryKey: [
      ...weighbridgeDashboardQueryKey,
      all ? "all" : "",
      from ?? "",
      to ?? "",
      date ?? "today",
    ],
    queryFn: () =>
      getWeighbridgeDashboard(getAccessToken(), { from, to, date, all }),
    enabled: options?.enabled ?? true,
    retry: false,
  });
}
