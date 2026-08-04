"use client";

import { useQuery } from "@tanstack/react-query";

import { getTempCases, type TempCaseQueryParams } from "@/lib/api/temp-cases";
import { getAccessToken } from "@/lib/auth/token";

export const tempCasesQueryKey = ["temp-cases"] as const;

export function useTempCasesQuery(params?: TempCaseQueryParams) {
  return useQuery({
    queryKey: [...tempCasesQueryKey, params ?? {}],
    queryFn: () => getTempCases(getAccessToken(), params),
  });
}
