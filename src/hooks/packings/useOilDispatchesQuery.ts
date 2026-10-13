"use client";

import { useQuery } from "@tanstack/react-query";

import { getOilDispatches } from "@/lib/api/oil-dispatches";
import { getAccessToken } from "@/lib/auth/token";

export function useOilDispatchesQuery(enabled: boolean) {
  return useQuery({
    queryKey: ["oil-dispatches", "for-packing"],
    queryFn: () => getOilDispatches(getAccessToken()),
    enabled,
  });
}
