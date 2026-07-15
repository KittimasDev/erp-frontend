"use client";

import { useQuery } from "@tanstack/react-query";

import { getUnits } from "@/lib/api/units";
import { getAccessToken } from "@/lib/auth/token";

export const unitsQueryKey = ["master-data", "units"] as const;

export function useUnitsQuery() {
  return useQuery({
    queryKey: unitsQueryKey,
    queryFn: () => getUnits(getAccessToken()),
  });
}
