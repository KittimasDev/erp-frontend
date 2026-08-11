"use client";

import { useQuery } from "@tanstack/react-query";

import {
  getMyOvertimeRequests,
  getOvertimeRequests,
  getOvertimeSummary,
} from "@/lib/api/overtime";
import { getAccessToken } from "@/lib/auth/token";
import type {
  OvertimeQueryParams,
  OvertimeSummaryParams,
} from "@/types/overtime";

export const myOvertimeQueryKey = (limit: number) =>
  ["overtime", "me", limit] as const;

export function useMyOvertimeRequestsQuery(limit = 30, enabled = true) {
  return useQuery({
    queryKey: myOvertimeQueryKey(limit),
    queryFn: () => getMyOvertimeRequests(getAccessToken(), limit),
    enabled,
    retry: false,
  });
}

export const overtimeRequestsQueryKey = (params: OvertimeQueryParams) =>
  ["overtime", "list", params] as const;

export function useOvertimeRequestsQuery(params: OvertimeQueryParams = {}) {
  return useQuery({
    queryKey: overtimeRequestsQueryKey(params),
    queryFn: () => getOvertimeRequests(getAccessToken(), params),
  });
}

export const overtimeSummaryQueryKey = (params: OvertimeSummaryParams) =>
  ["overtime", "summary", params] as const;

export function useOvertimeSummaryQuery(params: OvertimeSummaryParams = {}) {
  return useQuery({
    queryKey: overtimeSummaryQueryKey(params),
    queryFn: () => getOvertimeSummary(getAccessToken(), params),
  });
}
