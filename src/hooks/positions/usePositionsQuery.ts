"use client";

import { useQuery } from "@tanstack/react-query";

import { getPositions } from "@/lib/api/positions";
import { getAccessToken } from "@/lib/auth/token";
import type { PositionQueryParams } from "@/types/positions";

export const positionsQueryKey = ["master-data", "positions"] as const;

export function usePositionsQuery(params?: PositionQueryParams) {
  return useQuery({
    queryKey: [...positionsQueryKey, params ?? {}],
    queryFn: () => getPositions(getAccessToken(), params),
  });
}
