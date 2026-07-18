"use client";

import { useQuery } from "@tanstack/react-query";

import { getUnits, type UnitQueryParams } from "@/lib/api/units";
import { getAccessToken } from "@/lib/auth/token";

export const unitsQueryKey = ["master-data", "units"] as const;

export function useUnitsQuery(params?: UnitQueryParams) {
  return useQuery({
    queryKey: [...unitsQueryKey, params ?? {}],
    queryFn: () => getUnits(getAccessToken(), params),
  });
}
