"use client";

import { useQuery } from "@tanstack/react-query";

import { canAccessBadgeScreen } from "@/hooks/badges/badge-access";
import {
  getLeaveRequests,
  getLeaveSummary,
  getMyLeaveRequests,
} from "@/lib/api/leave";
import { pendingCountQueryOptions } from "@/lib/query/count-query";
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

/** คิวคำขอลางานที่รออนุมัติ สำหรับ badge — อ่านจาก summary เหมือนฝั่ง OT */
export const pendingLeaveApprovalsCountQueryKey = [
  "leave",
  "pending-approvals",
  "count",
] as const;

export function pendingLeaveApprovalsCountOptions(ctx?: { enabled?: boolean }) {
  return pendingCountQueryOptions({
    queryKey: pendingLeaveApprovalsCountQueryKey,
    queryFn: () => getLeaveSummary(getAccessToken(), {}),
    select: (res) => res?.data?.pendingCount ?? 0,
    canAccess: () => canAccessBadgeScreen("HRM_LEAVE"),
    enabled: ctx?.enabled,
  });
}
