"use client";

import { useQuery } from "@tanstack/react-query";

import { getTireClassifications } from "@/lib/api/tire-classifications";
import { getAccessToken } from "@/lib/auth/token";
import type { TireClassificationQueryParams } from "@/types/tire-classifications";

export const tireClassificationsQueryKey = [
  "master-data",
  "tire-classifications",
] as const;

export function useTireClassificationsQuery(
  params?: TireClassificationQueryParams,
) {
  return useQuery({
    queryKey: [...tireClassificationsQueryKey, params ?? {}],
    queryFn: () => getTireClassifications(getAccessToken(), params),
  });
}
