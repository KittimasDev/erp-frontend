"use client";

import { useQuery } from "@tanstack/react-query";

import { getWeighbridgeScales } from "@/lib/api/weighbridge-scales";
import { getAccessToken } from "@/lib/auth/token";
import type { WeighbridgeScaleQueryParams } from "@/types/weighbridge-scales";

export const weighbridgeScalesQueryKey = [
  "master-data",
  "weighbridge-scales",
] as const;

export function useWeighbridgeScalesQuery(
  params?: WeighbridgeScaleQueryParams,
) {
  return useQuery({
    queryKey: [...weighbridgeScalesQueryKey, params ?? {}],
    queryFn: () => getWeighbridgeScales(getAccessToken(), params),
  });
}
