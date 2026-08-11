"use client";

import { useQuery } from "@tanstack/react-query";

import {
  getLeaveRequests,
  getLeaveSummary,
  getMyLeaveRequests,
} from "@/lib/api/leave";
import { getAccessToken } from "@/lib/auth/token";
import type { LeaveQueryParams, LeaveSummaryParams } from "@/types/leave";

export const myLeaveQueryKey = (limit: number) =>
  ["leave", "me", limit] as const;

export function useMyLeaveRequestsQuery(limit = 30, enabled = true) {
  return useQuery({
    queryKey: myLeaveQueryKey(limit),
    queryFn: () => getMyLeaveRequests(getAccessToken(), limit),
    enabled,
    retry: false,
  });
}

export const leaveRequestsQueryKey = (params: LeaveQueryParams) =>
  ["leave", "list", params] as const;

export function useLeaveRequestsQuery(params: LeaveQueryParams = {}) {
  return useQuery({
    queryKey: leaveRequestsQueryKey(params),
    queryFn: () => getLeaveRequests(getAccessToken(), params),
  });
}

export const leaveSummaryQueryKey = (params: LeaveSummaryParams) =>
  ["leave", "summary", params] as const;

export function useLeaveSummaryQuery(params: LeaveSummaryParams = {}) {
  return useQuery({
    queryKey: leaveSummaryQueryKey(params),
    queryFn: () => getLeaveSummary(getAccessToken(), params),
  });
}
