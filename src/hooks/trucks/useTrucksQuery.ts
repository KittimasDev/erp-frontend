"use client";

import { useQuery } from "@tanstack/react-query";

import { getTrucks } from "@/lib/api/trucks";
import { getAccessToken } from "@/lib/auth/token";
import type { TruckQueryParams } from "@/types/trucks";

export const trucksQueryKey = ["master-data", "trucks"] as const;

export function useTrucksQuery(
  params?: TruckQueryParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [...trucksQueryKey, params ?? {}],
    queryFn: () => getTrucks(getAccessToken(), params),
    enabled: options?.enabled ?? true,
  });
}
