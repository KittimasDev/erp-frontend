"use client";

import { useQuery } from "@tanstack/react-query";

import {
  getChemicalIssue,
  getChemicalIssues,
} from "@/lib/api/chemical-issues";
import { getAccessToken } from "@/lib/auth/token";
import type { ChemicalIssueQueryParams } from "@/types/chemical-issues";

export const chemicalIssuesQueryKey = ["chemical-issues"] as const;

export function useChemicalIssuesQuery(params?: ChemicalIssueQueryParams) {
  return useQuery({
    queryKey: [...chemicalIssuesQueryKey, "list", params ?? {}],
    queryFn: () => getChemicalIssues(getAccessToken(), params),
  });
}

export function useChemicalIssueQuery(id?: string) {
  return useQuery({
    queryKey: [...chemicalIssuesQueryKey, "detail", id],
    queryFn: () => getChemicalIssue(getAccessToken(), id as string),
    enabled: Boolean(id),
  });
}
