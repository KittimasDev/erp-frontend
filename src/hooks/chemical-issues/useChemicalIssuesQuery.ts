"use client";

import { useQuery } from "@tanstack/react-query";

import { canAccessBadgeScreen } from "@/hooks/badges/badge-access";
import {
  getChemicalIssue,
  getChemicalIssues,
} from "@/lib/api/chemical-issues";
import {
  pendingCountQueryOptions,
  selectListTotal,
} from "@/lib/query/count-query";
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

/** คิวใบเบิกจ่ายสารเคมีที่รออนุมัติ สำหรับ badge (เมนู / หน้าแรก) */
export const pendingChemicalIssuesCountQueryKey = [
  ...chemicalIssuesQueryKey,
  "pending",
  "count",
] as const;

export function pendingChemicalIssuesCountOptions(ctx?: { enabled?: boolean }) {
  return pendingCountQueryOptions({
    queryKey: pendingChemicalIssuesCountQueryKey,
    queryFn: () =>
      getChemicalIssues(getAccessToken(), {
        status: "DRAFT",
        page: 1,
        limit: 1,
      }),
    select: selectListTotal,
    canAccess: () => canAccessBadgeScreen("CHEMICAL_ISSUES"),
    enabled: ctx?.enabled,
  });
}
