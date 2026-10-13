"use client";

import { useQuery } from "@tanstack/react-query";

import { getSections } from "@/lib/api/sections";
import { getAccessToken } from "@/lib/auth/token";
import type { SectionQueryParams } from "@/types/sections";

export const sectionsQueryKey = ["master-data", "sections"] as const;

export function useSectionsQuery(params?: SectionQueryParams) {
  return useQuery({
    queryKey: [...sectionsQueryKey, params ?? {}],
    queryFn: () => getSections(getAccessToken(), params),
  });
}
