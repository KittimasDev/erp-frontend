"use client";

import { useQuery } from "@tanstack/react-query";

import { getTempCaseCategories } from "@/lib/api/temp-cases";
import { getAccessToken } from "@/lib/auth/token";

export const tempCaseCategoriesQueryKey = [
  "temp-cases",
  "categories",
] as const;

export function useTempCaseCategoriesQuery() {
  return useQuery({
    queryKey: tempCaseCategoriesQueryKey,
    queryFn: () => getTempCaseCategories(getAccessToken()),
  });
}
